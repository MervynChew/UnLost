import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Image, Text, Dimensions, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Colors } from '../../constants/theme';
import { useRouter } from 'expo-router';
import PostDetails from './PostDetails';

type PostProps = {
  post: {
    post_id: number;
    post_image: string;
    tags: string[];
    description?: string; 
    status?: string;
  };
  autoOpen?: boolean; //  Auto-open the specific post's modal
  onAutoOpenComplete?: () => void; // Callback when auto-open is done
};

const BACKGROUND_OPTIONS = [
  Colors.light.purple,
  Colors.light.orange,
  Colors.light.yellow,
  Colors.light.fakeWhite, // You might want to remove this if it's too light for white text
  // Colors.light.white, // REMOVE THIS: White tag on white card will be invisible
];

const getRandomThemeColor = () => {
  const randomIndex = Math.floor(Math.random() * BACKGROUND_OPTIONS.length);
  return BACKGROUND_OPTIONS[randomIndex];
};

const screenWidth = Dimensions.get('window').width;
const numColumns = 2;
const gap = 15;
const screenPadding = 20;
const cardWidth = (screenWidth - (screenPadding * 2) - gap) / numColumns;

export default function Post({ post, autoOpen, onAutoOpenComplete }: PostProps) {

  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  // 1. Generate a list of random colors, one for EACH tag
  // We do this here so the colors don't change every time you scroll
  const tagColors = useMemo(() => {
    return post.tags ? post.tags.map(() => getRandomThemeColor()) : [];
  }, [post.post_id, post.tags]);

  // 2. Determine text and color of status of post based on post status
  const statusChip = useMemo(() => {
    const status = post.status?.toLowerCase() || '';
    
    if (status === 'lost') {
      return {
        text: 'Unclaimed',
        backgroundColor: '#FF6B6B', // Red for lost
        color: '#FFFFFF'
      };
    } else {
      return {
        text: 'Claimed',
        backgroundColor: '#4CAF50', // Green for claimed/found
        color: '#FFFFFF'
      };
    }
  }, [post.status]);

  // ⭐ Auto-open modal if autoOpen prop is true
  useEffect(() => {
    if (autoOpen) {
      console.log('🎯 Auto-opening modal for post:', post.post_id);
      setModalVisible(true);
      // Call the callback to let parent know we've opened
      onAutoOpenComplete?.();
    }
  }, [autoOpen]);
  
return (
    <>
      {/* 1. THE CARD CONTAINER (Changed from TouchableOpacity to View) */}
      <View style={styles.postContainer}>
        
        {/* Post Status at Top Right of each post */}
        <View style={styles.statusChipContainer}>
          <View style={[
            styles.statusChip, 
            { backgroundColor: statusChip.backgroundColor }
          ]}>
            <Text style={[styles.statusText, { color: statusChip.color }]}>
              {statusChip.text}
            </Text>
          </View>
        </View>

        {/* A. CLICKABLE AREA (Image opens the modal) */}
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => setModalVisible(true)}
          style={{ width: '100%' }} // Ensure it fills width
        >
          <Image source={{ uri: post.post_image }} style={styles.postImage} />
        </TouchableOpacity>

        {/* B. SCROLLABLE AREA (Separate from the click event) */}
        <View style={{ height: 44 }}>
          <ScrollView 
            horizontal={true} 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.postTags}
            // These props help with nested touches
            nestedScrollEnabled={true} 
            keyboardShouldPersistTaps="always"
          >
            {post.tags && post.tags.map((tag, index) => (
              <View key={index} style={[styles.tagBadge, { backgroundColor: tagColors[index] }]}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
      
      {/* 2. THE COMPONENT (Hidden in Modal) */}
      <Modal
        visible={modalVisible}
        // FIX 1: Change animation to 'fade' so it doesn't slide up from bottom
        animationType="fade" 
        
        // FIX 2: Allow the modal to cover the Status Bar area (Immersive Mode)
        statusBarTranslucent={true}
      >
        <PostDetails 
          propId={post.post_id} 
          onClose={() => setModalVisible(false)} 
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  postContainer: {
    marginBottom: 20,
    backgroundColor: '#ffffffff', // <--- Back to White
    borderRadius: 15,
    overflow: 'hidden', 
    flex: 1,
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: cardWidth,
  },
  postImage: {
    width: '100%',
    height: 150, 
    resizeMode: 'cover',
  },
  postTags: {
    flexDirection: 'row',
    alignItems: 'center',    // Vertically center the badges
    // flexWrap: 'wrap',
    padding: 10,
    gap: 8,

    // height: 74,        // 1. Set fixed height (approx 2 rows + gaps)
    // overflow: 'hidden', // 2. Hide any tags that fall outside this height
    // Comment out the above 3 lines in postTags to ensure tags list only store tags in one row
  },
  tagBadge: {
    // backgroundColor: ... (Removed static color, handled inline above)
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000', // Black text usually looks best on pastel tags
  },
  statusChipContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10, // Ensur status is above the post image
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  }
});