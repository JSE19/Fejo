import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("hex string must be even-length");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

export interface BuyerKey {
  nsec: string;
  npub: string;
  createdAt: string;
}

const KEY_PREFIX = "safesale:buyer:";

function storageKey(orderToken: string): string {
  return `${KEY_PREFIX}${orderToken}`;
}

export function generateBuyerKey(orderToken: string): BuyerKey {
  const secretBytes = generateSecretKey();
  const pubkeyHex = getPublicKey(secretBytes);
  const nsec = nip19.nsecEncode(secretBytes);
  const npub = nip19.npubEncode(pubkeyHex);
  const entry: BuyerKey = {
    nsec,
    npub,
    createdAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(storageKey(orderToken), JSON.stringify(entry));
  } catch {
  }
  return entry;
}

export function persistBuyerKey(orderToken: string, key: Pick<BuyerKey, "nsec" | "npub">): void {
  const entry: BuyerKey = {
    nsec: key.nsec,
    npub: key.npub,
    createdAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(storageKey(orderToken), JSON.stringify(entry));
  } catch {
  }
}

export function getBuyerKey(orderToken: string): BuyerKey | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(storageKey(orderToken));
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as BuyerKey).nsec === "string" &&
      typeof (parsed as BuyerKey).npub === "string"
    ) {
      return parsed as BuyerKey;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearBuyerKey(orderToken: string): void {
  try {
    localStorage.removeItem(storageKey(orderToken));
  } catch {
  }
}

export function hexToSecretKey(hex: string): Uint8Array {
  return hexToBytes(hex);
}
