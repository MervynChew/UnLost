import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Button,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import BackButton from '../components/General/backButton';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

export default function ProfileScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  /* ================= FETCH PROFILE IMAGE ================= */
  const getProfileImage = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('profile_image') // ⚠️ MUST EXIST in DB
      .eq('id', session.user.id)
      .single();

    // 🔐 SAFE: only set if exists
    if (!error && data?.profile_image) {
      setImage(data.profile_image);
    }
  };

  useEffect(() => {
    getProfileImage();
  }, []);

  /* ================= UPLOAD AVATAR ================= */
  const uploadAvatar = async () => {
    try {
      setLoading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled) return;

      const img = result.assets[0];
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const base64 = await FileSystem.readAsStringAsync(img.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const filePath = `${session.user.id}/${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decodeURIComponent(escape(atob(base64))), {
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ profile_image: publicUrl })
        .eq('id', session.user.id);

      if (dbError) throw dbError;

      setImage(publicUrl);
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to upload image.');
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <View style={styles.container}>
      <BackButton onPress={() => router.back()} />

      <Text style={styles.title}>My Profile</Text>

      <Button
        title="Sign Out"
        onPress={async () => {
          try {
            await supabase.auth.signOut();
            // redirect to login/root page immediately
            router.replace('/'); 
          } catch (error) {
            console.log(error);
            Alert.alert('Error', 'Failed to sign out.');
          }
        }}
      />

      <TouchableOpacity onPress={uploadAvatar} disabled={loading}>
        {loading ? (
          <View style={[styles.avatar, styles.loading]}>
            <ActivityIndicator />
          </View>
        ) : (
          <Image
            source={
              image
                ? { uri: image }
                : require('../assets/image/Profile/default_profile.avif')
            }
            style={styles.avatar}
          />
        )}
        <View style={styles.editBadge} />
      </TouchableOpacity>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    marginVertical: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f0',
    marginTop: 20,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
