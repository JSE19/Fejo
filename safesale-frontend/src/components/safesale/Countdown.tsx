import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface Props {
  targetIso: string;
  className?: string;
  prefix?: string;
}

export function Countdown({ targetIso, className, prefix }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <span className={cn("inline-flex items-center gap-1.5 tabular-nums", className)}>
      <Clock className="h-3.5 w-3.5" />
      {prefix && <span>{prefix}</span>}
      <span className="font-medium">{formatCountdown(targetIso, now)}</span>
    </span>
  );
}
