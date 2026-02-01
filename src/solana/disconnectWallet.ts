import { Platform } from 'react-native';
import { clearAuthToken, loadAuthToken } from './session';

export async function disconnectWallet(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const authToken = await loadAuthToken();
  if (!authToken) return;

  const { transact } = await import('@solana-mobile/mobile-wallet-adapter-protocol');

  await transact(async (wallet) => {
    await wallet.deauthorize({ auth_token: authToken });
  });

  await clearAuthToken();
}
