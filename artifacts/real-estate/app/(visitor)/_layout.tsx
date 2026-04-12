import { Stack } from "expo-router";
import C from "@/constants/colors";

export default function VisitorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bgDark } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="post" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="my-ads" />
      <Stack.Screen name="edit-ad" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="cards" options={{ animation: "slide_from_bottom" }} />
    </Stack>
  );
}
