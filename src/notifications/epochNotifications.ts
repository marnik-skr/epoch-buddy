import * as Notifications from "expo-notifications";

let scheduledIds: string[] = [];

export async function clearEpochNotifications() {
  await Promise.all(
    scheduledIds.map((id) => Notifications.cancelScheduledNotificationAsync(id))
  );
  scheduledIds = [];
}

export async function scheduleEpochNotifications(params: {
  etaSeconds: number;
  epoch: number;
  notifyAtOneHour: boolean;
  notifyAtEnd: boolean;
}) {
  const { etaSeconds, epoch, notifyAtOneHour, notifyAtEnd } = params;

  // prevent stacking duplicates
  await clearEpochNotifications();

  const ids: string[] = [];

  if (notifyAtOneHour && etaSeconds > 3600) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Epoch ending soon",
        body: `~1 hour left in epoch ${epoch}.`,
      },
      trigger: { seconds: etaSeconds - 3600, channelId: "epoch" },
    });
    ids.push(id);
  }

  if (notifyAtEnd && etaSeconds > 5) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "New epoch starting",
        body: `Epoch ${epoch} is about to end.`,
      },
      trigger: { seconds: etaSeconds, channelId: "epoch" },
    });
    ids.push(id);
  }

  scheduledIds = ids;
  return ids;
}
