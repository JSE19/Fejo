import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize a URL from an untrusted source (Nostr event tag, user input,
 * etc.) before using it as an `href`, `src`, iframe `src`, or CSS
 * `url()`. Returns `null` for anything that isn't safe to render.
 *
 * Allowlist: `https:` only. Everything else (http, javascript:, data:,
 * blob:, file:, vbscript:, schemeless inputs, malformed URLs) is
 * rejected. See `.agents/skills/nostr-security/SKILL.md` for the full
 * threat model — nsec keys live in localStorage and a single XSS
 * permanently compromises every Nostr client the user has ever used.
 */
export function sanitizeUrl(input: unknown): string | null {
  if (typeof input !== "string" || input.length === 0) return null;
  try {
    const u = new URL(input);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
