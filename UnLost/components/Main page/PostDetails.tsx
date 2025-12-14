import React, { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ScrollView, Alert, Image, View, StyleSheet, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import Header from '../General/header';

import { Colors } from "../../constants/theme";
import { ButtonOrange } from "../General/buttonOrange";
import BackButton from "../General/backButton";
import Footer from "../General/footer";
import Seperator from "../General/sectionSeperator"
import PostPerson from "./PostPerson"


// 1. Import StatusBar
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from "@expo/vector-icons"; 
import Schedule from './Schedule';
import ScheduleDisplay from './ScheduleDisplay';

type Props = {
  propId?: number;     // Allow passing ID directly
  onClose?: () => void; // Allow a custom "Back" action
};

export default function PostDetails({ propId, onClose }: Props) {

  //const params = useLocalSearchParams();
  const router = useRouter();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true); // 1. Added Loading State
  const [modalVisible, setModalVisible] = useState(false);

  const [postPersonName, setPostPersonName] = useState<any>("");
  const [postPersonProfile, setPostPersonProfile] = useState();

  const [viewId, setViewerId] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const [time, setTime] = useState("");
  const [meetupDate, setMeetupDate] = useState(new Date());
  // 1. Add State for Place
  const [meetupPlace, setMeetupPlace] = useState("");

  // 1. LOGIC CHANGE: Use the prop ID if it exists, otherwise check URL
  // const id = propId || params.id;
  const id = propId;

  const [rescheduleMeeting, setRescheduleMeeting] = useState(false);

  
  const fetchPostDetails = async () => {
    if (!id) return;

    // Start loading
    setLoading(true);

    const {data, error} = await supabase
      .from('posts')
      .select('*, profiles(full_name, profile_picture)') // fixed typo: profile_picture -> profile_image usually
      .eq('post_id', id)
      .single();

    if (error) {
      console.log(error);
      Alert.alert("Error", "Could not fetch item details.");
    }
    else {
      setPost(data);
    }
    
    // Stop loading
    setLoading(false);
    setOwnerId(data.user_id);
  }

  const getViewer = async () => {
    const {data: { session },} = await supabase.auth.getSession();

    if (!session) return;

    setViewerId(session.user.id);
  }

  useEffect(() => {
    fetchPostDetails();
    getViewer();
  },[id]);

  const handleBack = () => {
    if (onClose) {
      onClose(); // If used as a component, close the Modal
    } else {
      router.back(); // If used as a page, go back in history
    }
  };

  // 2. CRASH FIX: Don't render if data is missing
  if (loading || !post) {
    return (
      <View style={[styles.mainContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.purple} />
      </View>
    );
  };



  const handleScheduleUpdate = (newDate: Date) => {
    console.log("Full Date & Time received:", newDate.toLocaleString()); // <--- This will now print!
    setMeetupDate(newDate);
  };

  // 3. The final submit logic (for the orange button)
  const submitToDatabase = async () => {
    
    const year = meetupDate.getFullYear();
    const month = String(meetupDate.getMonth() + 1).padStart(2, '0'); // Months are 0-11
    const day = String(meetupDate.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;

    // 2. Get the Local Time for the "meet_time" column
    // This gives "17:30:00" in YOUR timezone (24-hour format)
    const hours = String(meetupDate.getHours()).padStart(2, '0');
    const minutes = String(meetupDate.getMinutes()).padStart(2, '0');
    const localTimeString = `${hours}:${minutes}:00`;

    console.log("Sending Local Time:", localTimeString); // Check your console!

    const insertData = {
      post_id: id,
      owner_id: viewId, // The person claiming
      location: meetupPlace,
      
      // Send them separately
      meet_date: localDateString,
      meet_time: localTimeString
    };
    
    const { error } = await supabase.from('schedule_requests').insert(insertData);
    
    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Success", "Request Sent!");
  }

  console.log("Reschedule State is:", rescheduleMeeting);

  return (
    <View style={styles.mainContainer}>

      <Stack.Screen 
        options={{
          headerShown: false, // Hide default header
          presentation: 'card', // 'card' makes it slide from side, 'modal' makes it slide from bottom
          gestureEnabled: true,
        }} 
      />

      {/* 2. Make the Status Bar transparent and float ON TOP of your content */}
      <StatusBar 
        style="dark" 
        translucent={true} 
        backgroundColor="transparent" 
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <Header
          title="Post Details"
          subtitle="Help the item find back their own parent"
        ></Header>

        {/* The Annotated Image from Server */}
        <View style={styles.imageCard}>
          {/* Layer A: Blurred Background */}
          <Image
            source={{ uri: post.post_image }}
            style={[StyleSheet.absoluteFill, styles.imageBackground]}
            blurRadius={30} 
            resizeMode="cover"
          />

          {/* Layer B: Dark Overlay */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.2)" },
            ]}
          />

          {/* Layer C: Main Image */}
          <Image
            source={{ uri: post.post_image }}
            style={styles.resultImage}
            resizeMode="contain"
          />
        </View>

        <Seperator title="Posted by"/>

        <PostPerson id={id} />

        <Seperator title="Tag"/>

        {/* 3. SYNTAX FIX: Corrected the .map function */}
        <View style={styles.tagsWrapper}>
          {post.tags && post.tags.map((tag: string, index: number) => (
            <View key={index} style={styles.tagBadge}>
              <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        {/* --- MODAL --- */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Manage Tags</Text>

              <View style={styles.modalTagWrapper}>
                {post.tags && post.tags.map((tag: string, index: number) => (
                  <View key={index} style={styles.modalTag}>
                    <Text style={styles.modalTagText}>{tag}</Text>
                  </View>
                ))}
                {(!post.tags || post.tags.length === 0) && (
                  <Text style={{ color: "#999" }}>No tags yet.</Text>
                )}
              </View>

              {/* Close Button for Modal */}
              <ButtonOrange 
                title="Close" 
                variant="primary" 
                onPress={() => setModalVisible(false)} 
              />
            </View>
          </View>
        </Modal>

        <Seperator title="Description:"/>

        <View style={styles.descriptionBox}>
          <Text style={styles.inputDescriptionBox}>
            {post.description || "No description provided."}
          </Text>
        </View>

        <Seperator title="Schedule"/>
 
        <View style={styles.scheduleSection}>
          <Schedule setDateAndTime={handleScheduleUpdate} setPlace={(place) => setMeetupPlace(place)} setReschedule={(reschedule) => setRescheduleMeeting(reschedule)}/>
        </View>
        {/* </View> */}

        <View style={styles.bottomButton}>

          <ButtonOrange
            onPress={submitToDatabase}
            title={rescheduleMeeting? "Reschedule": "Confirm"}
            variant={"secondary"}
            style={rescheduleMeeting? styles.rescheduleButton : styles.confirmButton}
          />
        </View>
        
        <Footer />
      </ScrollView>

      <View style={styles.fixedFooter}>
        <BackButton onPress={handleBack} />
      </View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.light.white,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.white,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 40, // Increased padding so content isn't hidden behind footer
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    width: "100%",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  imageCard: {
    width: "90%",
    height: 350,
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#eee",
    position: "relative",
  },
  imageBackground: {
    opacity: 0.8,
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  resultLabel: {
    color: "#00FF9D",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  resultColor: {
    color: "#FFF",
    fontSize: 18,
    opacity: 0.9,
  },
  tag: {
    color: "black",
  },
  tagsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "flex-start",
    alignItems: "center", // Added alignment
    width: "90%",
    backgroundColor: Colors.light.fakeWhite,
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.yellow,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderColor: Colors.light.purple,
  },
  tagText: {
    color: Colors.light.purple,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  descriptionBox: {
    elevation: 5, // Reduced elevation to prevent shadow artifacts
    shadowColor: "#110C2E",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    backgroundColor: "white",
    width: "90%", // Match width with other cards
    minHeight: 100,

    borderRadius: 10,
    padding: 10, // Added padding inside the container
  },
  inputDescriptionBox: {
    minHeight: 100,
    fontSize: 16,
    color: "#333",
    textAlignVertical: "top",
  },
  editButton: {
    alignSelf: "flex-end",
    marginRight: "5%",
    marginTop: 10,
  },
  confirmButton: {
    width: "40%", // Made button slightly wider
    minHeight: 40,
    fontSize: 50,
    marginRight: '2%',
    fontWeight: 'bold',
  },
  rescheduleButton: {
    width: "40%", // Made button slightly wider
    minHeight: 40,
    fontSize: 50,
    marginRight: '2%',
    fontWeight: 'bold',
  },
  bottomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    alignSelf: 'flex-end',
  },
  fixedFooter: {
    position: "absolute",
    bottom: -60,
    left: -240,
    right: 0,
    backgroundColor: Colors.light.white, // Match background so content scrolls "under" it
    flexDirection: "row",
    justifyContent: "space-evenly", // Spacing between buttons
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 10,

    // Add a shadow so it separates from the scrolling content
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 }, // Shadow points UP
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  
  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  modalTagWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  modalTag: {
    backgroundColor: Colors.light.yellow,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalTagText: {
    fontWeight: "600",
    color: "#333",
    fontSize: 14,
  },
  scheduleSection: {
    width: '95%',
  }
});