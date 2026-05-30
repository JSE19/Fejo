import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

/**
 * `MediatorGate` — wraps `/admin` so only the mediator nsec holder
 * can see the admin / dispute resolution UI.
 *
 * Trust model: SafeSale's mediator surface should never be reachable
 * by the public. In Joy's backend STATE.md the mediator key for MVP
 * equals the brand key (single npub). The frontend trusts whatever
 * npub is configured at build time via `VITE_MEDIATOR_NPUB`.
 *
 * Three render branches:
 *
 *   1. Not logged in              → "Access restricted" + sign-in CTA
 *   2. Logged in, wrong npub      → "Access restricted" + back to home
 *   3. Logged in, mediator npub   → renders the wrapped children
 *
 * Misconfiguration (env var unset or invalid) is treated as case (2):
 * we deny rather than open. Safer for a hackathon submission than a
 * leaky default.
 */
export function MediatorGate({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();
  const mediatorNpub = import.meta.env.VITE_MEDIATOR_NPUB?.trim();
  const expectedHex = decodeMediatorPubkey(mediatorNpub);

  if (!expectedHex) {
    // Env var unset or malformed. Treat as "no mediator yet" — deny
    // everyone rather than open the door. Logged for the operator.
    if (import.meta.env.DEV) {
      console.warn(
        "[MediatorGate] VITE_MEDIATOR_NPUB is not set or invalid; /admin denied to all.",
      );
    }
    return <AccessDenied reason="not-configured" />;
  }

  if (!user) {
    return <AccessDenied reason="signed-out" />;
  }

  if (user.pubkey !== expectedHex) {
    return <AccessDenied reason="wrong-account" />;
  }

  return <>{children}</>;
}

/** Decode an `npub1...` env-var value into a hex pubkey, or null. */
function decodeMediatorPubkey(npub: string | undefined): string | null {
  if (!npub) return null;
  try {
    const decoded = nip19.decode(npub);
    return decoded.type === "npub" ? decoded.data : null;
  } catch {
    return null;
  }
}

function AccessDenied({
  reason,
}: {
  reason: "signed-out" | "wrong-account" | "not-configured";
}) {
  const heading =
    reason === "signed-out" ? "Mediator access only" : "Access restricted";
  const body =
    reason === "signed-out"
      ? "This area is restricted to SafeSale mediators. Sign in with the mediator key to continue."
      : reason === "wrong-account"
        ? "Your account doesn't have mediator permissions. If you're on the mediation team, switch to the mediator key."
        : "The mediator account isn't configured for this environment. Contact your administrator.";

  return (
    <div className="min-h-screen bg-surface px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-soft">
          <Lock className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-ink">{heading}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">{body}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
        <p className="mt-6 text-[11px] text-ink-soft">
          Public surface — buyers and sellers don't need this page.
        </p>
      </div>
    </div>
  );
}
