import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

import { connectWallet } from "../../src/solana/connectWallet";
import { disconnectWallet } from "../../src/solana/disconnectWallet";
import { clearPubkey, loadPubkey, savePubkey } from "../../src/solana/session";
import { useEpochCountdown } from "../../src/hooks/useEpochCountdown";
import { formatHMS } from "../../src/solana/epoch";
import { shortAddress } from "../../src/ui/walletUi";

import {
  clearEpochNotifications,
  getScheduledEpochNotificationCount,
  scheduleEpochNotifications,
} from "../../src/notifications/epochNotifications";

const NOTIF_1H_KEY = "epochbuddy_notify_1h";
const NOTIF_END_KEY = "epochbuddy_notify_end";
const NOTIF_LAST_KEY = "epochbuddy_notif_last_scheduled_at";

export default function HomeScreen() {
  const router = useRouter();

  const [showEpochInfo, setShowEpochInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const { status, eta, error, secondsSinceUpdate, refresh: refreshEpoch } =
    useEpochCountdown();

  // notifications prefs + status
  const [notify1h, setNotify1h] = useState(false);
  const [notifyEnd, setNotifyEnd] = useState(false);
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [scheduledAgeSec, setScheduledAgeSec] = useState<number | null>(null);

  // pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // debounce timer ref (RN-safe typing)
  const reschedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // progress + next epoch time
  const progress =
    status && status.slotsInEpoch > 0 ? status.slotIndex / status.slotsInEpoch : 0;
  const progressPct = Math.max(0, Math.min(1, progress));
  const progressLabel = `${(progressPct * 100).toFixed(1)}%`;

  const nextEpochAt = new Date(Date.now() + eta * 1000).toLocaleTimeString(
    undefined,
    { hour: "2-digit", minute: "2-digit" }
  );

  // load wallet on focus
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

  // load notification prefs + last scheduled info once
  useEffect(() => {
    (async () => {
      const a = await SecureStore.getItemAsync(NOTIF_1H_KEY);
      const b = await SecureStore.getItemAsync(NOTIF_END_KEY);
      if (a != null) setNotify1h(a === "1");
      if (b != null) setNotifyEnd(b === "1");

      const count = await getScheduledEpochNotificationCount();
      setScheduledCount(count);

      const last = await SecureStore.getItemAsync(NOTIF_LAST_KEY);
      if (last) {
        const ts = Number(last);
        if (!Number.isNaN(ts)) {
          setScheduledAgeSec(Math.max(0, Math.floor((Date.now() - ts) / 1000)));
        }
      }
    })();
  }, []);

  // tick scheduled age label
  useEffect(() => {
    if (scheduledAgeSec == null) return;
    const t = setInterval(() => {
      setScheduledAgeSec((v) => (v == null ? null : v + 1));
    }, 1000);
    return () => clearInterval(t);
  }, [scheduledAgeSec]);

  const rescheduleEpochNotifs = useCallback(
    async (reason: string, next1h: boolean, nextEnd: boolean) => {
      if (!status) return;

      await SecureStore.setItemAsync(NOTIF_1H_KEY, next1h ? "1" : "0");
      await SecureStore.setItemAsync(NOTIF_END_KEY, nextEnd ? "1" : "0");

      if (!next1h && !nextEnd) {
        await clearEpochNotifications();
        setScheduledCount(0);
        setScheduledAgeSec(null);
        return;
      }

      const ids = await scheduleEpochNotifications({
        etaSeconds: eta,
        epoch: status.epoch,
        notifyAtOneHour: next1h,
        notifyAtEnd: nextEnd,
      });

      await SecureStore.setItemAsync(NOTIF_LAST_KEY, String(Date.now()));
      setScheduledCount(ids.length);
      setScheduledAgeSec(0);
    },
    [status, eta]
  );



  // AUTO reschedule (debounced) when epoch/toggles change
  useEffect(() => {
    if (!status) return;
    if (secondsSinceUpdate !== 0) return; // ✅ stops the 0→2→0 loop

    const t = setTimeout(() => {
      rescheduleEpochNotifs("epoch-refresh");
    }, 600);

    return () => clearTimeout(t);
  }, [status?.epoch, secondsSinceUpdate, rescheduleEpochNotifs]);

  const refreshAll = useCallback(async () => {
    try {
      setRefreshing(true);

      const k = await loadPubkey();
      setPubkey(k);

      refreshEpoch(); // manual epoch fetch (your hook exposes refresh)
      await Haptics.selectionAsync();

      // schedule immediately after refresh (still safe b/c debounce)
      setTimeout(() => rescheduleEpochNotifs("pull-to-refresh"), 0);
    } finally {
      setRefreshing(false);
    }
  }, [refreshEpoch, rescheduleEpochNotifs]);

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

            <ThemedText style={styles.updatedText}>
              Updated {secondsSinceUpdate}s ago • Next epoch ~{nextEpochAt}
            </ThemedText>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progressPct * 100)}%` },
                ]}
              />
            </View>

            <ThemedText style={styles.muted}>
              {progressLabel} • Epoch {status.epoch} • Slot {status.slotIndex} /{" "}
              {status.slotsInEpoch}
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
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEpochInfo(false)}
        >
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
            await disconnectWallet();
            await clearPubkey();
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

      {/* Switch Wallet (safe-ish version: connect first) */}
      <Pressable
        style={styles.switchWallet}
        onPress={async () => {
          try {
            const next = await connectWallet(); // let user pick first
            await disconnectWallet(); // then revoke old
            await clearPubkey();

            await savePubkey(next);
            setPubkey(next);

            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
          } catch (e: any) {
            Alert.alert("Switch wallet failed", e?.message ?? String(e));
          }
        }}
      >
        <ThemedText type="defaultSemiBold">Switch wallet</ThemedText>
      </Pressable>

      {/* Notifications Card */}
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Notifications</ThemedText>

        <ThemedText style={styles.muted}>
          {scheduledCount > 0
            ? `Scheduled ✅ (${scheduledCount})${
                scheduledAgeSec != null ? ` • ${scheduledAgeSec}s ago` : ""
              }`
            : "Not scheduled"}
        </ThemedText>

        <View style={styles.row}>
          <ThemedText>1 hour left</ThemedText>
          <Switch
            value={notify1h}
            onValueChange={(v) => {
              const next1h = v;
              const nextEnd = notifyEnd;
              setNotify1h(next1h);
              setTimeout(() => {
                rescheduleEpochNotifs("toggle-1h", next1h, nextEnd);
              }, 0);
            }}
          />
        </View>

        <View style={styles.row}>
          <ThemedText>Epoch end</ThemedText>
          <Switch
            value={notifyEnd}
            onValueChange={(v) => {
              const nextEnd = v;
              const next1h = notify1h;
              setNotifyEnd(nextEnd);
              setTimeout(() => {
                rescheduleEpochNotifs("toggle-end", next1h, nextEnd);
              }, 0);
            }}
          />
        </View>



        <Pressable
          style={styles.notifBtnSecondary}
          onPress={async () => {
            await clearEpochNotifications();
            setScheduledCount(0);
            setScheduledAgeSec(null);
            Alert.alert("Cleared ✅", "All epoch notifications removed.");
          }}
        >
          <ThemedText type="defaultSemiBold">Clear notifications</ThemedText>
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  bigTimer: { fontSize: 34, fontFamily: "monospace" },
  muted: { opacity: 0.7 },
  updatedText: { opacity: 0.65, marginTop: -2 },

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
  infoBtnText: { opacity: 0.85, fontFamily: "monospace" },

  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.10)",
    marginTop: 6,
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

  disconnect: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,80,80,0.18)",
  },

  switchWallet: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  notifBtnSecondary: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
