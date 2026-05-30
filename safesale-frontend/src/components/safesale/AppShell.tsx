import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { nip19 } from "nostr-tools";
import { useNostrLogin } from "@nostrify/react/login";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "./Logo";
import { Avatar } from "./Avatar";
import {
  Home,
  Package,
  Receipt,
  Wallet,
  Bell,
  Search,
  Scale,
  Settings,
  Key,
  Copy,
  Eye,
  EyeOff,
  LogOut,
  Check,
} from "lucide-react";

import { useCurrentSeller } from "@/hooks/useCurrentSeller";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSellerOrders } from "@/hooks/useSellerOrders";
import { genUserName } from "@/lib/genUserName";

/** Convert pubkey hex → npub, null on bad input. */
function safeNpub(pubkeyHex: string): string | null {
  try {
    return nip19.npubEncode(pubkeyHex);
  } catch {
    return null;
  }
}

interface Props {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

// Mobile bottom-nav.
const mobileTabs = [
  { to: "/app", icon: Home, label: "Home", end: true },
  { to: "/app/listings", icon: Package, label: "Listings" },
  { to: "/app/orders", icon: Receipt, label: "Orders" },
  { to: "/app/earnings", icon: Wallet, label: "Earnings" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
];

function buildSidebarGroups(activeDisputes: number) {
  return [
    {
      label: "Manage",
      items: [
        { to: "/app", icon: Home, label: "Home", end: true, badge: undefined as string | undefined },
        { to: "/app/listings", icon: Package, label: "Listings", end: false, badge: undefined },
        { to: "/app/orders", icon: Receipt, label: "Orders", end: false, badge: undefined },
        { to: "/app/earnings", icon: Wallet, label: "Earnings", end: false, badge: undefined },
      ],
    },
    {
      label: "Support",
      items: [
        {
          to: "/app/dispute",
          icon: Scale,
          label: "Disputes",
          end: false,
          badge: activeDisputes > 0 ? String(activeDisputes) : undefined,
        },
      ],
    },
    {
      label: "Account",
      items: [
        { to: "/app/settings", icon: Settings, label: "Settings", end: false, badge: undefined },
      ],
    },
  ];
}

export function AppShell({ children, title, subtitle, action }: Props) {
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showKeyBackup, setShowKeyBackup] = useState(false);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logins, removeLogin } = useNostrLogin();

  // Real signed-in identity. `seller` is the SafeSale profile from
  // `useCurrentSeller` (set by Onboarding after POST /api/sellers).
  // `user` is the underlying Nostr login from `useCurrentUser`.
  // Fall back to a friendly "Sign in" prompt when neither exists.
  const [seller] = useCurrentSeller();
  const { user, metadata } = useCurrentUser();

  // Sidebar / mobile avatar + name + handle, in that priority order:
  //   1. The SafeSale seller record (post-onboarding) — but ONLY when
  //      its stored npub matches the active Nostr login's pubkey. A
  //      stale `currentSeller` left over from a previous session would
  //      otherwise paint the wrong name in the sidebar.
  //   2. Nostr kind-0 metadata (logged in via NIP-07/nsec/bunker but
  //      hasn't completed SafeSale signup yet)
  //   3. A generic placeholder so the shell still renders for guests
  const userNpub = user?.pubkey ? safeNpub(user.pubkey) : null;
  const trustedSeller = seller && seller.npub === userNpub ? seller : null;
  const sellerNpub = trustedSeller?.npub;
  const displayName = trustedSeller?.name ?? metadata?.name ?? metadata?.display_name ??
    (user?.pubkey ? genUserName(user.pubkey) : "Guest");
  const displayHandle = trustedSeller?.handle ?? metadata?.nip05?.split("@")[0] ?? null;
  const avatarSeed = sellerNpub ?? user?.pubkey ?? "guest";

  // Extract the nsec from the current login for key backup/export.
  // Nostrify stores the login as { type: 'nsec', nsec: 'nsec1...' }
  const currentLogin = logins[0] as { type: string; nsec?: string } | undefined;
  const storedNsec = currentLogin?.type === 'nsec' ? currentLogin.nsec ?? null : null;

  const copyNsec = useCallback(async () => {
    if (!storedNsec) return;
    try {
      await navigator.clipboard.writeText(storedNsec);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = storedNsec;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  }, [storedNsec]);
  // Live dispute count off the real seller-orders feed. When the seller
  // isn't signed in, returns 0 — hook is `enabled: !!npub` internally.
  const { orders } = useSellerOrders();
  const activeDisputes = orders.filter((o) => o.status === "disputed").length;
  const sidebarGroups = buildSidebarGroups(activeDisputes);

  const activeTab = mobileTabs.find((t) =>
    t.end ? pathname === t.to : pathname.startsWith(t.to)
  );

  return (
    <div className="min-h-screen bg-surface text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border bg-background lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-border px-5">
          {/* Logo always returns to the marketing landing page —
              the standard SaaS convention. The sidebar's 'Home' nav
              item below is the dashboard home; the brand-mark up here
              is the marketing home. Two different "homes," same as
              Stripe / Shopify / Linear. */}
          <Link to="/" aria-label="SafeSale home">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sidebarGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                {group.label}
              </p>
              {group.items.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    cn(
                      "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                         ? "bg-brand-soft text-brand-soft-foreground"
                         : "text-ink-soft hover:bg-secondary hover:text-ink"
                    )
                  }
                >
                  <t.icon className="h-4 w-4" />
                  <span className="flex-1">{t.label}</span>
                  {t.badge && (
                    <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                      {t.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => { setShowKeyBackup(!showKeyBackup); setKeyRevealed(false); }}
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary"
          >
            <Avatar seed={avatarSeed} name={displayName} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{displayName}</p>
              {displayHandle ? (
                <p className="truncate text-xs text-ink-soft">@{displayHandle}</p>
              ) : !user ? (
                <Link to="/onboarding" className="text-xs text-brand hover:underline">
                  Start selling
                </Link>
              ) : null}
            </div>
          </button>

          {/* Key backup panel — slides open when clicked */}
          {showKeyBackup && storedNsec && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-900">
                <Key className="h-3.5 w-3.5" />
                Your secret key (nsec)
              </div>
              <p className="mt-1 text-[10px] text-amber-800">
                Save this somewhere safe. It's the ONLY way to recover your shop on a new device.
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <code className="flex-1 overflow-hidden rounded-md border border-amber-200 bg-white px-2 py-1.5 font-mono text-[10px] text-ink select-all">
                  {keyRevealed
                    ? storedNsec
                    : storedNsec.substring(0, 10) + "••••••••••••••••"}
                </code>
                <button
                  type="button"
                  onClick={() => setKeyRevealed(!keyRevealed)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-white text-amber-800 hover:bg-amber-100"
                  aria-label={keyRevealed ? "Hide key" : "Reveal key"}
                >
                  {keyRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={copyNsec}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-white text-amber-800 hover:bg-amber-100"
                  aria-label="Copy key"
                >
                  {keyCopied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          )}

          {/* Logout */}
          {user && (
            <button
              type="button"
              onClick={() => {
                if (logins[0]) removeLogin(logins[0].id);
                navigate("/onboarding");
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink-soft transition-colors hover:bg-secondary hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          )}
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 lg:h-16 lg:px-8">
            <Link to="/" className="lg:hidden" aria-label="SafeSale home">
              <LogoMark />
            </Link>
            <div className="flex-1 min-w-0">
              {title && (
                <p className="truncate text-base font-semibold text-ink lg:text-lg">
                  {title}
                </p>
              )}
              {subtitle && (
                <p className="truncate text-xs text-ink-soft lg:text-sm">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              className="hidden h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-secondary hover:text-ink md:inline-flex"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifsOpen(!notifsOpen);
                  if (!notifsOpen) setHasUnread(false);
                }}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-secondary hover:text-ink"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {hasUnread && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />
                )}
              </button>

              {notifsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setNotifsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 z-20 w-80 overflow-hidden rounded-2xl border border-border bg-white shadow-xl animate-in fade-in zoom-in duration-200">
                    <div className="border-b border-border p-4">
                      <p className="text-sm font-semibold text-ink">Notifications</p>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto p-6 text-center">
                      <p className="text-sm text-ink-soft">
                        You're all caught up.
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        New order pings will appear here.
                      </p>
                    </div>
                    <Link to="/app/orders" className="block p-3 text-center text-xs font-medium text-brand hover:bg-brand-soft/40">
                      View all orders
                    </Link>
                  </div>
                </>
              )}
            </div>
            <div className="lg:hidden">
              <Avatar seed={avatarSeed} name={displayName} size={32} />
            </div>
          </div>
          {action && (
            <div className="border-t border-border/60 px-4 py-2 lg:px-8">{action}</div>
          )}
        </header>

        <main className="px-4 pb-28 pt-4 lg:px-8 lg:pb-12 lg:pt-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 pb-safe backdrop-blur-md lg:hidden">
        <ul className="grid grid-cols-5">
          {mobileTabs.map((t) => {
            const isActive = t === activeTab;
            return (
              <li key={t.to}>
                <NavLink
                  to={t.to}
                  end={t.end}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-medium",
                    isActive ? "text-brand" : "text-ink-soft"
                  )}
                >
                  <t.icon className={cn("h-5 w-5", isActive && "text-brand")} />
                  {t.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
