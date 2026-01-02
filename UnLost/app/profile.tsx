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
  ScrollView
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import BackButton from '../components/General/backButton';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

type Props = {
  onClose?: () => void;
};

export default function ProfileScreen({ onClose }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

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
    <View style={styles.mainContainer}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
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
      </ScrollView>

      {/* Fixed Back Button at bottom left - Same as PostDetails */}
      <View style={styles.fixedFooter}>
        <BackButton onPress={handleBack} />
      </View>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 100, // Space for fixed footer
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 30,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f0',
    marginTop: 30,
    marginBottom: 20,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 25,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedFooter: {
    position: "absolute",
    bottom: '-7%',
    left: "18%",
    backgroundColor: 'transparent',
    zIndex: 100,
  },
});
