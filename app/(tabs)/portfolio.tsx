import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Linking,
} from "react-native";
import { loadPubkey } from "../../src/solana/session";
import { shortAddress } from "../../src/ui/walletUi";
import { fetchSolBalanceLamports } from "../../src/portfolio/solBalance";
import { fetchNativeStakedSol } from "../../src/portfolio/nativeStake";
import { fetchSkrPosition } from "../../src/portfolio/skrPosition";

const SKR_STAKE_URL = "https://stake.solanamobile.com";

export default function PortfolioScreen() {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // SOL
  const [sol, setSol] = useState<number | null>(null);
  const [stakedSol, setStakedSol] = useState<number | null>(null);

  // SKR
  const [skr, setSkr] = useState<number | null>(null);
  const [skrStaked, setSkrStaked] = useState<number | null>(null);
  const [skrRewards, setSkrRewards] = useState<number | null>(null);

  const [err, setErr] = useState<string | null>(null);

  // prevent overlapping calls
  const inFlightRef = useRef(false);
  // cooldown to reduce 429s on public RPC
  const lastFetchMsRef = useRef(0);
  const COOLDOWN_MS = 6_000;

  const refresh = useCallback(async (force = false) => {
    if (inFlightRef.current) return;
    const now = Date.now();
    if (!force && now - lastFetchMsRef.current < COOLDOWN_MS) return;

    inFlightRef.current = true;
    lastFetchMsRef.current = now;

    try {
      setRefreshing(true);
      setErr(null);

      const k = await loadPubkey();
      setPubkey(k);
      if (!k) return;

      const [solLamports, stakedLamports, skrPos] = await Promise.all([
        fetchSolBalanceLamports(k),
        fetchNativeStakedSol(k),
        fetchSkrPosition(k),
      ]);

      setSol(solLamports / 1e9);
      setStakedSol(stakedLamports / 1e9);

      setSkr(skrPos.balance);
      setSkrStaked(skrPos.staked);
      setSkrRewards(skrPos.rewardsEarned);

    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.includes("429") || msg.toLowerCase().includes("too many requests")) {
        setErr("RPC rate limited (429). Pull to refresh in a few seconds.");
      } else {
        setErr(msg);
      }
    } finally {
      setRefreshing(false);
      setReady(true);
      inFlightRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh(false);
    }, [refresh])
  );

  const openSkrStake = useCallback(async () => {
    try {
      await Linking.openURL(SKR_STAKE_URL);
    } catch {
      setErr("Couldn't open SKR staking site.");
    }
  }, []);

  if (!ready) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title">Portfolio</ThemedText>
        <ThemedText style={styles.muted}>Loading…</ThemedText>
      </ScrollView>
    );
  }

  if (!pubkey) return <Redirect href="/welcome" />;

  // --- Insights (derived, free, no extra APIs) ---
  const solBalance = sol ?? 0;
  const solStaked = stakedSol ?? 0;
  const totalSol = solBalance + solStaked;

  const stakedPct = totalSol > 0 ? solStaked / totalSol : 0;

  // Estimates only (keep it clearly labeled)
  const DEFAULT_SOL_APY = 0.07; // 7% est
  const EPOCH_DAYS_EST = 2; // ~2 days; varies
  const epochsPerYearEst = 365 / EPOCH_DAYS_EST;
  const estSolPerEpoch = solStaked * (DEFAULT_SOL_APY / epochsPerYearEst);

  const showIdleWarning = solBalance >= 0.01;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} />
      }
    >
      <ThemedText type="title">Portfolio</ThemedText>
      <ThemedText style={styles.muted}>Wallet: {shortAddress(pubkey)}</ThemedText>

      {err ? (
        <ThemedText style={[styles.muted, { color: "#ff8a8a" }]}>{err}</ThemedText>
      ) : null}

      {/* Insights */}
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Insights</ThemedText>

        <View style={styles.row}>
          <ThemedText style={styles.muted}>Staked %</ThemedText>
          <ThemedText style={styles.value}>
            {totalSol > 0 ? `${(stakedPct * 100).toFixed(0)}%` : "—"}
          </ThemedText>
        </View>

        <View style={styles.row}>
          <ThemedText style={styles.muted}>Est. SOL / epoch</ThemedText>
          <ThemedText style={styles.value}>
            {stakedSol == null ? "…" : `${estSolPerEpoch.toFixed(6)} SOL`}
          </ThemedText>
        </View>

        {showIdleWarning ? (
          <ThemedText style={[styles.muted, { color: "#ffd28a" }]}>
            ⚠️ You have {solBalance.toFixed(4)} SOL idle (unstaked).
          </ThemedText>
        ) : (
          <ThemedText style={styles.muted}>✅ Little/no idle SOL</ThemedText>
        )}

        <ThemedText style={styles.muted}>
          Estimates only (APY & epoch length vary).
        </ThemedText>
      </ThemedView>

      {/* SOL card */}
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">SOL</ThemedText>

        <View style={styles.row}>
          <ThemedText style={styles.muted}>Balance</ThemedText>
          <ThemedText style={styles.value}>
            {sol == null ? "…" : `${sol.toFixed(4)} SOL`}
          </ThemedText>
        </View>

        <View style={styles.row}>
          <ThemedText style={styles.muted}>Staked</ThemedText>
          <ThemedText style={styles.value}>
            {stakedSol == null ? "…" : `${stakedSol.toFixed(4)} SOL`}
          </ThemedText>
        </View>

        <View style={styles.row}>
          <ThemedText style={styles.muted}>Rewards</ThemedText>
          <ThemedText style={[styles.value, styles.muted]}>Coming soon</ThemedText>
        </View>
      </ThemedView>

      {/* SKR card */}
      <ThemedView style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="subtitle">SKR</ThemedText>
          <Pressable onPress={openSkrStake} style={styles.linkBtn} hitSlop={10}>
            <ThemedText style={styles.linkText}>Open staking</ThemedText>
          </Pressable>
        </View>

        <View style={styles.row}>
          <ThemedText style={styles.muted}>Balance</ThemedText>
          <ThemedText style={styles.value}>
            {skr == null ? "…" : `${skr.toLocaleString()} SKR`}
          </ThemedText>
        </View>

        <View style={styles.row}>
          <ThemedText style={styles.muted}>Staked</ThemedText>
          <ThemedText style={styles.value}>
            {skrStaked == null ? (
              <ThemedText style={styles.muted}>Coming soon</ThemedText>
            ) : (
              `${skrStaked.toLocaleString()} SKR`
            )}
          </ThemedText>
        </View>

        <View style={styles.row}>
          <ThemedText style={styles.muted}>Rewards earned</ThemedText>
          <ThemedText style={styles.value}>
            {skrRewards == null ? (
              <ThemedText style={styles.muted}>Coming soon</ThemedText>
            ) : (
              `+ ${skrRewards.toLocaleString()} SKR`
            )}
          </ThemedText>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 70, gap: 12 },
  card: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  linkBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  linkText: {
    fontSize: 12,
    opacity: 0.9,
    fontFamily: "monospace",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  value: { fontFamily: "monospace", fontSize: 16 },
  muted: { opacity: 0.7 },
});
