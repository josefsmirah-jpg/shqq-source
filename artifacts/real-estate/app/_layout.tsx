import { setBaseUrl } from "@workspace/api-client-react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nManager, AppState, AppStateStatus, View, StyleSheet, Text, TouchableOpacity, Linking, Platform } from "react-native";
import * as Network from "expo-network";
import Constants from "expo-constants";
import { LoginScreen } from "@/components/LoginScreen";
import SplashAnimation from "@/components/SplashAnimation";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import C from "@/constants/colors";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

SplashScreen.preventAutoHideAsync();

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function ForceUpdateScreen({ storeUrl }: { storeUrl: string }) {
  return (
    <View style={styles.updateContainer}>
      <Text style={styles.updateIcon}>🔄</Text>
      <Text style={styles.updateTitle}>يلزم تحديث التطبيق</Text>
      <Text style={styles.updateMsg}>
        يوجد إصدار جديد من التطبيق. يرجى التحديث للاستمرار في الاستخدام.
      </Text>
      <TouchableOpacity
        style={styles.updateBtn}
        onPress={() => Linking.openURL(storeUrl)}
      >
        <Text style={styles.updateBtnText}>تحديث الآن</Text>
      </TouchableOpacity>
    </View>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "RQ_CACHE_V1",
  throttleTime: 30_000,
});

const ROLE_GROUPS = ["(visitor)", "(company)", "(employee)", "(admin)"];

interface LoginModalContextType {
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

export const LoginModalContext = createContext<LoginModalContextType>({
  openLoginModal: () => {},
  closeLoginModal: () => {},
});

export function useLoginModal() {
  return useContext(LoginModalContext);
}

let _sessionIdPromise: Promise<string> | null = null;
let _installRegistered = false;

async function getOrCreateSessionId(): Promise<string> {
  if (_sessionIdPromise) return _sessionIdPromise;
  _sessionIdPromise = (async () => {
    try {
      const existing = await AsyncStorage.getItem("session_id");
      if (existing) return existing;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      await AsyncStorage.setItem("session_id", id);
      return id;
    } catch {
      return `${Date.now()}-fallback`;
    }
  })();
  return _sessionIdPromise;
}

async function sendHeartbeat(sessionId: string) {
  try {
    await fetch(`${BASE_URL}/api/online/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  } catch {}
}

function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!cancelled) {
          const offline = state.isConnected === false || state.isInternetReachable === false;
          setIsOffline(offline);
        }
      } catch {}
    };
    check();
    const id = setInterval(check, 15_000);
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => { if (s === "active") check(); });
    return () => { cancelled = true; clearInterval(id); sub.remove(); };
  }, []);
  return isOffline;
}

function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>لا يوجد اتصال بالإنترنت — يتم عرض البيانات المحفوظة</Text>
    </View>
  );
}

function useHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    let active = true;
    getOrCreateSessionId().then((id) => {
      if (!active) return;
      sessionIdRef.current = id;
      sendHeartbeat(id);
      intervalRef.current = setInterval(() => sendHeartbeat(id), 25_000);
      // تسجيل التحميل مرة واحدة فقط في نفس الجلسة
      if (!_installRegistered) {
        _installRegistered = true;
        fetch(`${BASE_URL}/api/installs/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id, platform: Platform.OS }),
        }).catch(() => { _installRegistered = false; });
      }
    });

    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        if (!intervalRef.current && sessionIdRef.current) {
          sendHeartbeat(sessionIdRef.current);
          intervalRef.current = setInterval(() => sendHeartbeat(sessionIdRef.current), 25_000);
        }
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    });

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, []);
}

function AuthRouter() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const splashHidden = useRef(false);
  const isOffline = useNetworkStatus();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [forceUpdate, setForceUpdate] = useState<{ storeUrl: string } | null>(null);

  useHeartbeat();

  useEffect(() => {
    const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
    fetch(`${BASE_URL}/api/config`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.minVersion && compareVersions(currentVersion, data.minVersion) < 0) {
          setForceUpdate({ storeUrl: data.storeUrl ?? "https://apps.apple.com/app/id6761640135" });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync();
    }

    if (!user) return;

    const inRoleScreen = ROLE_GROUPS.includes(segments[0] as string);
    const correctSegment = `(${user.role})`;
    if (segments[0] !== correctSegment) {
      if (user.role === "visitor")  router.replace("/(visitor)" as any);
      else if (user.role === "company")  router.replace("/(company)" as any);
      else if (user.role === "employee") router.replace("/(employee)" as any);
      else if (user.role === "admin")    router.replace("/(admin)" as any);
    } else if (!inRoleScreen) {
      router.replace("/(visitor)" as any);
    }
  }, [user, isLoading, segments]);

  useEffect(() => {
    if (user && user.phone && user.phone !== "") {
      setShowLoginModal(false);
    }
  }, [user]);

  if (forceUpdate) {
    return <ForceUpdateScreen storeUrl={forceUpdate.storeUrl} />;
  }

  return (
    <LoginModalContext.Provider value={{
      openLoginModal: () => setShowLoginModal(true),
      closeLoginModal: () => setShowLoginModal(false),
    }}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: { backgroundColor: C.bgDark },
        }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(visitor)" />
          <Stack.Screen name="(company)" />
          <Stack.Screen name="(employee)" />
          <Stack.Screen name="(admin)" />
        </Stack>

        {showLoginModal && (
          <View style={StyleSheet.absoluteFill}>
            <LoginScreen onClose={() => setShowLoginModal(false)} />
          </View>
        )}

        <OfflineBanner visible={isOffline} />
      </View>
    </LoginModalContext.Provider>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          maxAge: 24 * 60 * 60 * 1000,
        }}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <AuthRouter />
          </AuthProvider>
          {showSplash && (
            <SplashAnimation onFinish={() => setShowSplash(false)} />
          )}
        </GestureHandlerRootView>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  updateContainer: {
    flex: 1,
    backgroundColor: C.bgDark,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  updateIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  updateTitle: {
    color: C.gold,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  updateMsg: {
    color: "#ccc",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  updateBtn: {
    backgroundColor: C.gold,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  updateBtnText: {
    color: C.bgDark,
    fontSize: 16,
    fontWeight: "700",
  },
  offlineBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#B22222",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    zIndex: 9999,
  },
  offlineText: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
    writingDirection: "rtl",
  },
});
