import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string>('');
  const [channelRef, setChannelRef] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth event:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // User logged in - set new user ID
        console.log('✅ User signed in:', session.user.id);
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        // User logged out - reset everything
        console.log('👋 User signed out - resetting notification context');
        setUserId('');
        setUnreadCount(0);
        
        // Clean up existing channel if any
        if (channelRef) {
          await supabase.removeChannel(channelRef);
          setChannelRef(null);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed - ensure we have the right user
        console.log('🔄 Token refreshed for user:', session.user.id);
        if (userId !== session.user.id) {
          setUserId(session.user.id);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (userId) {
      console.log('👤 Setting up notifications for user:', userId);
      
      // Reset unread count when user changes
      setUnreadCount(0);
      
      // Fetch notifications for new user
      fetchUnreadCount();
      
      // Setup realtime subscription
      const cleanup = setupRealtimeSubscription();
      
      return cleanup;
    } else {
      console.log('❌ No user ID - skipping notification setup');
    }
  }, [userId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('👤 Current user:', user.id);
      setUserId(user.id);
    } else {
      console.log('❌ No current user');
      setUserId('');
      setUnreadCount(0);
    }
  };

  const fetchUnreadCount = async () => {
    if (!userId) {
      console.log('⚠️ No userId - cannot fetch unread count');
      return;
    }
    
    try {
      console.log('📊 Fetching unread count for user:', userId);
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
        .eq('deleted', false);

      if (!error && count !== null) {
        console.log('📊 Unread badge count updated:', count);
        setUnreadCount(count);
      } else if (error) {
        console.error('❌ Error fetching unread count:', error);
      }
    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!userId) {
      console.log('⚠️ No userId - cannot setup subscription');
      return () => {};
    }
    
    // Clean up old channel if exists
    if (channelRef) {
      console.log('🧹 Cleaning up old channel before creating new one');
      supabase.removeChannel(channelRef);
    }
    
    console.log('🔔 Setting up real-time badge subscription for:', userId);
    
    const channel = supabase
      .channel(`notifications-badge-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 Badge real-time event:', payload.eventType);
          // Immediately refresh count on any notification change
          fetchUnreadCount();
        }
      )
      .subscribe((status) => {
        console.log('🔔 Badge subscription status:', status);
      });

    setChannelRef(channel);

    return () => {
      console.log('🧹 Cleaning up badge subscription');
      supabase.removeChannel(channel);
      setChannelRef(null);
    };
  };

  const refreshUnreadCount = async () => {
    console.log('🔄 Manual refresh unread count triggered');
    await fetchUnreadCount();
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};