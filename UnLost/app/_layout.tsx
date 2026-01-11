import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../lib/notificationService';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useAuthMonitor } from '../lib/useAuthMonitor'; // ✅ Import the hook

// ✅ Create a wrapper component that only renders when logged in
function AuthenticatedApp({ session }: { session: Session }) {
  useAuthMonitor(); // Now this only runs when user is logged in
  
  return <Slot />;
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 1. Check initial session on app load
    const initializeAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn("Auth initialization error:", error.message);
        setSession(null);
      } else {
        setSession(session);
      }
      setInitialized(true);
    };

    initializeAuth();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);

      if (event === 'SIGNED_OUT') {
        await AsyncStorage.clear(); 
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ Setup notification listeners
  useEffect(() => {
    if (session) {
      const cleanup = setupNotificationListeners(router);
      return cleanup;
    }
  }, [session, router]);

  useEffect(() => {
    if (!initialized) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const publicRoutes = ['profile'];
    const inPublicRoute = publicRoutes.includes(segments[0]);

    if (session && !inTabsGroup && !inPublicRoute) {
      router.replace('/(tabs)/home');
    } else if (!session && inTabsGroup) {
      router.replace('/');
    }
  }, [session, initialized, segments]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FB' }}>
        <ActivityIndicator size="large" color="#4B2C85" />
      </View>
    );
  }

  return (
    <NotificationProvider>
      {/* ✅ Only activate monitoring when user is logged in */}
      {session ? <AuthenticatedApp session={session} /> : <Slot />}
    </NotificationProvider>
  );
}