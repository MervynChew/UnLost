import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from "../../lib/supabase";


type Profile = {
  full_name: string;
  profile_picture: string | null;
}

type ScheduleData = {
  request_id: number;
  meet_date: string;
  meet_time: string;
  location: string;
  status: string;
  profiles: Profile; // Nested object
}

type ScheduleDisplayProp = {
  postId?: number;
}

export default function ScheduleDisplay({ postId }: ScheduleDisplayProp) {
  // Store EVERYTHING in one variable
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScheduleDetails();
  }, [postId]);

  const getScheduleDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('schedule_requests')
        // select * gets the schedule info, profiles(...) gets the nested user info
        .select('*, profiles(full_name, profile_picture)') 
        .eq('post_id', postId) // Fixed typo: 'posi_id' -> 'post_id'
        .eq('status', 'pending')
        .single();

      if (error) {
        console.log("Error fetching:", error.message);
      } else {
        // TypeScript knows 'data' matches 'ScheduleData'
        // We save the WHOLE object, including the nested profile
        setSchedule(data as ScheduleData); 
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator />;
  if (!schedule) return <Text>No schedule found.</Text>;

  // === RENDER ===
  // Now you access the data cleanly using dot notation
  return (
    <View style={styles.cardContainer}>
      <Text style={styles.headerTitle}>Requested schedule</Text>
      <View style={styles.iconContainer}>
        <Ionicons name="calendar-outline" size={24} color={Colors.light.purple} />
      </View>
      {/* Accessing main attributes */}
      <Text>Time: {schedule.meet_time}</Text>
      <Text>Location: {schedule.location}</Text>
      
      {/* Accessing the nested "attribute inside" */}
      <Text>With: {schedule.profiles.full_name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    margin: 10,
    width: "140%",
    alignSelf: "center",
  },
  title: { fontSize: 18, fontWeight: 'bold' }
});