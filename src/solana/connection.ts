import { Connection } from "@solana/web3.js";
export const rpcUrl = "https://api.mainnet-beta.solana.com";
let _conn: Connection | null = null;
export function getConnection() {
  if (!_conn) {
    _conn = new Connection(rpcUrl, {
      commitment: "confirmed",
      disableRetryOnRateLimit: true,
      confirmTransactionInitialTimeout: 60_000,
    });
  }
  return _conn;
}