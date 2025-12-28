import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { supabase } from "../../lib/supabase";

type ClaimedByProps = {
  scheduleRequestId: number;
};

export default function ClaimedBy({ scheduleRequestId }: ClaimedByProps) {
  const [name, setName] = useState("Loading...");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const fallBackImage = require("../../assets/image/Profile/default_profile.avif");

  const fetchClaimerInfo = async () => {
    if (!scheduleRequestId) return;

    console.log("Fetching claimer info for request ID:", scheduleRequestId);

    try {
      // Get the schedule request with claimer info
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("schedule_requests")
        .select("owner_id")
        .eq("request_id", scheduleRequestId)
        .single();

      if (scheduleError) {
        console.error("Error fetching schedule:", scheduleError);
        setName("Unknown");
        return;
      }

      // Get claimer profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, profile_picture")
        .eq("id", scheduleData.owner_id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setName("Unknown");
        return;
      }

      setName(profileData.full_name || "Unknown");
      setImageUrl(profileData.profile_picture || null);

    } catch (err) {
      console.error("Unexpected error:", err);
      setName("Unknown");
    }
  };

  useEffect(() => {
    fetchClaimerInfo();
  }, [scheduleRequestId]);

  return (
    <View style={styles.container}>
      <Image
        source={imageUrl ? { uri: imageUrl } : fallBackImage}
        style={styles.avatar}
      />
      <Text style={styles.name}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    padding: 10,
    alignSelf: "flex-start",
    marginLeft: "10%",
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#ccc",
    backgroundColor: "#f0f0f0",
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
});