import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

const IDS_KEY = "epochbuddy_epoch_notif_ids";

async function setIds(ids: string[]) {
  await SecureStore.setItemAsync(IDS_KEY, JSON.stringify(ids));
}
async function getIds(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(IDS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function clearEpochNotifications() {
  const ids = await getIds();
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await setIds([]);
}

export async function scheduleEpochNotifications(params: {
  etaSeconds: number;
  epoch: number;
  notifyAtOneHour: boolean;
  notifyAtEnd: boolean;
}) {
  const { etaSeconds, epoch, notifyAtOneHour, notifyAtEnd } = params;

  await clearEpochNotifications();

  const ids: string[] = [];

  if (notifyAtOneHour && etaSeconds > 3600) {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: "Epoch ending soon", body: `~1 hour left in epoch ${epoch}.` },
      trigger: { seconds: etaSeconds - 3600, channelId: "epoch" },
    });
    ids.push(id);
  }

  if (notifyAtEnd && etaSeconds > 5) {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: "New epoch starting", body: `Epoch ${epoch} is about to end.` },
      trigger: { seconds: etaSeconds, channelId: "epoch" },
    });
    ids.push(id);
  }

  await setIds(ids);
  return ids;
}

export async function getScheduledEpochNotificationCount() {
  const ids = await getIds();
  return ids.length;
}
