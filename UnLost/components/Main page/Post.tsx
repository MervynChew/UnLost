import React, { useMemo, useState } from 'react';
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
  }
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

export default function Post({ post }: PostProps) {

  const [modalVisible, setModalVisible] = useState(false);

  // 1. Generate a list of random colors, one for EACH tag
  // We do this here so the colors don't change every time you scroll
  const tagColors = useMemo(() => {
    return post.tags ? post.tags.map(() => getRandomThemeColor()) : [];
  }, [post.post_id, post.tags]);
  
return (
    <>
      {/* 1. THE CARD CONTAINER (Changed from TouchableOpacity to View) */}
      <View style={styles.postContainer}>
        
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
    flexWrap: 'wrap',
    padding: 10,
    gap: 8,

    height: 74,        // 1. Set fixed height (approx 2 rows + gaps)
    overflow: 'hidden', // 2. Hide any tags that fall outside this height
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
    color: '#000000ff', // Black text usually looks best on pastel tags
  }
});