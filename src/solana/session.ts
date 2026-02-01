import * as SecureStore from 'expo-secure-store';

const PUBKEY_KEY = 'epochbuddy_pubkey';
const AUTH_TOKEN_KEY = 'epochbuddy_auth_token';

// ---- Pubkey ----
export async function savePubkey(pubkey: string) {
  await SecureStore.setItemAsync(PUBKEY_KEY, pubkey);
}

export async function loadPubkey(): Promise<string | null> {
  return SecureStore.getItemAsync(PUBKEY_KEY);
}

export async function clearPubkey() {
  await SecureStore.deleteItemAsync(PUBKEY_KEY);
}

// ---- Mobile Wallet Adapter auth token ----
// Store token as base58 string so SecureStore can save it.
export async function saveAuthToken(token: string) {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function loadAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function clearAuthToken() {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}