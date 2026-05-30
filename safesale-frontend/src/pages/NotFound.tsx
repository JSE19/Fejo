import { useSeoMeta } from "@unhead/react";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Logo } from "@/components/safesale/Logo";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useSeoMeta({
    title: "Page not found — SafeSale",
    description: "We couldn't find that page on SafeSale.",
  });

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-6 py-12">
      <div className="max-w-md text-center">
        <Logo />
        <p className="mt-8 text-sm font-medium uppercase tracking-wider text-brand">
          404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          We couldn't find that page.
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          The link might be old or mistyped. Let's get you back to safety.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/app">Open dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
