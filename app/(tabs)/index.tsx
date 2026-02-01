import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, View, Modal } from "react-native";

import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { disconnectWallet } from "../../src/solana/disconnectWallet";
import { clearPubkey, loadPubkey, savePubkey } from "../../src/solana/session";
import { shortAddress } from "../../src/ui/walletUi";

import { useEpochCountdown } from "../../src/hooks/useEpochCountdown";
import { formatHMS } from "../../src/solana/epoch";

import { ScrollView, RefreshControl } from "react-native";

import { connectWallet } from "../../src/solana/connectWallet";

export default function HomeScreen() {
  const router = useRouter();
  const [showEpochInfo, setShowEpochInfo] = useState(false);

  const [copied, setCopied] = useState(false);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const { status, eta, error, secondsSinceUpdate, refresh: refreshEpoch } = useEpochCountdown();

  const progress =
    status && status.slotsInEpoch > 0 ? status.slotIndex / status.slotsInEpoch : 0;

  const progressPct = Math.max(0, Math.min(1, progress));
  const progressLabel = `${(progressPct * 100).toFixed(1)}%`;

  const [refreshing, setRefreshing] = useState(false);

  const refreshAll = useCallback(async () => {
    try {
      setRefreshing(true);

      // refresh wallet pubkey
      const k = await loadPubkey();
      setPubkey(k);

      // refresh epoch
      await refreshEpoch?.();

      await Haptics.selectionAsync();
    } finally {
      setRefreshing(false);
    }
  }, []);


  // “Next epoch at ~HH:MM” (local time)
  const nextEpochAt = new Date(Date.now() + eta * 1000).toLocaleTimeString(
    undefined,
    { hour: "2-digit", minute: "2-digit" }
  );


  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        const k = await loadPubkey();
        if (!alive) return;
        setPubkey(k);
        setReady(true);
      })();

      return () => {
        alive = false;
      };
    }, [])
  );

  if (!ready) return null;
  if (!pubkey) return <Redirect href="/welcome" />;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshAll} />
      }
    >
      <ThemedText type="title">Epoch</ThemedText>

      {/* Wallet */}
      <ThemedText type="subtitle">Connected wallet</ThemedText>

      <Pressable
        onPress={async () => {
          await Clipboard.setStringAsync(pubkey);
          await Haptics.selectionAsync();
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        style={styles.addrWrap}
      >
        <ThemedText style={styles.addrText}>{shortAddress(pubkey)}</ThemedText>
        <ThemedText style={styles.addrHint}>
          {copied ? "Copied ✅" : "Tap to copy"}
        </ThemedText>
      </Pressable>

      <ThemedText style={styles.chip}>Connected</ThemedText>

      {/* Epoch countdown */}
      <ThemedView style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="subtitle">Epoch status</ThemedText>

          <Pressable
            onPress={() => setShowEpochInfo(true)}
            hitSlop={10}
            style={styles.infoBtn}
          >
            <ThemedText style={styles.infoBtnText}>i</ThemedText>
          </Pressable>
        </View>

        {status ? (
          <>
            <ThemedText style={styles.bigTimer}>{formatHMS(eta)}</ThemedText>

            {/* small trust label */}
            <ThemedText style={styles.updatedText}>
              Updated {secondsSinceUpdate}s ago • Next epoch ~{nextEpochAt}
            </ThemedText>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progressPct * 100)}%` },
                ]}
              />
            </View>

            {/* progress % */}
            <ThemedText style={styles.muted}>
              {progressLabel} • Epoch {status.epoch} • Slot {status.slotIndex} / {status.slotsInEpoch}
            </ThemedText>

            <ThemedText style={styles.muted}>
              ~{status.secsPerSlot.toFixed(3)}s/slot
            </ThemedText>
          </>
        ) : error ? (
          <ThemedText style={[styles.muted, { color: "#ff8a8a" }]}>
            RPC error: {error}
          </ThemedText>
        ) : (
          <ThemedText style={styles.muted}>Loading epoch…</ThemedText>
        )}
      </ThemedView>

      {/* Epoch info modal */}
      <Modal
        visible={showEpochInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEpochInfo(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEpochInfo(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="title">What’s an epoch?</ThemedText>

            <ThemedText style={styles.modalText}>
              A Solana epoch is a time window made of many slots. During an epoch,
              validators earn rewards and the network tracks performance.
            </ThemedText>

            <ThemedText style={styles.modalText}>
              • The big timer is an estimate for when the next epoch starts.
            </ThemedText>
            <ThemedText style={styles.modalText}>
              • The bar shows how far we are through the current epoch (by slot count).
            </ThemedText>

            <Pressable
              onPress={() => setShowEpochInfo(false)}
              style={styles.modalClose}
            >
              <ThemedText type="defaultSemiBold">Got it</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>


      {/* Disconnect */}
      <Pressable
        style={styles.disconnect}
        onPress={async () => {
          try {
            await disconnectWallet(); // revoke wallet auth
            await clearPubkey(); // clear local session
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
            router.replace("/welcome");
          } catch (e: any) {
            Alert.alert("Disconnect failed", e?.message ?? String(e));
          }
        }}
      >
        <ThemedText type="defaultSemiBold">Disconnect</ThemedText>
      </Pressable>

      {/* Switch Wallet */}
      <Pressable
        style={styles.switchWallet}
        onPress={async () => {
          try {
            // revoke current session
            await disconnectWallet();
            await clearPubkey();

            // connect again (wallet will let user pick/change account)
            const next = await connectWallet();
            await savePubkey(next);
            setPubkey(next);

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e: any) {
            Alert.alert("Switch wallet failed", e?.message ?? String(e));
          }
        }}
      >
        <ThemedText type="defaultSemiBold">Switch wallet</ThemedText>
      </Pressable>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 70,
    gap: 12,
  },

  addrWrap: { marginTop: 8, gap: 6 },
  addrText: { fontSize: 22, fontFamily: "monospace" },
  addrHint: { opacity: 0.7 },

  chip: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(80,255,160,0.12)",
  },

  card: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  bigTimer: { fontSize: 34, fontFamily: "monospace" },
  muted: { opacity: 0.7 },

  disconnect: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,80,80,0.18)",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  infoBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  infoBtnText: {
    opacity: 0.85,
    fontFamily: "monospace",
  },

  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.10)",
    marginTop: 8,
    marginBottom: 6,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "rgba(80,255,160,0.35)",
  },

  modalOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  modalCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    backgroundColor: "rgba(30,30,30,0.96)",
  },

  modalText: { opacity: 0.85, lineHeight: 20 },

  modalClose: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  updatedText: { opacity: 0.65, marginTop: -2 },

  switchWallet: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },

});
