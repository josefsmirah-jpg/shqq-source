import { Stack } from "expo-router";
import C from "@/constants/colors";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bgDark } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="archive" />
      <Stack.Screen name="employees" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="companies" />
      <Stack.Screen name="paid-ads" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="add-listing" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="cards" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="contact-log" />
      <Stack.Screen name="employee-profile" />
    </Stack>
  );
}
