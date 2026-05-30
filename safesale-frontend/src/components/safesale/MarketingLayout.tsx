import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { nip19 } from "nostr-tools";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import AuthDialog from "@/components/auth/AuthDialog";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCurrentSeller } from "@/hooks/useCurrentSeller";
import { genUserName } from "@/lib/genUserName";

interface Props {
  children: React.ReactNode;
}

/**
 * Public marketing layout — wraps Landing (and the deferred how-it-works
 * and for-sellers marketing pages). The header is session-aware:
 *
 *   - logged out          → "Sign in" + "Start selling" CTAs
 *   - logged in + seller  → avatar + "Go to dashboard"
 *   - logged in + no seller → avatar + "Finish setup"
 *
 * "Mediator" is intentionally NOT in the public nav. The mediator
 * surface lives behind the `/admin` route, which is itself gated to a
 * single hardcoded mediator npub (see AppRouter / MediatorGate). Public
 * users have no reason to see admin links — it leaks an unprofessional
 * impression at exactly the wrong moment of a hackathon demo and, in
 * production, it's a real exposure of internal tooling.
 */
const PUBLIC_LINKS = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/for-sellers", label: "For sellers" },
] as const;

export function MarketingLayout({ children }: Props) {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { pathname } = useLocation();

  const { user, metadata } = useCurrentUser();
  const [seller] = useCurrentSeller();

  // Treat the user as a confirmed seller only when both their Nostr
  // login and the SafeSale seller record agree on the same npub. A
  // stale `currentSeller` from a previous session pointing at a
  // different key gets ignored — same defensive check we use in
  // AppShell and the gated routes.
  const userNpub = user?.pubkey
    ? safeNpub(user.pubkey)
    : null;
  const isSeller = !!user && !!seller && seller.npub === userNpub;

  const displayName =
    seller?.name ??
    metadata?.name ??
    metadata?.display_name ??
    (user ? genUserName(user.pubkey) : null);

  const dashboardCta = isSeller
    ? { to: "/app", label: "Go to dashboard" }
    : { to: "/onboarding", label: "Finish setup" };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center" onClick={() => setOpen(false)}>
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {PUBLIC_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-secondary hover:text-ink",
                  pathname === l.to && "text-ink",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <Link
                  to={dashboardCta.to}
                  className="inline-flex h-9 items-center gap-2 rounded-md pl-1 pr-3 text-sm font-medium text-ink hover:bg-secondary"
                  aria-label={`${dashboardCta.label} — signed in as ${displayName ?? "you"}`}
                >
                  <Avatar
                    seed={user.pubkey}
                    name={displayName ?? "Guest"}
                    size={28}
                  />
                  <span className="hidden lg:inline">{dashboardCta.label}</span>
                </Link>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAuthOpen(true)}
                  className="text-sm font-medium text-ink-soft hover:text-ink"
                >
                  Sign in
                </Button>
                <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                  <Link to="/onboarding">Start selling</Link>
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border/60 bg-background md:hidden">
            <div className="container flex flex-col gap-1 py-3">
              {PUBLIC_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="rounded-md px-2 py-2 text-base font-medium text-ink"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                {user ? (
                  <Button
                    asChild
                    size="sm"
                    className="col-span-2 bg-brand text-brand-foreground hover:bg-brand/90"
                  >
                    <Link to={dashboardCta.to} onClick={() => setOpen(false)}>
                      {dashboardCta.label}
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOpen(false);
                        setAuthOpen(true);
                      }}
                    >
                      Sign in
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className="bg-brand text-brand-foreground hover:bg-brand/90"
                    >
                      <Link to="/onboarding" onClick={() => setOpen(false)}>
                        Start selling
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
      <main>{children}</main>
      <SiteFooter />
      <AuthDialog isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

/**
 * Convert a hex pubkey to its bech32 npub, returning null if the input
 * isn't a real hex string. Used to compare against the stored seller
 * record's npub (same defensive check as AppShell + gated routes).
 */
function safeNpub(pubkeyHex: string): string | null {
  try {
    return nip19.npubEncode(pubkeyHex);
  } catch {
    return null;
  }
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface-2/40">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-ink-soft">
              Trustless escrow for social-commerce sellers. Built for Africa.
            </p>
          </div>
          <FooterCol
            title="Product"
            items={[
              { to: "/how-it-works", label: "How it works" },
              { to: "/for-sellers", label: "For sellers" },
              { to: "/onboarding", label: "Start selling" },
              { to: "/app", label: "Seller dashboard" },
            ]}
          />
          <FooterCol
            title="Trust"
            items={[
              { to: "/how-it-works#protection", label: "Buyer protection" },
              { to: "/how-it-works#dispute", label: "Dispute process" },
              { to: "/how-it-works#fees", label: "Fees" },
            ]}
          />
          <FooterCol
            title="Company"
            items={[
              { to: "/", label: "About" },
              { to: "/", label: "Careers" },
              { to: "/", label: "Press" },
              { to: "/", label: "Contact" },
            ]}
          />
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-ink-soft sm:flex-row sm:items-center">
          <p>© 2026 SafeSale. Made with care in Lagos.</p>
          <p>Built for Hack4Freedom.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { to: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.label}>
            <Link to={i.to} className="text-ink hover:text-brand">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
