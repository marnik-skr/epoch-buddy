import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { disconnectWallet } from '../../src/solana/disconnectWallet';
import { clearPubkey, loadPubkey } from '../../src/solana/session';

export default function HomeScreen() {
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
      <ThemedText type="subtitle">Connected wallet:</ThemedText>
      <ThemedText selectable>{pubkey}</ThemedText>

      {/* 🔴 Disconnect button */}
      <Pressable
        style={styles.disconnect}
        onPress={async () => {
          try {
            await disconnectWallet(); // revoke wallet auth
            await clearPubkey();      // clear local session
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
