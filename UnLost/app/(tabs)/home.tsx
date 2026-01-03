import { Image } from "expo-image";
import { Platform, StyleSheet, View, StatusBar, FlatList, Modal, Animated, Text} from "react-native";
import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProfileScreen from '../../app/profile'; 
import SearchBar from "../../components/Main page/searchBar";

import Welcome from "../../components/Main page/Welcome";
import Profile from "@/components/Main page/Profile";
import Post from "@/components/Main page/Post"
import PostDetails from "@/components/Main page/PostDetails";
import { supabase } from "../../lib/supabase"; // Adjust

export default function HomeScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [username, setUsername] = useState('User');
  const [posts, setPosts] = useState<any[]>([]);
  const [searchTags, setSearchTags] = useState<string[]>([]);    // Search tags state
  const [statusFilter, setStatusFilter] = useState('All Items'); // Status filter state
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  // Animation State
  const scrollY = useRef(new Animated.Value(0)).current;
  const [welcomeHeight, setWelcomeHeight] = useState(0); // Default height

  // Track the exact height of the search bar (including tags)
  const [searchBarHeight, setSearchBarHeight] = useState(60);

  // In home.tsx, add this state and modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Track Recent Filter States
  const searchTagsRef = useRef(searchTags);
  const statusFilterRef = useRef(statusFilter);

  // Fetch User Profile
  const getProfile = async() => {

    const {data: { session },} = await supabase.auth.getSession();

    if (!session) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .single(); // .single() gives you one object instead of an array
  
    // 3. Handle the result INSIDE the function (where 'data' exists)
    if (error) {
      console.log("Error fetching profile:", error);
    } else if (data) {
      // Use 'full_name' because that is what you selected above
      setUsername(data.full_name);
    }
  };
  
  // Handle search with tags and status
  const handleSearchChange = (tags: string[], status: string) => {
    setSearchTags(tags);
    setStatusFilter(status);
  };

  const fetchPosts = async () => {
    try{
      let query = supabase
        .from('posts')
        .select('*, profiles(id, full_name, profile_picture)') // Remember to keep your profiles join!
        .eq('sensitive', false) // <--- THIS DOES THE FILTERING
        .order('created_at', { ascending: false });

      // Status Filter
      if (statusFilter === 'Unclaimed') {
        query = query.eq('status', 'lost'); // Status 'lost' from post status in supabase
      } else if (statusFilter === 'Claimed') {
        query = query.eq('status', 'claimed'); // Status 'claimed' from post status in supabase
      } else {
      // For 'All Items', show only 'lost' and 'claimed' posts from supabase
      query = query.in('status', ['lost', 'claimed']);
    }

      const { data, error } = await query;

      const { data: { session } } = await supabase.auth.getSession();
      console.log("🔍 STATUS:", session ? "LOGGED IN ✅" : "GUEST (NO AUTH) ❌");

      if (error) {
        console.log('Error fetching posts:', error);
        return;
      }

      // Calculate the Final Data Logic
      let finalDisplayData = data || [];

      // Apply Tag Search Filter (Case insensitive, partial match)
      if (searchTags.length > 0) {
        finalDisplayData = finalDisplayData.filter(post => 
          post.tags?.some((postTag: string) => 
            searchTags.some(searchTag => 
              postTag.toLowerCase().includes(searchTag.toLowerCase())
            )
          )
        );
      }

      // Update State and Cache
      setPosts(finalDisplayData);
    } catch (err) {
      console.log('Error in fetchPosts:', err);
    }
  };

  // Handle notification navigation, auto-open modal
  useEffect(() => {
    if (params.openPost) {
      const postId = Number(params.openPost);
      console.log('📬 Opening post from notification:', postId);
      setSelectedPostId(postId);
      
      // Clear the parameter after opening
      router.replace('/(tabs)/home');
    }
  }, [params.openPost]);

  // Update refs when state changes
  useEffect(() => {
    searchTagsRef.current = searchTags;
  }, [searchTags]);

  useEffect(() => {
    statusFilterRef.current = statusFilter;
  }, [statusFilter]);

  useEffect(() => {
    getProfile();
    fetchPosts();
  }, [searchTags, statusFilter]); // Refetch when tags or status change

  useEffect(() => {
  // Create the subscription channel
  const postSubscription = supabase
    .channel('public:posts') // Look at the 'posts' table from supabase in 'public' schema
    .on(
      'postgres_changes', 
      { 
        event: '*',    // Listen to new posts, post status updates, and post deletions
        schema: 'public', 
        table: 'posts' 
      }, 
      async (payload) => {
        console.log('✨ Post Changes detected in real-time!', payload);
        try {
          // Use refs to get current filter values
          const currentSearchTags = searchTagsRef.current;
          const currentStatusFilter = statusFilterRef.current;
          
          let query = supabase
            .from('posts')
            .select('*, profiles(id, full_name, profile_picture)')
            .eq('sensitive', false)
            .order('created_at', { ascending: false });

          // Apply current status filter
          if (currentStatusFilter === 'Unclaimed') {
            query = query.eq('status', 'lost');
          } else if (currentStatusFilter === 'Claimed') {
            query = query.eq('status', 'claimed');
          } else {
            query = query.in('status', ['lost', 'claimed']);
          }

          const { data, error } = await query;

          if (error) {
            console.log('Error fetching posts:', error);
            return;
          }

          // Apply current tag filter
          let finalDisplayData = data || [];
          if (currentSearchTags.length > 0) {
            finalDisplayData = finalDisplayData.filter(post => 
              post.tags?.some((postTag: string) => 
                currentSearchTags.some(searchTag => 
                  postTag.toLowerCase().includes(searchTag.toLowerCase())
                )
              )
            );
          }

          // Update State
          setPosts(finalDisplayData);
          console.log(`🔄 Real-time update: ${finalDisplayData.length} posts (Filter: ${currentStatusFilter})`);
        } catch (err) {
          console.log('Error in real-time fetch:', err);
        }
      }
    )
    .subscribe();

  // Clean up the subscription when the user leaves the page
  return () => {
    supabase.removeChannel(postSubscription);
  }; }, []);

  // Safe area constant
  const SAFE_TOP = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 47;

  // Interpolation for Sticky Search Bar
  // When scroll is 0, push SearchBar down by 'welcomeHeight'.
  // When scroll matches 'welcomeHeight', push SearchBar down by 0 (Sticks search bar to top)
  // Inside your HomeScreen component
  const WELCOME_ROW_HEIGHT = 150; // Welcome Row Height
    const searchBarTranslateY = scrollY.interpolate({
      inputRange: [0, WELCOME_ROW_HEIGHT || 100],
      outputRange: [WELCOME_ROW_HEIGHT - 40, 0], // Adjust height of search bar initially
      extrapolate: 'clamp',
    });

  return (
    <View style={styles.container}>

      {/* Status Bar property for Immersive Mode, and prevents layout jump when navigating */}
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Codes Below: Arrange Components in the Main Page in Order */}

      {/* Welcome Section */}
      <Animated.View style={[
        styles.welcomeRow, 
        { 
          position: 'absolute',
          top: 0, 
          left: 0, 
          right: 0,
          zIndex: 110, // Higher than Search Bar (100)
          transform: [{
            translateY: scrollY.interpolate({
              inputRange: [0, 500],
              outputRange: [0, -500], // Moves UP as you scroll DOWN
              extrapolate: 'clamp' // Only move up, don't bounce down
            })
          }]
        }
      ]}>
        <Welcome name={username} />
        <Profile onPress={() => setProfileModalVisible(true)} />
      </Animated.View>

      {/* White Shield: Covers the gap caused by immersive status bar, to hide posts when they are above search bar */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 10 + (StatusBar.currentHeight || 0), // Covers the 'top: 40' gap + immersive bar
        backgroundColor: 'white',
        zIndex: 1, // Just below the SearchBar (100)
      }} />

      {/* Animated Sticky Search Bar Container */}
      <Animated.View 
      // Added onLayout to capture dynamic height when tags are searched
        onLayout={(e) => setSearchBarHeight(e.nativeEvent.layout.height)}
        style={[
          styles.stickySearchContainer,
          { transform: [{ translateY: searchBarTranslateY }], // Scroll search bar for a while, then sticks it on top of the screen
            paddingTop: SAFE_TOP
          } 
        ]}
      >
        <SearchBar onSearchChange={handleSearchChange} />
      </Animated.View>

      {/* Use FlatList as the MAIN wrapper for Search Bar, and Posts below */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.post_id.toString()}

        // When no posts found
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name="newspaper-outline" 
              size={100} 
              color="#ccc" 
            />
            <Text style={styles.emptyText}>No posts found</Text>
          </View>
        }
        // Connect Scroll Animation
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false } // Safer for layout animations
        )}

        ListHeaderComponent={
          <View>
            {/* This "hole" is where the floating Welcome row sits */}
            <View style={{ height: WELCOME_ROW_HEIGHT }} /> 
            
            {/* This "hole" is where the Sticky Search Bar sits */}
            <View style={{ height: searchBarHeight }} />
          </View>
        }

        // Ensure the post display is behind the search bar
        style={{ zIndex: 0 }}

        renderItem={({ item }) => (
          <Post 
            post={item}
            // ⭐ Pass auto-open prop if this is the post from notification
            autoOpen={item.post_id === selectedPostId}
            onAutoOpenComplete={() => setSelectedPostId(null)}
          />
        )}
        // 1. ENABLE GRID MODE
        numColumns={2} 
        
        columnWrapperStyle={{ 
          top: '3%',
          justifyContent: 'space-between', // Pushes cards to the edges
          paddingHorizontal: 20,           // MUST MATCH 'screenPadding' above (20)
          gap: 15,                         // MUST MATCH 'gap' above (15) (Optional if justifyContent handles it, but good for safety)
        }}
        
        // 2. Add some padding so the list isn't stuck to the edges
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Profile Modal - Opens profile in immersive mode without refreshing home */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
        statusBarTranslucent={true}
      >
        <ProfileScreen onClose={() => setProfileModalVisible(false)} />
      </Modal>

      {/* Fallback modal if post not found in list yet */}
      {selectedPostId !== null && !posts.find(p => p.post_id === selectedPostId) && (
        <Modal
          visible={true}
          animationType="fade"
          statusBarTranslucent={true}
        >
          <PostDetails 
            propId={selectedPostId} 
            onClose={() => setSelectedPostId(null)} 
          />
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  // Welcome Section Styles
  welcomeRow: {
    backgroundColor: 'white',
    marginTop: '7%',          // Space from top of screen
    flexDirection: 'row',      // Align side-by-side
    justifyContent: 'space-between', // <--- PUSHES THEM APART
    alignItems: 'center',      // Vertically center them
    width: '100%',             // Ensure it takes full width
    paddingHorizontal: 20,
    zIndex: 10000,              // Ensure section is above other content
  },
  // Search Bar Styles
  stickySearchContainer: {
    position: 'absolute', // Takes it out of the flow
    top: '3%',               // Anchored to the very top of the SAFE AREA (due to container padding)
    left: 0, 
    right: 0,
    zIndex: 100,         // Ensures Dropdown is ABOVE the list
    backgroundColor: 'white',
    paddingTop: '-15%',       // Adjust to match your SearchBar design
    paddingBottom: 12.5,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  listContent: {
    paddingBottom: 100, // Prevent last post from being covered by the navigation bar
  },
  // Styles when post list is empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100, // Adjust this value to position it properly below the search bar
  },
  emptyText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '500',
    color: '#000000ff',
  },
});
