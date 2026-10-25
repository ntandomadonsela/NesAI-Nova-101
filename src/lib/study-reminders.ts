import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const REMINDER_ID = 731_025;

export async function scheduleDailyStudyReminder(time: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) throw new Error("Study reminders are available in the app.");
  const [hour, minute] = time.split(":").map(Number);
  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("Choose a valid reminder time.");
  }

  let permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted") {
    throw new Error("Allow notifications in your device settings to set a study reminder.");
  }

  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
  const firstReminder = new Date();
  firstReminder.setHours(hour, minute, 0, 0);
  if (firstReminder.getTime() <= Date.now()) firstReminder.setDate(firstReminder.getDate() + 1);
  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_ID,
        title: "A little study time?",
        body: "Pick up where you left off in your NesAI Study Desk.",
        schedule: { at: firstReminder, repeats: true },
        extra: { path: "/chat" },
      },
    ],
  });
}

export async function cancelDailyStudyReminder(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
}
