import "react-native-get-random-values";
import "react-native-reanimated";

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";

import { useColorScheme } from "@/hooks/use-color-scheme";

import { Platform } from "react-native";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Show notifications when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // ✅ new
    shouldShowList: true,  
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});


export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("epoch", {
            name: "Epoch alerts",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e) {
        console.log("Notifications permission error:", e);
      }
    })();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
