import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Notification() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notification</Text>

        {/* Spacer to balance header */}
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.text}>
          Hi, here is notification page
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  text: {
    fontSize: 16,
    color: '#555',
  },
});
