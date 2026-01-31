import * as SecureStore from 'expo-secure-store';

const KEY = 'epochbuddy_pubkey';

export async function savePubkey(pubkey: string) {
  await SecureStore.setItemAsync(KEY, pubkey);
}

export async function loadPubkey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function clearPubkey() {
  await SecureStore.deleteItemAsync(KEY);
}
