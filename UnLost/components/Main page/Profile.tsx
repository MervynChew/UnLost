import React from 'react';
import { Pressable, Image, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function Profile() {

  const [image, setImage] = useState(null);
  const fallBackImage = require('../../assets/image/Profile/default_profile.avif');
  const router = useRouter(); // <-- For navigating to profile page

  const getProfileImage = async() => {
    const {data: { session }} = await supabase.auth.getSession();
    if (!session) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('profile_picture')
      .eq('id', session.user.id)
      .single(); // .single() gives you one object instead of an array

    // 3. Handle the result INSIDE the function (where 'data' exists)
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
    <Pressable onPress={() => router.push('/profile')}>
      <Image 
        source={image ? { uri: image } : fallBackImage} 
        style={styles.avatar}/>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    right: 20,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 75, // Makes it a perfect circle
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f0', // Grey background while loading
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  }
});
