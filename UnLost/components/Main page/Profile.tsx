import React from 'react';
import { Pressable, Image, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '../../constants/theme';

type ProfileProps = {
  onPress: () => void;
  profilePicture: string | null;
};

export default function Profile({ onPress, profilePicture }: ProfileProps) {
  const fallBackImage = require('../../assets/image/Profile/default_profile.avif');

  console.log("🖼️ Profile component rendering with picture:", profilePicture);

  return (
    <Pressable onPress={onPress}>
      <Image 
        source={profilePicture ? { uri: profilePicture } : fallBackImage} 
        style={styles.avatar}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  }
});