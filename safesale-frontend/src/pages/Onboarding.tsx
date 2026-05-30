/**
 * Seller Onboarding — single screen.
 *
 * One primary path: type a handle + shop name, tap "Open my shop". A
 * fresh Nostr keypair is generated **silently** in the browser and
 * persisted to localStorage. The seller never sees the word "Nostr"
 * unless they tap the small "What is Nostr?" link in the footer.
 *
 * This matches the PRD literally:
 *
 *   "Seller visits SafeSale.app on their phone. App **silently
 *    generates a Nostr keypair in the browser**. Seller enters
 *    business name, phone, email, bank account, and saves to create
 *    profile."
 *
 * Existing Nostr users have an escape hatch — a small text link at
 * the bottom of the card opens a dialog with a single styled input
 * for pasting their nsec (with show/hide toggle). NIP-07 extension
 * and NIP-46 remote-signer paths were removed: the first failed
 * confusingly when no extension was installed (~100% of mobile
 * users + most desktop users), the second uses jargon (`bunker://`
 * URIs) that <1% of even Nostr-native users understand. Anyone in
 * that <1% can paste an nsec exported from their other client.
 *
 * Design ported from a Stitch prototype; reworked to use SafeSale's
 * existing color tokens (`bg-surface`, `bg-brand`, `text-ink`),
 * lucide-react icons, and shadcn/ui primitives.
 */

import { useSeoMeta } from "@unhead/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { Check, Eye, EyeOff, Loader2, Lock, X } from "lucide-react";
import { useNostrLogin } from "@nostrify/react/login";
import { useQueryClient } from "@tanstack/react-query";

import { Logo } from "@/components/safesale/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentSeller } from "@/hooks/useCurrentSeller";
import { useLoginActions } from "@/hooks/useLoginActions";
import { useToast } from "@/hooks/useToast";
import { apiClient } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const HANDLE_MIN = 3;
const SHOP_NAME_MIN = 2;
/** Backend `CreateSellerSchema` requires `phone.min(7)`. */
const PHONE_MIN = 7;
/**
 * Backend-required fields not collected in the 30-second signup. The
 * seller is prompted to fill these in from Settings before their first
 * sale ships; until then they're stored as friendly placeholders that
 * pass the backend's Zod schema without polluting the DB with garbage.
 *
 * - `location`: must be 2+ chars. "Nigeria" is a defensible default for the
 *   MVP market and reads sensibly if it surfaces in any UI.
 * - `category`: same constraint. "General" is the catch-all the backend
 *   would otherwise treat as missing.
 */
const DEFAULT_LOCATION = "Nigeria";
const DEFAULT_CATEGORY = "General";

export default function Onboarding() {
  useSeoMeta({ title: "Open your shop — SafeSale" });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-4 antialiased">
      <Link to="/" className="mb-8 inline-block">
        <Logo />
      </Link>

      <OnboardingCard />

      <NostrInfoFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function OnboardingCard() {
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <>
      <main className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-white p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06),0_4px_6px_-4px_rgba(0,0,0,0.05)] sm:p-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Open your shop in 30 seconds.
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Pick a name and a handle. We'll set up everything else.
          </p>
        </header>

        <OpenShopForm />

        <div className="mt-6 border-t border-border/70 pt-5 text-center">
          <button
            type="button"
            onClick={() => setSignInOpen(true)}
            className="rounded px-2 py-1 text-xs font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Already on Nostr? Sign in with your nsec →
          </button>
        </div>
      </main>

      <SignInWithNsecDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                       Open shop — generate a new key                       */
/* -------------------------------------------------------------------------- */

function OpenShopForm() {
  const [handle, setHandle] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Key backup dialog state
  const [showKeyBackup, setShowKeyBackup] = useState(false);
  const [generatedNsec, setGeneratedNsec] = useState("");
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const loginActions = useLoginActions();
  const { logins, removeLogin } = useNostrLogin();
  const [, setCurrentSeller] = useCurrentSeller();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleValid = isHandleValid(handle);
  const shopNameValid = shopName.trim().length >= SHOP_NAME_MIN;
  const phoneValid = isPhoneValid(phone);
  const canSubmit = handleValid && shopNameValid && phoneValid && !isCreating;

  const submit = async () => {
    if (!canSubmit) return;
    setIsCreating(true);
    try {
      const sk = generateSecretKey();
      const nsec = nip19.nsecEncode(sk);
      const npub = nip19.npubEncode(getPublicKey(sk));

      // Register with the backend FIRST. If the handle is taken or any
      // other validation fails, we want to surface that before logging
      // the user into a key they can't actually use as a seller.
      const { seller } = await apiClient.createSeller({
        npub,
        handle: handle.trim().toLowerCase(),
        name: shopName.trim(),
        phone: phone.trim(),
        location: DEFAULT_LOCATION,
        category: DEFAULT_CATEGORY,
      });

      // CRITICAL: clear every previously-stored session before persisting
      // the new one. Without this, opening a second shop on the same
      // browser ended up with `useCurrentUser()` returning the OLD login
      // (because Nostrify keeps logins as an array and yields users[0]),
      // while `useCurrentSeller()` returned the NEW seller record — so
      // the dashboard's sidebar showed the new shop name while the
      // listings query (`useMyListings`, which filters by `authors:
      // [pubkey]`) ran against the OLD key and surfaced the old shop's
      // products. Genuine trust bug: two real sellers on one device
      // could see each other's data.
      //
      // Order matters:
      //   1. Drop every existing Nostrify login (they're the ghost of
      //      the previous account).
      //   2. Drop the previous SafeSale seller record from localStorage.
      //   3. Flush TanStack caches keyed on pubkey/npub (my-listings,
      //      seller-orders) so the dashboard doesn't render stale data
      //      from the old account while the new query is in flight.
      //   4. ONLY THEN call addLogin + setCurrentSeller for the new one.
      for (const existing of logins) {
        removeLogin(existing.id);
      }
      setCurrentSeller(null);
      queryClient.removeQueries({ queryKey: ["safesale", "my-listings"] });
      queryClient.removeQueries({ queryKey: ["safesale", "seller-orders"] });

      // Now persist the login + seller record together. The nsec ends
      // up in localStorage via Nostrify's `addLogin` action.
      loginActions.nsec(nsec);
      setCurrentSeller({
        id: seller.id,
        npub: seller.npub,
        handle: seller.handle,
        name: seller.name,
        createdAt: seller.createdAt,
      });

      // Show the key backup dialog BEFORE navigating to /app.
      // The user must see their nsec at least once.
      setGeneratedNsec(nsec);
      setShowKeyBackup(true);
      setIsCreating(false);
    } catch (err) {
      setIsCreating(false);
      toast({
        title: "Couldn't create your shop",
        description: friendlySellerError(err),
        variant: "destructive",
      });
    }
  };

  const copyNsec = async () => {
    try {
      await navigator.clipboard.writeText(generatedNsec);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 3000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = generatedNsec;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 3000);
    }
  };

  return (
    <div className="space-y-5">
      <HandleField
        value={handle}
        onChange={setHandle}
        showValidation={handle.length > 0}
        valid={handleValid}
      />

      <ShopNameField value={shopName} onChange={setShopName} />

      <PhoneField value={phone} onChange={setPhone} />

      <Disclosure>
        We'll generate a Nostr key and store it securely in this browser.
        You can export it any time.
      </Disclosure>

      <Button
        type="button"
        size="lg"
        className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
        disabled={!canSubmit}
        onClick={submit}
      >
        {isCreating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          "Create my shop"
        )}
      </Button>

      {/* ---- Key Backup Dialog ---- */}
      <Dialog open={showKeyBackup} onOpenChange={() => { /* prevent close by clicking outside */ }}>
        <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-brand" />
              Save your secret key
            </DialogTitle>
            <DialogDescription>
              This is the <strong>only way</strong> to log back into your shop if you
              clear your browser data or switch devices. Copy it and store it somewhere
              safe — we can never recover it for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Label className="text-xs font-semibold text-amber-900">Your nsec (private key)</Label>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 overflow-hidden break-all rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-ink select-all">
                  {keyRevealed ? generatedNsec : generatedNsec.substring(0, 12) + "••••••••••••••••••••••"}
                </code>
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setKeyRevealed(!keyRevealed)}
                >
                  {keyRevealed ? <><EyeOff className="mr-1.5 h-3 w-3" /> Hide</> : <><Eye className="mr-1.5 h-3 w-3" /> Reveal</>}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs ${keyCopied ? "border-green-300 bg-green-50 text-green-800" : ""}`}
                  onClick={copyNsec}
                >
                  {keyCopied ? <><Check className="mr-1.5 h-3 w-3" /> Copied!</> : "Copy key"}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <strong>⚠️ Warning:</strong> If you lose this key, you lose access to your shop forever.
              SafeSale cannot reset or recover it — that's how Nostr privacy works.
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => {
                setShowKeyBackup(false);
                toast({
                  title: "Shop created",
                  description: keyCopied
                    ? "Key copied ✓ — you're all set!"
                    : "Make sure you saved your key from the sidebar later!",
                });
                navigate("/app");
              }}
            >
              {keyCopied ? "I've saved my key — continue" : "Continue to my shop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                     Existing-user escape hatch — paste nsec                */
/* -------------------------------------------------------------------------- */

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Single-purpose dialog: paste your existing nsec, validate it, log in,
 * then collect a handle + shop name (same fields as the creation path)
 * and land on /app.
 *
 * Why we only support nsec paste here (no extension, no bunker):
 * see the file-level docstring. tl;dr: extension + NIP-46 both fail
 * confusingly for nearly all SafeSale users; nsec paste works on
 * every device for the small minority who actually have a key.
 */
function SignInWithNsecDialog({ open, onOpenChange }: SignInDialogProps) {
  const [stage, setStage] = useState<"paste" | "details">("paste");

  const [nsecInput, setNsecInput] = useState("");
  const [reveal, setReveal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [handle, setHandle] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [opening, setOpening] = useState(false);

  /**
   * Captured at sign-in so we can register the seller on the backend
   * AFTER they pick a handle, without re-decoding the nsec a second
   * time. Cleared on reset alongside everything else.
   */
  const [signedInNpub, setSignedInNpub] = useState<string | null>(null);

  const loginActions = useLoginActions();
  const { logins, removeLogin } = useNostrLogin();
  const [, setCurrentSeller] = useCurrentSeller();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reset = () => {
    setStage("paste");
    setNsecInput("");
    setReveal(false);
    setConnecting(false);
    setError(null);
    setHandle("");
    setShopName("");
    setPhone("");
    setOpening(false);
    setSignedInNpub(null);
  };

  const onChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const trimmed = nsecInput.trim();
  // Loose validity check used to enable the button — full validation
  // happens on submit where we actually decode.
  const looksLikeNsec = trimmed.startsWith("nsec1") && trimmed.length >= 60;

  const handleSignIn = async () => {
    if (!looksLikeNsec || connecting) return;
    setError(null);
    setConnecting(true);
    try {
      // Validate by decoding — this throws on bad input rather than
      // silently logging in to a garbage state.
      const decoded = nip19.decode(trimmed);
      if (decoded.type !== "nsec") {
        throw new Error("That key isn't a private key (nsec).");
      }
      // Derive the npub up-front so we can hand it to createSeller in
      // the next stage without storing the raw secret in React state.
      const npub = nip19.npubEncode(getPublicKey(decoded.data));

      // Clear every previous session before swapping in this one — same
      // multi-account contamination guard as OpenShopForm above.
      for (const existing of logins) {
        removeLogin(existing.id);
      }
      setCurrentSeller(null);
      queryClient.removeQueries({ queryKey: ["safesale", "my-listings"] });
      queryClient.removeQueries({ queryKey: ["safesale", "seller-orders"] });

      loginActions.nsec(trimmed);
      setSignedInNpub(npub);
      setStage("details");
      // Clear the raw key from React state once the login action has
      // taken it — minimises the window it's in memory.
      setNsecInput("");
    } catch (err) {
      setError(
        err instanceof Error
          ? friendlifyNsecError(err.message)
          : "That doesn't look like a valid nsec. Double-check and try again.",
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleOpenShop = async () => {
    if (
      !isHandleValid(handle) ||
      shopName.trim().length < SHOP_NAME_MIN ||
      !isPhoneValid(phone) ||
      !signedInNpub
    ) {
      return;
    }
    setOpening(true);
    try {
      const { seller } = await apiClient.createSeller({
        npub: signedInNpub,
        handle: handle.trim().toLowerCase(),
        name: shopName.trim(),
        phone: phone.trim(),
        location: DEFAULT_LOCATION,
        category: DEFAULT_CATEGORY,
      });
      setCurrentSeller({
        id: seller.id,
        npub: seller.npub,
        handle: seller.handle,
        name: seller.name,
        createdAt: seller.createdAt,
      });
      // TODO: publish kind 0 profile metadata under the connected key.
      toast({ title: "Welcome back", description: `Signed in as @${seller.handle}.` });
      onOpenChange(false);
      reset();
      navigate("/app");
    } catch (err) {
      toast({
        title: "Couldn't open your shop",
        description: friendlySellerError(err),
        variant: "destructive",
      });
    } finally {
      setOpening(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {stage === "paste" ? "Sign in with your nsec" : "Set up your shop"}
          </DialogTitle>
          <DialogDescription>
            {stage === "paste"
              ? "Paste the private key (nsec) from your other Nostr app. It stays in this browser — we never send it anywhere."
              : "Pick a handle and a name for your SafeSale shop."}
          </DialogDescription>
        </DialogHeader>

        {stage === "paste" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="nsec-input">Your nsec</Label>
              <div className="relative mt-1.5">
                <Input
                  id="nsec-input"
                  type={reveal ? "text" : "password"}
                  value={nsecInput}
                  onChange={(e) => {
                    setNsecInput(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSignIn();
                    }
                  }}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="nsec1..."
                  className={cn(
                    "pr-10 font-mono text-sm tracking-tight",
                    error && "border-rose-400 focus-visible:ring-rose-200",
                  )}
                  aria-invalid={!!error}
                  aria-describedby={error ? "nsec-error" : undefined}
                />
                <button
                  type="button"
                  aria-label={reveal ? "Hide nsec" : "Show nsec"}
                  onClick={() => setReveal((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {reveal ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {error && (
                <p id="nsec-error" className="mt-2 text-xs font-medium text-rose-700">
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-surface/60 p-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <p className="text-xs leading-relaxed text-ink-soft">
                Your nsec stays in this browser's local storage. SafeSale
                never sees it, never sends it anywhere, and never asks you
                to confirm it by email.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => onChange(false)}
                disabled={connecting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSignIn}
                disabled={!looksLikeNsec || connecting}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10">
                <Check className="h-4 w-4 text-brand" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink">
                  Signed in with your existing key
                </p>
                <p className="truncate text-sm text-ink-soft">
                  Pick a SafeSale handle to finish.
                </p>
              </div>
            </div>

            <HandleField
              value={handle}
              onChange={setHandle}
              showValidation={handle.length > 0}
              valid={isHandleValid(handle)}
            />

            <ShopNameField value={shopName} onChange={setShopName} />

            <PhoneField value={phone} onChange={setPhone} />

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => onChange(false)}
                disabled={opening}
              >
                Cancel
              </Button>
              <Button
                onClick={handleOpenShop}
                disabled={
                  !isHandleValid(handle) ||
                  shopName.trim().length < SHOP_NAME_MIN ||
                  !isPhoneValid(phone) ||
                  opening
                }
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {opening ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  "Open my shop"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Soften the cryptic decode errors `nostr-tools` throws into something
 * a non-Nostr user can act on. The library raises things like
 * "Invalid character" / "Invalid checksum" — accurate but unhelpful.
 */
function friendlifyNsecError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("checksum")) {
    return "This nsec looks tampered with or mistyped — the security check failed.";
  }
  if (lower.includes("invalid") || lower.includes("decode")) {
    return "That doesn't look like a valid nsec. It should start with \"nsec1\" and be about 63 characters.";
  }
  return raw;
}

/* -------------------------------------------------------------------------- */
/*                              Shared fields                                 */
/* -------------------------------------------------------------------------- */

function HandleField({
  value,
  onChange,
  showValidation,
  valid,
}: {
  value: string;
  onChange: (next: string) => void;
  showValidation: boolean;
  valid: boolean;
}) {
  return (
    <div>
      <Label htmlFor="handle">Shop handle</Label>
      <div className="relative mt-1.5 flex items-center">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 text-sm text-ink-soft"
        >
          @
        </span>
        <Input
          id="handle"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={value}
          onChange={(e) =>
            // Allow the same alphabet the backend accepts: lowercase
            // alnum + `.`, `-`, `_`. The validator still gates the
            // start/end-with-alnum rule.
            onChange(e.target.value.replace(/[^a-z0-9._-]/gi, "").toLowerCase())
          }
          placeholder="yourshop"
          className="pl-7 pr-10"
        />
        {showValidation && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute right-3 transition-opacity",
              valid ? "text-brand" : "text-rose-500",
            )}
          >
            {valid ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}

function ShopNameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <Label htmlFor="shop-name">Shop name</Label>
      <Input
        id="shop-name"
        className="mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Amaka's Boutique"
      />
    </div>
  );
}

function PhoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <Label htmlFor="shop-phone">Phone number</Label>
      <Input
        id="shop-phone"
        type="tel"
        autoComplete="tel"
        className="mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="+234 800 000 0000"
        inputMode="tel"
      />
      <p className="mt-1.5 text-[11px] text-ink-soft">
        Buyers see this on the order page so they can reach you about delivery.
      </p>
    </div>
  );
}

function Disclosure({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-surface/60 p-3">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      <p className="text-xs leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            "What is Nostr?" link                           */
/* -------------------------------------------------------------------------- */

function NostrInfoFooter() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-6 text-center">
        <button
          type="button"
          className="rounded px-2 py-1 text-xs text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={() => setOpen(true)}
        >
          What is Nostr? →
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>About Nostr</DialogTitle>
            <DialogDescription>
              Nostr is an open protocol for decentralised, censorship-resistant
              communication and commerce. Instead of relying on a central
              server, your identity is a cryptographic key that you own.
              That key is what owns your SafeSale shop.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setOpen(false)}>Got it</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function isHandleValid(handle: string): boolean {
  const cleaned = handle.trim();
  // Mirror the backend's Zod regex: lowercase alnum + dot/dash/underscore,
  // must start and end with alnum, 3–24 chars. The frontend Input filter
  // already strips uppercase + symbols other than `_`, but a stricter
  // gate here keeps backend validation errors out of the happy path.
  return (
    cleaned.length >= HANDLE_MIN &&
    cleaned.length <= 24 &&
    /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(cleaned)
  );
}

/**
 * Match the backend's Zod constraint `phone.min(7).max(20)` while
 * forgiving common formatting characters (spaces, dashes, parens, +).
 * We don't normalize — the backend stores whatever the user types so
 * buyers see it the way the seller wrote it.
 */
function isPhoneValid(phone: string): boolean {
  const cleaned = phone.trim();
  // Strip formatting to count digits but leave the leading + intact.
  const digits = cleaned.replace(/[^\d]/g, "");
  return cleaned.length >= PHONE_MIN && cleaned.length <= 20 && digits.length >= 7;
}

/**
 * Convert the backend / network error into something a seller can
 * actually act on. Special-cases the most common failures:
 *
 *   - 409 Conflict on a duplicate handle → "Handle is taken"
 *   - BACKEND_UNREACHABLE → network framing instead of stack trace
 */
function friendlySellerError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "BACKEND_UNREACHABLE") {
      return "We couldn't reach SafeSale right now. Check your connection and try again.";
    }
    // The backend throws Conflict with messages like
    // `Handle "@amaka" is already taken` — surface verbatim, it's user-friendly.
    return err.message;
  }
  return err instanceof Error ? err.message : "Please try again.";
}
