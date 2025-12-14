import { Image } from "expo-image";
import { Platform, StyleSheet, View, FlatList, ScrollView} from "react-native";
import { useEffect, useState } from 'react';
import SearchBar from "../../components/Main page/searchBar";

import Welcome from "../../components/Main page/Welcome";
import Profile from "@/components/Main page/Profile";
import Post from "@/components/Main page/Post"
import { supabase } from "../../lib/supabase"; // Adjust

export default function HomeScreen() {

  const [username, setUsername] = useState('User');
  const [posts, setPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(''); // <--- State for search text

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

  const handleSearchSubmit = () => {
    fetchPosts();
  }

  const fetchPosts = async () => {
    let query = supabase
      .from('posts')
      .select('*, profiles(id, full_name, profile_picture)') // Remember to keep your profiles join!
      .eq('sensitive', false) // <--- THIS DOES THE FILTERING
      .order('created_at', { ascending: false });

    // --- THE SEARCH LOGIC ---
    if (searchQuery.trim().length > 0) {
      // .ilike() is "Case-Insensitive Like"
      // This searches if the description OR the tags contains the text
      query = query.or(`description.ilike.%${searchQuery}%, tags.cs.{${searchQuery}}`);
    }

    const { data, error } = await query;
    const { data: { session } } = await supabase.auth.getSession();
    console.log("🔍 STATUS:", session ? "LOGGED IN ✅" : "GUEST (NO AUTH) ❌");

    if (error) {
      console.log('Error fetching posts:', error);
    } else {
      setPosts(data || []);
    }
  };

  useEffect(() => {
    getProfile();
    fetchPosts();
  }, []);

  return (
    <View style={styles.container}>
      
      {/* THE FIX: Use FlatList as the MAIN wrapper */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.post_id.toString()}
        renderItem={({ item }) => <Post post={item} />}

        // 1. ENABLE GRID MODE
        numColumns={2} 
        
        columnWrapperStyle={{ 
          justifyContent: 'space-between', // Pushes cards to the edges
          paddingHorizontal: 20,           // MUST MATCH 'screenPadding' above (20)
          gap: 15                          // MUST MATCH 'gap' above (15) (Optional if justifyContent handles it, but good for safety)
        }}
              
        // 1. Put all your top content HERE
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Welcome name={username} />
              <Profile />
            </View>
            <SearchBar 
              value={searchQuery}
              onChangeText={setSearchQuery} // Update state as they type
              onSubmit={handleSearchSubmit} // Fetch only when they press Enter
            />
          </>
        }
        
        // 2. Add some padding so the list isn't stuck to the edges
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flexDirection: 'column',
  },
  header: {
    marginTop: '15%',          // Safe space from top notch
    flexDirection: 'row',      // Align side-by-side
    justifyContent: 'space-between', // <--- PUSHES THEM APART
    alignItems: 'center',      // Vertically center them
    paddingHorizontal: 2,     // Add spacing from screen edges
    width: '100%',             // Ensure it takes full width
  },
});
