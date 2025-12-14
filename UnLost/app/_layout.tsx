import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Session } from '@supabase/supabase-js'; // <--- IMPORT THIS
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  // 1. Strictly type the session state
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 2. Fetch the session (TypeScript now knows what 'data' looks like)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // 3. Listen for changes
    // Supabase v2 types will now infer _event and session correctly
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(tabs)';
    
    if (session && !inAuthGroup) {
      router.replace('/(tabs)/home'); 
    } else if (!session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, initialized, segments]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4B2C85" />
      </View>
    );
  }

  return <Slot />;
}