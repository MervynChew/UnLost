// lib/useAuthMonitor.ts
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from './supabase';

export function useAuthMonitor() {
  const router = useRouter();

  useEffect(() => {
    console.log('🔵 useAuthMonitor: Hook mounted');
    let profileSubscription: any;
    let intervalId: ReturnType<typeof setInterval>;

    const checkUserStatus = async () => {
      console.log('🔍 Checking user status...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.log('❌ Error getting user:', userError.message);
        return;
      }
      
      if (!user) {
        console.log('⚠️ No user logged in, skipping check');
        return;
      }

      console.log('✅ User found:', user.id);

      // Check if profile still exists and is not banned
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      console.log('📊 Profile query result:', { profile, error: error?.message });

      if (error || !profile) {
        console.log('🚨 PROFILE DELETED - Signing out user');
        await supabase.auth.signOut();
        Alert.alert(
          'Account Deleted',
          'Your account has been deleted by an administrator.',
          [{ text: 'OK', onPress: () => router.replace('/') }]
        );
        return;
      }

      console.log('👤 User role:', profile.role);

      if (profile.role === 'banned') {
        console.log('🚫 USER BANNED - Signing out user');
        await supabase.auth.signOut();
        Alert.alert(
          'Account Banned',
          'Your account has been banned by an administrator.',
          [{ text: 'OK', onPress: () => router.replace('/') }]
        );
        return;
      }

      console.log('✅ User status OK');
    };

    const setupMonitoring = async () => {
      console.log('🔧 Setting up monitoring...');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('⚠️ No user logged in, monitoring not started');
        return;
      }

      console.log('👤 Monitoring user:', user.id);

      // 1. Real-time subscription (instant notifications)
      const channelName = `profile-${user.id}`;
      console.log('📡 Creating realtime channel:', channelName);
      
      profileSubscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          async (payload) => {
            console.log('🔔 REALTIME EVENT RECEIVED:', {
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old
            });

            if (payload.eventType === 'DELETE') {
              console.log('🚨 DELETE EVENT - Signing out user');
              await supabase.auth.signOut();
              Alert.alert(
                'Account Deleted',
                'Your account has been deleted by an administrator.',
                [{ text: 'OK', onPress: () => router.replace('/') }]
              );
            } else if (payload.eventType === 'UPDATE') {
              const newRole = payload.new.role;
              console.log('🔄 UPDATE EVENT - New role:', newRole);
              
              if (newRole === 'banned') {
                console.log('🚫 BANNED STATUS - Signing out user');
                await supabase.auth.signOut();
                Alert.alert(
                  'Account Banned',
                  'Your account has been banned by an administrator.',
                  [{ text: 'OK', onPress: () => router.replace('/') }]
                );
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status:', status);
        });

      console.log('✅ Realtime subscription created');

      // 2. Periodic check (backup - every 30 seconds)
      console.log('⏰ Setting up periodic check (30s interval)');
      intervalId = setInterval(() => {
        console.log('⏰ Periodic check triggered');
        checkUserStatus();
      }, 30000);
      
      // 3. Check immediately on mount
      console.log('🔍 Running initial status check');
      await checkUserStatus();
      
      console.log('✅ Monitoring setup complete');
    };

    setupMonitoring();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up monitoring...');
      if (profileSubscription) {
        console.log('📡 Removing realtime subscription');
        supabase.removeChannel(profileSubscription);
      }
      if (intervalId) {
        console.log('⏰ Clearing interval');
        clearInterval(intervalId);
      }
      console.log('✅ Cleanup complete');
    };
  }, [router]);
}