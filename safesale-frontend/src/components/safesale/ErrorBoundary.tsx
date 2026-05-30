/**
 * `ErrorBoundary` — global catch-all for uncaught React render errors.
 *
 * Wraps `<AppRouter />` in `App.tsx`. If any page-level component throws
 * during render or commit, the user sees a friendly recovery screen
 * instead of a stuck loader, blank white page, or React's dev overlay.
 *
 * The motivating scenario for the 4-day hackathon sprint: judges'
 * laptop on the demo Wi-Fi, our Railway backend hiccups for 200ms,
 * a TanStack Query refetch fires while a component is rendering and
 * trips an assertion somewhere. Without a boundary, that's a stuck
 * skeleton on stage. With this boundary, it's "Something went wrong"
 * + a Reload button. Cheap insurance.
 *
 * Notes / non-features:
 *
 *   - This does NOT catch async errors inside event handlers /
 *     useEffect — those have to be handled with try/catch + toast,
 *     which the codebase already does for mutations.
 *   - This does NOT report to any analytics endpoint. The PRD says no
 *     telemetry; sentry-style reporting is post-MVP.
 *   - In development mode we render the actual error message so we
 *     can see what blew up. In production it's hidden behind a
 *     details/summary disclosure so judges don't see a stack trace.
 *
 * React 19 has its own root-level `onUncaughtError` hook but it's
 * less ergonomic than a classic error-boundary class component for
 * showing JSX recovery UI, so we stick with the class component.
 */

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";

interface State {
  error: Error | null;
}

interface Props {
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    // Surface to the dev console so we can see what blew up locally.
    // No analytics shipping per the PRD; we'd add a fetch() to a
    // logging endpoint here once we have one.
    console.error("[ErrorBoundary] caught", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.error) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div className="min-h-screen bg-surface px-4 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-ink">
            Something went wrong
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            The page hit an unexpected error. Reloading usually fixes it.
            If it keeps happening, the backend may be reachable but slow —
            try again in a moment.
          </p>

          <div className="mt-6 flex justify-center gap-2">
            <Button
              type="button"
              onClick={this.handleReload}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <RotateCw className="mr-2 h-4 w-4" aria-hidden /> Reload
            </Button>
          </div>

          {isDev && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-xs font-medium text-ink-soft hover:text-ink">
                Developer detail (dev mode only)
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-surface p-3 text-[11px] leading-snug text-ink-soft">
                {this.state.error.name}: {this.state.error.message}
                {this.state.error.stack ? `\n${this.state.error.stack}` : ""}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
