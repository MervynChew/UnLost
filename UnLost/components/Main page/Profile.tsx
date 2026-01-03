import React from 'react';
import { Pressable, Image, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Colors } from '../../constants/theme';

type ProfileProps = {
  onPress: () => void;
};

export default function Profile({ onPress }: ProfileProps) {
  const [image, setImage] = useState<string | null>(null);
  const fallBackImage = require('../../assets/image/Profile/default_profile.avif');

  const getProfileImage = async() => {
    const {data: { session }} = await supabase.auth.getSession();
    if (!session) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('profile_picture')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.log("Error fetching profile:", error);
    } else if (data && data.profile_picture) {
      setImage(data.profile_picture);
    }
  };

  useEffect(() => {
    getProfileImage();
  }, []);

  return (
    <Pressable onPress={onPress}>
      <Image 
        source={image ? { uri: image } : fallBackImage} 
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
    width: 50,
    height: 50,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  }
});