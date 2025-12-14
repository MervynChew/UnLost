import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import { useState } from "react";
import { ThemedText } from "@/components/themed-text";

import { Colors } from "../../constants/theme";
import { ButtonOrange } from "../General/buttonOrange";
import BackButton from "../General/backButton";
import Footer from "../General/footer";
import Header from "../General/header";

import { supabase } from "../../lib/supabase"; // Adjust path to your file
import { Alert, ActivityIndicator } from "react-native";
import { decode } from "base64-arraybuffer";

import { Ionicons } from "@expo/vector-icons"; // <--- Add this

import * as FileSystem from "expo-file-system/legacy";
import { File, Directory, Paths } from "expo-file-system";

type AnalysisResultProps = {
  imageUri: string; // The Base64 image from the server
  label: string[]; // e.g., "Cup"
  color: string; // e.g., "Red"
  location: string;
  descriptionGemini: string;
  isSensitive: boolean;
  onScanAgain: () => void; // Function to go back to camera
};

export function AnalysisResult({
  imageUri,
  label,
  color,
  location,
  descriptionGemini,
  isSensitive,
  onScanAgain,
}: AnalysisResultProps) {
  // 1. STATE: Create a local copy of labels so we can edit them
  // 1. Use [...Spread] to combine the array and the string
  const [editableTags, setEditableTags] = useState<string[]>(
    [
      ...(label || []), // Unpack the existing label array (handle if it's null)
      color, // Add the color at the end
    ].filter((tag) => tag && tag !== "Unknown")
  ); // Optional: Filter out empty or "Unknown" colors
  const [modalVisible, setModalVisible] = useState(false);
  const [newTagText, setNewTagText] = useState("");

  const validTags = [...editableTags, location].filter(
    (tag) => tag && tag.trim().length > 0
  );

  const [description, setDescription] = useState(descriptionGemini || "");

  let currentDate = new Date();
  console.log(currentDate.toLocaleDateString()); // prints date in the format: "MM/DD/YYYY"
  console.log(currentDate.toLocaleTimeString()); // prints time in the format: "HH:MM:SS AM/PM"

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSavePost = async () => {
    // Check if we have an image
    if (!imageUri) return;
    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No user logged in");

      const fileName = `${Date.now()}.jpg`;
      const filePath = `${session.user.id}/${fileName}`;

      let arrayBuffer; // We will convert everything to this format

      if (imageUri.startsWith("file://")) {
        // SCENARIO A: Local File (Camera/Gallery)
        // FIX: Don't use fetch(). Read it directly from the disk.
        console.log("Reading local file...");
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: "base64",
        });
        arrayBuffer = decode(base64);
      } else if (imageUri.startsWith("http")) {
        // SCENARIO B: Remote URL (Rare, but possible)
        const response = await fetch(imageUri);
        const blob = await response.blob();
        // Convert Blob -> ArrayBuffer for safe uploading
        arrayBuffer = await new Response(blob).arrayBuffer();
      } else {
        // SCENARIO C: Raw Base64 String (From AI)
        const base64Str = imageUri.includes("base64,")
          ? imageUri.split("base64,")[1]
          : imageUri;
        arrayBuffer = decode(base64Str);
      }

      console.log("Uploading file size:", arrayBuffer.byteLength);

      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, arrayBuffer, {
          // Pass the ArrayBuffer here
          contentType: "image/jpeg",
          upsert: false,
        });

      // --- FIX ENDS HERE ---

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      // Insert into Database
      const { error: dbError } = await supabase.from("posts").insert({
        user_id: session.user.id,
        post_image: urlData.publicUrl,
        missing_location: location,
        tags: editableTags,
        description: description,
        found_date: new Date().toISOString(),
        status: "lost",
        sensitive: isSensitive,
      });

      if (dbError) throw dbError;

      Alert.alert("Success!", "Item posted successfully.");
      onScanAgain();
    } catch (error) {
      console.log("FULL ERROR:", error); // Check your terminal
      if ((error as Error).message.includes("row-level security")) {
        Alert.alert(
          "Permission Denied",
          "Security Policy blocked this action."
        );
      } else {
        Alert.alert("Upload Failed", (error as Error).message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- TAG FUNCTIONS ---
  const handleAddTag = () => {
    if (newTagText.trim().length > 0) {
      setEditableTags([...editableTags, newTagText.trim()]);
      setNewTagText(""); // Clear input
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setEditableTags(editableTags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <Header
          title="Create Post"
          subtitle="Help the item find back their own parent"
        ></Header>

        {/* The Annotated Image from Server */}
        <View style={styles.imageCard}>
          {/* Layer A: Blurred Background (Fills the empty space) */}
          <Image
            source={{ uri: imageUri }}
            style={[StyleSheet.absoluteFill, styles.imageBackground]}
            blurRadius={30} // Makes it blurry
            resizeMode="cover"
          />

          {/* Layer B: Dark Overlay (Makes the main image pop) */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.2)" },
            ]}
          />

          {/* Layer C: The Main Sharp Image */}
          <Image
            source={{ uri: imageUri }}
            style={styles.resultImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.tagsWrapper}>
          <Text style={styles.tag}>Tag:</Text>
          {validTags.map((tag, index) => (
            <View key={index} style={styles.tagBadge}>
              <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        <ButtonOrange
          onPress={() => setModalVisible(true)}
          title="Edit tag"
          variant="primary"
          style={styles.editButton}
        />

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Manage Tags</Text>

              {/* List of current tags */}
              <View style={styles.modalTagWrapper}>
                {editableTags.map((tag, index) => (
                  <View key={index} style={styles.modalTag}>
                    <Text style={styles.modalTagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTag(index)}>
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={Colors.light.purple}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
                {editableTags.length === 0 && (
                  <Text style={{ color: "#999" }}>No tags yet.</Text>
                )}
              </View>

              {/* Input to add new tag */}
              <View style={styles.addTagRow}>
                <TextInput
                  style={styles.addTagInput}
                  placeholder="Add new tag..."
                  value={newTagText}
                  onChangeText={setNewTagText}
                />
                <TouchableOpacity
                  onPress={handleAddTag}
                  style={styles.addTagBtn}
                >
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <ButtonOrange
                title="Done"
                onPress={() => setModalVisible(false)}
                variant="primary"
                style={{ alignSelf: "center", marginTop: 20, width: "100%" }}
              />
            </View>
          </View>
        </Modal>

        <View style={styles.descriptionBox}>
          <TextInput
            style={styles.inputDescriptionBox}
            placeholder="Enter the description here..."
            onChangeText={(newText) => setDescription(newText)}
            value={description}
            multiline={true} // ✅ Allow multiple lines
            textAlignVertical="top"
          />
        </View>

        <View style={styles.bottomButton}>
          {/* 3. Action Button */}

          <ButtonOrange
            onPress={handleSavePost}
            title="Submit"
            variant="secondary"
            style={styles.submitButton}
          />
        </View>
        <Footer />
      </ScrollView>

      <View style={styles.fixedFooter}>
        <BackButton onPress={onScanAgain} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.light.white, // Move background color here
  },

  // 1. Applied to style={styles.container}
  container: {
    flex: 1, // Fills the entire screen height
    backgroundColor: Colors.light.white,
  },

  // 2. Applied to contentContainerStyle={styles.scrollContent}
  scrollContent: {
    flexGrow: 1, // Ensures content stretches if it's short
    alignItems: "center", // Centers items horizontally
    justifyContent: "space-between", // Pushes content apart
    paddingBottom: 40, // Adds space at the very bottom
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    width: "100%",
    alignItems: "center",
    backgroundColor: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  // Replaces 'imageContainer'
  imageCard: {
    width: "90%", // Match the width of your text box/tags
    height: 350, // Taller height for better visibility
    borderRadius: 20, // Smooth corners
    overflow: "hidden", // Clips the blurred background
    marginTop: 20,
    marginBottom: 20,

    // Add a nice shadow to lift it off the page
    backgroundColor: "#fff", // Fallback color
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,

    // Optional: A subtle border to match your tags
    borderWidth: 1,
    borderColor: "#eee",
    position: "relative", // Needed for absolute positioning children
  },
  // The blurred background image style
  imageBackground: {
    opacity: 0.8, // Slightly transparent
  },
  resultImage: {
    width: "100%", // Fill the width
    height: "100%", // <--- SET A FIXED HEIGHT (Adjust this number as needed)
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
    gap: 12, // Slightly more space between tags
    justifyContent: "flex-start", // Align to left
    width: "90%", // Match width of other elements
    backgroundColor: Colors.light.fakeWhite,
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  tagBadge: {
    flexDirection: "row", // Align icon and text horizontally
    alignItems: "center",
    backgroundColor: Colors.light.yellow,
    paddingVertical: 10, // More breathing room
    paddingHorizontal: 18, // Wider pill shape
    borderRadius: 30, // Softer, rounder corners

    borderWidth: 1,
    borderBottomWidth: 4, // Thicker bottom creates the "depth" effect
    borderColor: Colors.light.purple, // Theme color for the edge
  },
  tagText: {
    color: Colors.light.purple, // Your theme green (or white)
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 8, // Space between icon and text
  },
  locationText: {
    color: "#AAA", // Lighter grey for secondary info
    fontSize: 14,
    fontWeight: "500",
  },
  descriptionBox: {
    // --- ANDROID ---
    elevation: 20,
    // Android API 28+ can use shadowColor, but usually needs full opacity
    // because elevation calculates its own transparency.
    shadowColor: "#110C2E",

    // --- IOS (REQUIRED PROPS) ---
    shadowOffset: { width: 0, height: 10 }, // How far down the shadow pushes
    shadowOpacity: 0.15, // <--- Put the 0.15 alpha HERE
    shadowRadius: 20, // How blurry the shadow is

    // Optional: Background color is usually needed for shadow to show
    backgroundColor: "white",

    width: "85%",
    minHeight: 100,

    marginVertical: 20,
    borderRadius: 10,
  },
  inputDescriptionBox: {
    minHeight: 120, // ✅ Allows vertical expansion
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,

    textAlignVertical: "top", // ✅ VERY IMPORTANT for Android
  },
  editButton: {
    alignSelf: "flex-end",
    marginRight: "6%",
    borderWidth: 0,
  },
  submitButton: {
    alignSelf: "flex-end",
    width: "40%",
    minHeight: 50,
    fontSize: 16,
  },
  bottomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  scanBtn: {
    backgroundColor: Colors.light.yellow,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.light.purple,
    justifyContent: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    width: "40%",
    height: 50,
    fontSize: 30,
    marginVertical: 15,
  },
  btnText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
    alignSelf: "center",
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
    backgroundColor: "rgba(0,0,0,0.5)", // Dim background
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  modalTagWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  modalTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.yellow,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalTagText: {
    fontWeight: "600",
    color: "#333",
    fontSize: 14,
  },
  addTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addTagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f9f9f9",
  },
  addTagBtn: {
    backgroundColor: Colors.light.purple,
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
