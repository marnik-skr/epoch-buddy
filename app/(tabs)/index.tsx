import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { loadPubkey } from '../../src/solana/session';

export default function HomeScreen() {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadPubkey().then((k) => {
      setPubkey(k);
      setReady(true);
    });
  }, []);

  if (!ready) return null; // tiny loading state
  if (!pubkey) return <Redirect href="/welcome" />;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Epoch</ThemedText>
      <ThemedText type="subtitle">Connected wallet:</ThemedText>
      <ThemedText>{pubkey}</ThemedText>
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 70, gap: 12 },
});