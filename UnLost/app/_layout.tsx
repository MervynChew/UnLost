import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added for cleanup
import { supabase } from '../lib/supabase';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../lib/notificationService';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 1. Check initial session on app load
    const initializeAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // If there's an error (like Invalid Refresh Token), 
      // we ensure the session is null so the user is sent to login
      if (error) {
        console.warn("Auth initialization error:", error.message);
        setSession(null);
      } else {
        setSession(session);
      }
      setInitialized(true);
    };

    initializeAuth();

    // 2. Listen for auth changes (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);

      // If the session is lost or user signs out, clear the specific storage key
      // This prevents the "Refresh Token Not Found" error from looping
      if (event === 'SIGNED_OUT') {
        // Supabase usually handles this, but manual cleanup is safer in Expo
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
    // Wait until we have checked the initial session
    if (!initialized) return;

    // Check if the user is currently inside the (tabs) folder
    const inTabsGroup = segments[0] === '(tabs)';

    // ✅ ADDED: routes that are allowed OUTSIDE (tabs) while logged in
    const publicRoutes = ['profile'];

    // ✅ ADDED
    const inPublicRoute = publicRoutes.includes(segments[0]);

    if (session && !inTabsGroup && !inPublicRoute) {
      // User is logged in but NOT in tabs -> Send to Home
      router.replace('/(tabs)/home');
    } else if (!session && inTabsGroup) {
      // User is NOT logged in but trying to access tabs -> Send to Auth (Root)
      router.replace('/');
    }
  }, [session, initialized, segments]);

  // Show a loading spinner while checking auth status
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FB' }}>
        <ActivityIndicator size="large" color="#4B2C85" />
      </View>
    );
  }

  return (
    <NotificationProvider>
      <Slot />
    </NotificationProvider>
  );
}
