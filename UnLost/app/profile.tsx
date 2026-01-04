import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, Modal, TextInput, RefreshControl
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/General/backButton';
import { decode } from "base64-arraybuffer";
import { Colors } from "../constants/theme";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import PostDetails from '@/components/Main page/PostDetails'; // Adjust path if needed

type MyPost = {
  post_id: number; 
  description: string; 
  status: string; 
  post_image: string | null;
  found_date: string; 
  claim_date: string | null; 
  user_id: string; 
  sensitive: boolean;
};
type MyClaim = { 
  request_id: number; 
  status: string; 
  posts: MyPost | null; 
};
type Profile = { 
  id: string; 
  full_name: string; 
  email: string; 
  profile_picture: string | null; 
  avatar_url: string | null; 
};

type ProfileScreenProps = {
  onClose?: () => void;
  userId?: string;
  onProfileUpdate?: () => void;
};

export default function ProfileScreen({ onClose, userId, onProfileUpdate }: ProfileScreenProps) {
  const router = useRouter();
  
  // Profile and Post State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [myClaims, setMyClaims] = useState<MyClaim[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false); // Check if we are viewing ourselves
  
  // Edit Name State
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Profile Picture State
  const [tempAvatarUri, setTempAvatarUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- NEW: SELECTED POST STATE ---
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  const handleBack = () => onClose ? onClose() : router.back();

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel" },
      { text: "Sign Out", onPress: async () => { 
          try { await supabase.auth.signOut(); router.replace('/'); } 
          catch (e) { Alert.alert("Error", "Sign out failed"); }
      }}
    ]);
  };

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Determine target ID: passed prop OR current session
      const targetId = userId || session.user.id;
      setIsOwnProfile(targetId === session.user.id);

      // 1. Fetch Profile
      const { data: pData } = await supabase.from('profiles').select('*').eq('id', targetId).single();
      setProfile(pData);
      setNewName(pData?.full_name || '');

      // 2. Fetch My Posts
      const { data: postsData } = await supabase.from('posts').select('*').eq('user_id', targetId).neq('status', 'expired').order('found_date', { ascending: false });
      setMyPosts(postsData || []);

      // 3. Fetch My Claims
      const { data: claimsData } = await supabase
        .from('schedule_requests')
        .select('request_id, status, posts(*)')
        .eq('owner_id', targetId)
        .eq('status', 'completed');
      
      setMyClaims((claimsData as any[])?.filter(c => c.posts !== null) || []);
    } catch (e) { console.log(e); } finally { setLoading(false); setRefreshing(false); }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Upload Profile and Edit Username Functions: 
  // pickAvatar, saveAvatarToDatabase, cancelAvatarEdit, saveUserName]

  // Pick Image to Upload
  const pickAvatar = async () => {
      try {
        const res = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true, aspect: [1, 1], quality: 0.7,
        });
        if (res.canceled) return;
        setTempAvatarUri(res.assets[0].uri);
      } catch (error) { Alert.alert('Error', 'Failed to pick image'); }
  };

  // Save to Database and Refresh Profile Picture
  const saveAvatarToDatabase = async () => {
    if (!tempAvatarUri) return;
    try {
      setIsUploading(true);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const base64 = await FileSystem.readAsStringAsync(tempAvatarUri, { encoding: FileSystem.EncodingType.Base64 });
      const arrayBuffer = decode(base64);
      const fileName = `${Date.now()}.png`;
      const filePath = `${session.user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, arrayBuffer, { contentType: "image/png", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("profiles").update({ profile_picture: publicUrl, avatar_url: filePath }).eq("id", session.user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, profile_picture: publicUrl } : null);
      setTempAvatarUri(null);

      Alert.alert("Success", "Profile picture updated!");

      if (onProfileUpdate) {
        console.log("📞 Calling onProfileUpdate callback...");
        onProfileUpdate();
      }
    } catch (e: any) { Alert.alert("Error", e.message || "Upload failed"); } 
    finally { setIsUploading(false); }
  };

  // Clear temporary storage when cancel Profile Picture Upload
  const cancelAvatarEdit = () => { setTempAvatarUri(null); };

  // Save to Database and Refresh Username
  const saveUserName = async () => {

    // Trim Whitespace
    const trimmedName = newName.trim();

    // Check if empty
    if (!trimmedName) {
      Alert.alert("Name Cannot Be Empty", "Please enter a username.");
      return;
    }
    
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('profiles').update({ full_name: newName }).eq('id', session?.user.id);
      setProfile(prev => prev ? { ...prev, full_name: newName } : null);
      setEditModalVisible(false);
      Alert.alert("Success", "Name updated!");
      if (onProfileUpdate) {
        console.log("📞 Calling onProfileUpdate callback...");
        onProfileUpdate();
      }
    } catch (e) { Alert.alert("Error", "Failed to update"); } finally { setSavingName(false); }
  };

  // Date Formats for User Created Posts and Personal Claims
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

  // Data Structure and Storing for User Created Post and Personal Claims
  const renderItem = (post: MyPost, keyValue: string, forceClaimed: boolean) => {
    // Status Chip Colors and Text
    let statusText = forceClaimed ? "Claimed" : (post.sensitive ? "Being Reviewed" : (post.status === 'claimed' ? "Claimed" : "Unclaimed"));
    let statusBg = forceClaimed ? "#4CAF50" : (post.sensitive ? "#FFD700" : (post.status === 'claimed' ? "#4CAF50" : "#FF6B6B"));
    let statusColor = (statusText === "Being Reviewed") ? "#000" : "#fff";

    return (
      <TouchableOpacity 
        key={keyValue} 
        style={styles.historyCard}
        onPress={() => setSelectedPostId(post.post_id)} // Open Details
      >
        <Image
          source={post.post_image ? { uri: post.post_image } : require('../assets/image/Profile/default_profile.avif')} 
          style={styles.historyImage} 
        />
        <View style={styles.historyDetails}>
          <Text style={styles.dateText}>Date of Post:</Text>
          <Text style={styles.dateVal}>{formatDate(post.found_date)}</Text>
          <Text style={styles.dateText}>Date Claimed:</Text>
          <Text style={styles.dateVal}>{formatDate(post.claim_date)}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusChipText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const getProfileImageSource = () => {
    if (tempAvatarUri) return { uri: tempAvatarUri };
    if (profile?.profile_picture) return { uri: profile.profile_picture };
    return require('../assets/image/Profile/default_profile.avif');
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}>
        <View style={styles.headerCurve}>
          
          <View style={styles.avatarContainer}>
            {/* Disable editing if not own profile */}
            <TouchableOpacity onPress={pickAvatar} disabled={!isOwnProfile || isUploading}>
              <Image source={getProfileImageSource()} style={styles.avatar} />
              
              {!tempAvatarUri && isOwnProfile && (
                <View style={styles.camIcon}>
                  <Ionicons name="camera" size={16} color="white" />
                </View>
              )}
            </TouchableOpacity>

            {tempAvatarUri && isOwnProfile && (
              <View style={styles.editActions}>
                <TouchableOpacity onPress={cancelAvatarEdit} style={[styles.actionBtn, styles.cancelBtn]}>
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={saveAvatarToDatabase} style={[styles.actionBtn, styles.saveBtn]}>
                  {isUploading ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="checkmark" size={20} color="white" />}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.username}>{profile?.full_name || "User"}</Text>
            {isOwnProfile && (
              <TouchableOpacity onPress={() => setEditModalVisible(true)}>
                <Ionicons name="create-outline" size={28} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Edit Name Modal (Only shown if own profile) */}
          <Modal visible={isEditModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit Username</Text>
                <TextInput 
                  style={styles.modalInput} 
                  value={newName} 
                  onChangeText={setNewName} 
                  maxLength={25} //Prevents typing over 25 characters including white spaces
                />
                {/* Character counter */}
                <Text style={{ 
                  fontSize: 12, 
                  color: newName.length > 25 ? '#f44336' : '#888',
                  alignSelf: 'flex-end',
                  marginTop: -15,
                  marginBottom: 10
                }}>
                  {newName.length}/25
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#FF6B6B'}]} onPress={() => setEditModalVisible(false)}>
                    {savingName ? <ActivityIndicator color="#fff" /> : <Text style={{color:'#fff', fontWeight: 'bold'}}>Cancel</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#4CAF50'}]} onPress={saveUserName}>
                    {savingName ? <ActivityIndicator color="#fff" /> : <Text style={{color:'#fff', fontWeight: 'bold'}}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          
          {isOwnProfile && (
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Email, Posts Created and Items Claimed*/}
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>USM EMAIL</Text>
          <View style={styles.orangeUnderline} />
          <View style={styles.emailRow}>
             <View style={styles.emailIconBox}><Ionicons name="mail-outline" size={24} color="#333" /></View>
             <View><Text style={styles.emailSub}>Official</Text><Text style={styles.emailMain}>{profile?.email}</Text></View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>HISTORY</Text>
          <View style={styles.orangeUnderline} />
          
          <Text style={styles.listLabel}>POSTS CREATED</Text>
          {myPosts.length === 0 ? <Text style={styles.emptyText}>No posts found.</Text> : 
            myPosts.map(p => renderItem(p, `post-${p.post_id}`, false))
          }
          
          <Text style={[styles.listLabel, {marginTop: 20}]}>ITEMS CLAIMED</Text>
          {myClaims.length === 0 ? <Text style={styles.emptyText}>No completed claims found.</Text> : 
            myClaims.map(c => c.posts && renderItem(c.posts, `claim-${c.request_id}`, true))
          }
        </View>
      </ScrollView>

      {/* Nested Loop into Post Details Page */}
      {selectedPostId !== null && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedPostId(null)}>
           {/* Close logic returns to Profile Page */}
           <PostDetails propId={selectedPostId} onClose={() => setSelectedPostId(null)} />
        </Modal>
      )}

      <View style={styles.fixedFooter}><BackButton onPress={handleBack} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  headerCurve: { 
    backgroundColor: Colors.light.purple, 
    paddingVertical: 50, 
    alignItems: 'center', 
    borderBottomLeftRadius: 70, 
    borderBottomRightRadius: 70 
  },
  avatarContainer: { 
    marginTop: 40, 
    alignItems: 'center', 
    position: 'relative' 
  },
  avatar: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    borderWidth: 3, 
    borderColor: '#fff' 
  },
  camIcon: { 
    position: 'absolute', 
    bottom: 5, 
    right: 5, 
    backgroundColor: Colors.glass.activeIcon, 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#fff' 
  },
  editActions: { 
    flexDirection: 'row', 
    position: 'absolute', 
    bottom: -15, 
    gap: 15, 
    zIndex: 10 
  },
  actionBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#fff', 
    elevation: 4 
  },
  saveBtn: { 
    backgroundColor: '#4CAF50' 
  },
  cancelBtn: { 
    backgroundColor: '#FF6B6B' 
  },
  nameRow: { 
    flexDirection: 'row', 
    alignItems: 'center',      // Centers icon and username
    justifyContent: 'center',  // Centers everything horizontally
    marginTop: 20,
    gap: 10,
    flexWrap: 'wrap',     // Wraps to next line
    marginHorizontal: 25  // Ensures username and icon are away from screen edges
  },
  username: { 
    fontSize: 24, 
    color: '#fff', 
    fontWeight: 'bold',
    textAlign: 'center'
  },
  signOutBtn: { 
    top: '7%', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 15, 
    paddingVertical: 5, 
    borderRadius: 20 
  },
  signOutText: { 
    color: '#fff', 
    fontSize: 13, 
    fontWeight: 'bold' 
  },
  body: { 
    padding: 25, 
    paddingTop: 30,
    paddingBottom: 100
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: Colors.light.purple 
  },
  orangeUnderline: { 
    height: 5, 
    width: 25, 
    backgroundColor: Colors.light.orange, 
    borderRadius: 3, 
    marginTop: 4, 
    marginBottom: 20 
  },
  emailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 15 
  },
  emailIconBox: { 
    width: 45, 
    height: 45, 
    borderRadius: 22.5, 
    backgroundColor: '#F3E5F5', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  emailSub: { 
    fontSize: 12, 
    color: '#888' 
  },
  emailMain: { 
    fontSize: 15, 
    fontWeight: '500' 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#eee', 
    marginVertical: 25 
  },
  listLabel: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 15 
  },
  historyCard: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF9C4', 
    borderRadius: 15, 
    padding: 15, 
    marginBottom: 15, 
    alignItems: 'center' 
  },
  historyImage: { 
    width: 80, 
    height: 80, 
    borderRadius: 10, 
    backgroundColor: '#ddd' 
  },
  historyDetails: { 
    flex: 1, 
    marginLeft: 15 
  },
  dateText: { 
    fontSize: 13, 
    color: '#555' 
  },
  dateVal: { 
    color: '#000', 
    fontWeight: '500', 
    marginBottom: 5 
  },
  statusChip: { 
    position: 'absolute', 
    top: 12, 
    right: 12, 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  statusChipText: { 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  emptyText: { 
    color: Colors.light.textB, 
    fontStyle: 'italic', 
  },
  fixedFooter: { 
    position: 'absolute', 
    bottom: '-8%', 
    left: 65 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  modalContent: { 
    width: '80%', 
    backgroundColor: '#fff', 
    padding: 25, 
    borderRadius: 20 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 15 
  },
  modalInput: { 
    borderBottomWidth: 1, 
    borderColor: '#ccc', 
    marginBottom: 20, 
    padding: 5, 
    fontSize: 16 
  },
  modalButtons: { 
    flexDirection: 'row', 
    gap: 10 
  },
  modalBtn: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
});