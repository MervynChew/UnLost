import { View, Text, StyleSheet, Button, Image, TouchableOpacity, Alert, ActivityIndicator  } from 'react-native';
import { supabase } from '../../lib/supabase'; 

import React, { useState, useEffect } from 'react';

import * as ImagePicker from 'expo-image-picker';

import * as FileSystem from 'expo-file-system/legacy'; // Use the legacy import you fixed earlier

export default function ProfileScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Fetch existing image on load
  const getProfileImage = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('profiles')
      .select('profile_image')
      .eq('id', session.user.id)
      .single();

    if (data?.profile_image) {
      setImage(data.profile_image);
    }
  };

  useEffect(() => {
    getProfileImage();
  }, []);

  // 2. THE UPLOAD LOGIC
  const uploadAvatar = async () => {
    try {
      setLoading(true);

      // A. Pick Image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      const img = result.assets[0];
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // B. Prepare File for Upload (Read as Base64)
      const base64 = await FileSystem.readAsStringAsync(img.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Unique filename: "user_id/timestamp.png"
      const filePath = `${session.user.id}/${new Date().getTime()}.png`;

      // C. Upload to Storage Bucket ('avatars')
      const { error: uploadError } = await supabase.storage
        .from('avatars') // <--- MUST MATCH YOUR BUCKET NAME
        .upload(filePath, decodeURIComponent(escape(atob(base64))), {
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      // D. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // E. "LINK IT" -> Update Database
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ profile_image: publicUrl }) // <--- Saving the link here
        .eq('id', session.user.id);

      if (dbError) throw dbError;

      // F. Update UI
      setImage(publicUrl);
      Alert.alert("Success", "Profile picture updated!");

    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to upload image.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>My Profile</Text>
      <Button title="Sign Out" onPress={() => supabase.auth.signOut()} />
        <TouchableOpacity onPress={uploadAvatar} disabled={loading}>
        {loading ? (
          <View style={[styles.avatar, styles.loading]}>
            <ActivityIndicator size="small" color="#000" />
          </View>
        ) : (
          <Image 
            source={image ? { uri: image } : require('../../assets/image/Profile/default_profile.avif')} 
            style={styles.avatar}
          />
        )}
        {/* Optional: Edit Icon Badge */}
        <View style={styles.editBadge} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center',
    width: 60,
    height: 60,
  },
  text: { fontSize: 18, marginBottom: 20 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f0',
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#007AFF', // Blue dot to show it's editable
    borderWidth: 2,
    borderColor: 'white',
  }
});