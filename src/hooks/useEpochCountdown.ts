import { useEffect, useMemo, useState } from "react";
import { Connection } from "@solana/web3.js";
import { EpochStatus, fetchEpochStatus } from "../solana/epoch";

export function useEpochCountdown(
  rpcUrl = "https://api.mainnet-beta.solana.com"
) {
  const conn = useMemo(() => new Connection(rpcUrl, "confirmed"), [rpcUrl]);

  const [status, setStatus] = useState<EpochStatus | null>(null);
  const [eta, setEta] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // ✅ this must exist
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number>(0);

  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      try {
        setError(null);
        const s = await fetchEpochStatus(conn);
        if (!alive) return;

        setStatus(s);
        setEta(s.etaSeconds);

        // ✅ reset counter each successful refresh
        setSecondsSinceUpdate(0);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? String(e));
        setStatus(null);
      }
    };

    refresh();
    const poll = setInterval(refresh, 30_000);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, [conn]);

  useEffect(() => {
    if (!status) return;
    const t = setInterval(() => {
      setEta((v) => Math.max(0, v - 1));
      setSecondsSinceUpdate((v) => v + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [status]);

  // ✅ this must be returned
  return { status, eta, error, secondsSinceUpdate };
}
