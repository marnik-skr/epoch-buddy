import bs58 from "bs58";
import { Buffer } from "buffer";
import { Platform } from "react-native";
import { saveAuthToken } from "./session";

function isLikelyBase58(s: string) {
  // base58 alphabet (no 0 O I l)
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(s);
}

function isLikelyBase64(s: string) {
  // base64 often has + / or = padding (but not always)
  return /^[A-Za-z0-9+/]+={0,2}$/.test(s) && s.length % 4 === 0;
}

function toPubkeyBase58(addr: unknown): string {
  // Uint8Array
  if (addr instanceof Uint8Array) return bs58.encode(addr);

  // ArrayBuffer
  if (addr instanceof ArrayBuffer) return bs58.encode(new Uint8Array(addr));

  // number[]
  if (Array.isArray(addr) && addr.every((n) => typeof n === "number")) {
    return bs58.encode(Uint8Array.from(addr));
  }

  // Buffer-like object: { type: 'Buffer', data: number[] }
  if (addr && typeof addr === "object" && "data" in (addr as any)) {
    const data = (addr as any).data;
    if (Array.isArray(data)) return bs58.encode(Uint8Array.from(data));
  }

  // string: base58 OR base64
  if (typeof addr === "string") {
    if (isLikelyBase58(addr)) return addr;

    // try base64 decode -> base58
    try {
      const bytes = Uint8Array.from(Buffer.from(addr, "base64"));
      return bs58.encode(bytes);
    } catch {
      throw new Error("Wallet returned address as an unknown string format (not base58/base64)");
    }
  }

  throw new Error(`Unsupported address type: ${Object.prototype.toString.call(addr)}`);
}

export async function connectWallet(): Promise<string> {
  if (Platform.OS !== "android") {
    throw new Error("Solana Mobile wallet connect is Android-only (Saga/Seeker).");
  }

  const { transact } = await import("@solana-mobile/mobile-wallet-adapter-protocol");

  return transact(async (wallet) => {
    const auth = await wallet.authorize({
      cluster: "mainnet-beta",
      identity: { name: "Epoch Buddy" },
    });

    await saveAuthToken(auth.auth_token);

    const account = auth.accounts?.[0];
    if (!account) throw new Error("No accounts returned from wallet");

    return toPubkeyBase58(account.address);
  });
}
