import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { disconnectWallet } from '../../src/solana/disconnectWallet';
import { clearPubkey, loadPubkey } from '../../src/solana/session';
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { shortAddress } from "../../src/ui/walletUi";

export default function HomeScreen() {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
  
      (async () => {
        const k = await loadPubkey();
        console.log('HOME loadPubkey() =', k);
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
    <ThemedView style={styles.container}>
      <ThemedText type="title">Epoch</ThemedText>
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
        <ThemedText style={styles.addrText}>
          {shortAddress(pubkey)}
        </ThemedText>
        <ThemedText style={styles.addHint}>
          {copied ? "Copied" : "Tap to copy"}
        </ThemedText>
      </Pressable>

      <ThemedText style={styles.chip}>Connected</ThemedText>

      <Pressable
        style={styles.disconnect}
        onPress={async () => {
          try {
            await disconnectWallet(); // revoke wallet auth
            await clearPubkey();      // clear local session
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/welcome');
          } catch (e: any) {
            Alert.alert('Disconnect failed', e?.message ?? String(e));
          }
        }}
      >
        <ThemedText type="defaultSemiBold">Disconnect</ThemedText>
      </Pressable>
    </ThemedView>
    
  );
}

const styles = StyleSheet.create({
  addrWrap: { marginTop: 8, gap: 6 },
  addrText: { fontSize: 22, fontFamily: "monospace" },
  addrHint: { opacity: 0.7 },
  seekerId: { opacity: 0.85 },
  chip: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(80,255,160,0.12)",
  },

  container: {
    flex: 1,
    padding: 20,
    paddingTop: 70,
    gap: 12,
  },
  disconnect: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,80,80,0.18)',
  },
});
