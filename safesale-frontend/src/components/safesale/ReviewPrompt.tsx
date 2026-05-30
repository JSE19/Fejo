import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/safesale/Avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Sparkles, Star } from "lucide-react";

interface Props {
  /** Whose review this is. */
  viewer: "buyer" | "seller";
  /** The other party being reviewed. */
  counterpartyName: string;
  counterpartyAvatarSeed: string;
  /** Optional product or order context shown above the form. */
  productLabel?: string;
  className?: string;
  /** When already submitted, render the thank-you state instead of the form. */
  alreadySubmitted?: boolean;
}

/**
 * Post-completion review prompt.
 *
 * Shown to the buyer right after they release payment, and to the seller as
 * soon as their order moves into "completed". The spec calls for both
 * sides to publish reviews as signed Nostr events — UI side, this is what
 * collects them.
 */
export function ReviewPrompt({
  viewer,
  counterpartyName,
  counterpartyAvatarSeed,
  productLabel,
  className,
  alreadySubmitted,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(alreadySubmitted ?? false);

  if (submitted) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-emerald-200/60 bg-brand-soft/40 p-5 text-center",
          className
        )}
      >
        <Sparkles className="mx-auto h-6 w-6 text-brand" />
        <p className="mt-2 text-sm font-medium text-ink">
          Thank you — your review is published.
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          It's part of {counterpartyName.split(" ")[0]}'s public reputation now.
        </p>
      </div>
    );
  }

  const headline =
    viewer === "buyer"
      ? `How was your experience with ${counterpartyName.split(" ")[0]}?`
      : `How smooth was this sale with ${counterpartyName.split(" ")[0]}?`;
  const sub =
    viewer === "buyer"
      ? "Honest reviews protect every future buyer."
      : "Sellers earn trust by being rated too — your buyer feedback matters.";

  const placeholder =
    viewer === "buyer"
      ? "Was the item as described? Did it arrive on time? Was the seller easy to talk to?"
      : "Did the buyer pay quickly? Were they easy to coordinate with?";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-brand-soft via-white to-white p-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar
          seed={counterpartyAvatarSeed}
          name={counterpartyName}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{headline}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>
          {productLabel && (
            <p className="mt-1 text-[11px] text-ink-soft">{productLabel}</p>
          )}
        </div>
      </div>

      {/* Star picker */}
      <div className="mt-5 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hover || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="rounded-md p-1 transition-transform hover:scale-110"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "h-7 w-7",
                  filled ? "text-amber-500" : "text-amber-200"
                )}
                fill="currentColor"
                strokeWidth={0}
              />
            </button>
          );
        })}
        {rating > 0 && (
          <span className="ml-2 text-xs font-medium text-ink-soft">
            {ratingLabel(rating)}
          </span>
        )}
      </div>

      <div className="mt-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="min-h-[88px]"
        />
        <p className="mt-1.5 text-[11px] text-ink-soft">
          Your review will appear on{" "}
          {viewer === "buyer"
            ? `${counterpartyName.split(" ")[0]}'s public seller profile`
            : "this order's public record"}
          . Cryptographically signed — can't be faked.
        </p>
      </div>

      <Button
        onClick={() => setSubmitted(true)}
        disabled={rating === 0}
        size="lg"
        className="mt-4 h-11 w-full rounded-lg bg-brand text-base font-semibold text-brand-foreground hover:bg-brand/90"
      >
        <CheckCircle2 className="mr-2 h-4 w-4" /> Publish review
      </Button>
    </section>
  );
}

function ratingLabel(n: number) {
  return (["Bad", "Not great", "Okay", "Good", "Great"] as const)[n - 1];
}
