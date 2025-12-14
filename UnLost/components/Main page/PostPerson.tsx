import React, { useState, useEffect } from 'react';
import { View, Text, Image, Alert, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';

type PostPersonProps = {
  id?: number | string, // 1. Allow string (UUIDs are strings)
}

export default function PostPerson({ id }: PostPersonProps) {

  const [name, setName] = useState("Loading...");
  // 2. State should ONLY hold the URL string or null. NOT the fallback file.
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const fallBackImage = require('../../assets/image/Profile/default_profile.avif');

  const fetchProfile = async () => {
    if (!id) return;

    // Debugging: Check if this actually runs
    console.log("Fetching profile for ID:", id); 

    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(full_name, profile_picture)')
      .eq('post_id', id)
      .single();

    if (error) {
      console.log("Supabase Error:", error);
    } else {
      setName(data.profiles.full_name || "Unknown");
      // 3. Only set state if we actually have a URL string
      setImageUrl(data.profiles.profile_picture || null); 
    }
  }

  

  useEffect(() => {
    fetchProfile();
  }, [id]);

  return (
    <View style={styles.container}>
      <Image 
        // 4. Logic: If imageUrl exists, use {uri}. Otherwise, use the raw fallback file.
        source={imageUrl ? { uri: imageUrl } : fallBackImage} 
        style={styles.avatar}
      />
      <Text style={styles.name}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center', // Center vertically
    alignItems: 'center',    // Center horizontally
    flexDirection: 'row',    // Side by side
    gap: 10,                 // Add space between image and text
    // Removed 'flex: 1' because it might stretch weirdly in a list
    padding: 10,
    alignSelf: 'flex-start',
    marginLeft: '10%',
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 25, // Half of size
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f0', 
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
});