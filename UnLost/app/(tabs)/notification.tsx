import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import Header from '../../components/General/header';
import { Colors } from '../../constants/theme';
import { useNotifications } from '../../contexts/NotificationContext';

interface Notification {
  notification_id: number;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  action_type: string;
  action_data: any;
  post_id?: number;
  deleted: boolean; 
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const { setUnreadCount } = useNotifications();

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [userId]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        fetchNotifications();
      }
    }, [userId])
  );

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const fetchNotifications = async () => {
    try {
      console.log('📥 Fetching notifications for user:', userId);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('deleted', false) // only fetch non-deleted notifications
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      console.log('✅ Fetched', data?.length, 'notifications');
      setNotifications(data || []);

      // Update unread count
      const unread = data?.filter(n => !n.read).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!userId) return () => {};
    
    console.log('🔧 Setting up real-time subscription');
    
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔥 Real-time event:', payload.eventType);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const newNotif = payload.new as Notification;
            if (!newNotif.deleted) {
              setNotifications((prev) => [newNotif, ...prev]);
              console.log('✅ New notification added');
            }
          }
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as Notification;
            
            // If marked as deleted, remove from UI
            if (updated.deleted) {
              setNotifications((prev) =>
                prev.filter((n) => n.notification_id !== updated.notification_id)
              );
              console.log('🗑️ Notification removed from UI');
            } else {
              // Otherwise update it
              setNotifications((prev) =>
                prev.map((n) =>
                  n.notification_id === updated.notification_id ? updated : n
                )
              );
              console.log('✅ Notification updated');
            }
          }
          
          if (payload.eventType === 'DELETE' && payload.old) {
            const deleted = payload.old as Notification;
            setNotifications((prev) =>
              prev.filter((n) => n.notification_id !== deleted.notification_id)
            );
            console.log('🗑️ Notification deleted');
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('notification_id', notificationId);

      if (error) {
        console.error('Error marking as read:', error);
      } else {
        console.log('✅ Marked as read:', notificationId);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.notification_id);
    }

    if (notification.action_type === 'open_post' && notification.post_id) {
      router.push(`/(tabs)/home?openPost=${notification.post_id}` as any);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Soft deleting notification:', notificationId);
              
              // Optimistically remove from UI
              setNotifications((prev) =>
                prev.filter((n) => n.notification_id !== notificationId)
              );
              
              // Call Edge Function
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/soft-delete-notification`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({
                    notificationId,
                    userId
                  }),
                }
              );

              const result = await response.json();

              if (!result.success) {
                throw new Error(result.error);
              }

              console.log('✅ Notification soft deleted successfully');
            } catch (error) {
              console.error('Error deleting:', error);
              Alert.alert('Error', 'Failed to delete notification');
              fetchNotifications();
            }
          },
        },
      ]
    );
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
        .eq('deleted', false); 

      if (error) {
        Alert.alert('Error', 'Failed to mark all as read');
        console.error('Mark all as read error:', error);
      } else {
        console.log('✅ All notifications marked as read');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // clear all notification if it is read(actually just set the boolean as true, not really delete from database)
  const clearAllRead = async () => {
    const readNotifications = notifications.filter((n) => n.read);
    
    if (readNotifications.length === 0) { // fall back if the button is exists
      Alert.alert('No Read Notifications', 'There are no read notifications to clear.');
      return;
    }

    Alert.alert(
      'Clear All Read',
      `Are you sure you want to clear ${readNotifications.length} read notification${readNotifications.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Clearing all read notifications');
              
              // Optimistically remove read notifications from UI
              setNotifications((prev) => prev.filter((n) => !n.read));
              
              // Get all read notification IDs
              const readNotificationIds = readNotifications.map((n) => n.notification_id);
              
              // Call Edge Function to update the boolean of all read notifications
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/soft-delete-notification`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({
                    notificationIds: readNotificationIds, // Pass array of IDs
                    userId
                  }),
                }
              );

              const result = await response.json();

              if (!result.success) {
                throw new Error(result.error);
              }

              console.log('✅ All read notifications cleared successfully');
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
              fetchNotifications(); // Revert on error
            }
          },
        },
      ]
    );
  };

  const getIconName = (type: string): any => {
    switch (type) {
      case 'new_request':
        return 'mail';
      case 'reschedule':
        return 'calendar';
      case 'cancel':
        return 'close-circle';
      case 'accepted':
        return 'checkmark-circle';
      case 'attendance':
        return 'location';
      case 'meeting_soon':
        return 'time';
      case 'meeting_failed':
        return 'alert-circle';
      default:
        return 'notifications';
    }
  };

  const getIconColor = (type: string): string => {
    switch (type) {
      case 'new_request':
        return Colors.light.purple;
      case 'reschedule':
        return Colors.light.orange;
      case 'cancel':
        return '#f44336';
      case 'accepted':
        return '#4CAF50';
      case 'attendance':
        return '#2196F3';
      case 'meeting_soon':
        return '#FF9800';
      case 'meeting_failed':
        return '#f44336';
      default:
        return Colors.light.purple;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={getIconName(item.type)}
          size={28}
          color={getIconColor(item.type)}
        />
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.title, !item.read && styles.unreadTitle]}>
          {item.title}
        </Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.time}>{formatTime(item.created_at)}</Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          deleteNotification(item.notification_id);
        }}
      >
        <Ionicons name="trash-outline" size={20} color="#999" />
      </TouchableOpacity>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.purple} />
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  return (
    <View style={styles.container}>
      <Header title="Notifications" subtitle="Stay updated with your meetings" />

      <View style={styles.actionsContainer}>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark All As Read ({unreadCount})</Text>
          </TouchableOpacity>
        )}
        
        {readCount > 0 && (
          <TouchableOpacity style={styles.clearAllButton} onPress={clearAllRead}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="notifications-off-outline"
            size={80}
            color="#ccc"
          />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            You will be notified about meeting requests and updates
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.notification_id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.light.purple]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 100,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  unreadCard: {
    backgroundColor: '#F3F0FF',
    borderLeftColor: Colors.light.purple,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 8,
  },
  unreadDot: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.purple,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
    marginRight: 10,
  },
  markAllButton: {
    backgroundColor: Colors.light.purple,
    padding: 12,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  markAllText: {
    paddingHorizontal: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearAllButton: {
    marginLeft: 'auto',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  clearAllText: {
    color: Colors.light.purple,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});