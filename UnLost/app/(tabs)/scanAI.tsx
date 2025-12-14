import React, { useState, useRef, useEffect } from "react";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from 'expo-router';
import * as Location from 'expo-location';
import { Colors } from '../../constants/theme';
import { useKeepAwake } from 'expo-keep-awake'; 
import Constants from "expo-constants";

// ⚠️ Ensure this path matches where you put the AnalysisResult file
import { AnalysisResult } from "@/components/scannerPage/AnalysisResult";

export default function ScanAI() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // --- Parent State ---
  const [loading, setLoading] = useState(false);
  
  // FIX 1: Defined strict types for state (image cannot be null inside the result object)
  const [result, setResult] = useState<{
    image: string;
    label: string;
    color: string;
    location: string;
    description: string;
  } | null>(null);

  const [isSensitive, setIsSensitive] = useState(false);

  const navigation = useNavigation(); // <--- 2. Get navigation

  // ⚠️ IMPORTANT: Replace with your actual computer IP.
  // const API_URL = "http://10.212.149.206:8000/detect";
  // const GEMINI = "http://10.212.149.206:8000/analyze";

  // 2. Add this hook at the top of your component
  // This tells the app: "I will handle the screen power, don't worry about it."
  useKeepAwake(); 

  // --- DYNAMIC IP CONFIGURATION ---
  const getBackendURL = () => {
    // Get the IP of the machine running Expo (your laptop)
    const debuggerHost = Constants.expoConfig?.hostUri;
    const localhost = "10.0.2.2"; // Special IP for Android Emulator

    if (debuggerHost) {
      // debuggerHost looks like "192.168.0.105:8081"
      // We split it to get just the IP "192.168.0.105"
      const ip = debuggerHost.split(":")[0];
      return `http://${ip}:8000`; // Return your Python Port
    }

    // Fallback for Android Emulator or valid production builds
    return `http://${localhost}:8000`;
  };

  const BASE_URL = getBackendURL();

  // Now use BASE_URL for your endpoints
  const API_URL = `${BASE_URL}/detect`;
  const GEMINI  = `${BASE_URL}/analyze`;
  const CLIENT_ID = "user_device_01";

  // Optional: Log it so you can see what IP it found
  console.log("🔗 Connected to Backend at:", BASE_URL);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // This is for hiding the navigation bar
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: {
        display: result ? "none" : "flex",
      },
    });
  }, [result, navigation]);

  const getPreciseLocation = async () => {
    try {
      // 1. Request Permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return "Permission denied";

      // 2. Get GPS Coordinates with HIGHEST Accuracy
      // 'Highest' uses satellites. It is slower (takes 1-2s) but much more precise.
      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest, 
      });

      // 3. Reverse Geocode
      let addressList = await Location.reverseGeocodeAsync(loc.coords);

      if (addressList.length > 0) {
        const place = addressList[0];
        
        // LOGIC: Hunt for the Building Name
        // On Android/iOS, 'name' is often the building (e.g., "USM Library")
        // 'street' is usually the road (e.g., "Jalan Universiti")
        
        let mainLocation = "";
        let subLocation = place.street || place.district || "";

        // Check if 'name' exists and is NOT just a street number (like "11800")
        if (place.name && place.name !== place.street && isNaN(Number(place.name))) {
          mainLocation = place.name; // Use the building name
        } else {
          mainLocation = place.street || place.city || "Unknown Place";
        }

        // Format: "USM Library, Gelugor"
        // If the main and sub are the same, just show one.
        if (mainLocation === subLocation) {
          return `${mainLocation}, ${place.region || place.city}`;
        }
        
        return `${mainLocation}, ${place.city || place.region}`;
      }
    } catch (error) {
      console.log("GPS Error:", error);
    }
    return "Unknown Location";
  };

  // --- Logic: Take Picture ---
  const handleCapture = async () => {
    if (cameraRef.current && !loading) {
      setLoading(true);
      try {
        const photoPromise = await cameraRef.current.takePictureAsync({
          base64: false,
          quality: 0.8,
        });

        // Start GPS (Run in parallel!)
        const locationPromise = getPreciseLocation();

        // 3. Wait for both
        const [photo, locationString] = await Promise.all([photoPromise, locationPromise]);

        if (photo?.uri) {
          await sendToBackend(photo.uri, locationString || "Unknown");
        }
      } catch (e) {
        Alert.alert("Error", "Could not capture data.");
        setLoading(false);
      }
    }
  };

  // --- Logic: Send to API ---
  const sendToBackend = async (uri: string, locString: string) => {
    const formData1 = new FormData();
    // @ts-ignore
    formData1.append("file", {
      uri: uri,
      type: "image/jpeg",
      name: "capture.jpg",
    });
    formData1.append("client_id", CLIENT_ID);

    try {
      console.log("Step 1: Detecting Object...");
      
      // --- CALL 1: DETECTION (Fast) ---
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData1,
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = await response.json();

      // 🛑 STOP HERE if no object is found // Correct here
      // if (!data.found) {
      //   Alert.alert("No Object Found", "The AI didn't see an item. Try moving closer.");
      //   setLoading(false);
      //   return; // Don't run the next code
      // }
      
      if (!data.found) {
        Alert.alert("No Object Found", "The Machine Learning Model didn't see an item. Sending to Gemini model for fallback analysis and tagging.");
      }
      else {
        console.log("Object found! Sending to Gemini for image anaysis")
      }

      console.log("Step 2: Analyzing with Gemini...");

      const formData2 = new FormData();
    // @ts-ignore
      formData2.append("file", {
        uri: uri,
        type: "image/jpeg",
        name: "capture.jpg",
      });

      // --- CALL 2: ANALYSIS (Slow) ---
      // Only runs if Call 1 succeeded
      const responseGemini = await fetch(GEMINI, {
        method: "POST",
        body: formData2,
        headers: { "Content-Type": "multipart/form-data" },
      });
      const dataGemini = await responseGemini.json();

      if ((dataGemini.data.sensitive).toLowerCase() == 'sensitive') {
        Alert.alert("The image contain sensitive information");
        setIsSensitive(true);
      }

      if (data.found) {
        // --- COMBINE RESULTS ---
        setResult({
          // Data from Call 1 (YOLO/OpenCV)
          image: `data:image/jpeg;base64,${data.image_base64}`,
          label: data.label ?? "Unknown",
          color: data.color ?? "Unknown",
          
          // Data from Local GPS
          location: locString,
          
          // Data from Call 2 (Gemini)
          // If Gemini fails for some reason, fallback to a default string
          description: dataGemini.success ? dataGemini.data.description : "Analysis unavailable.",
        });
      }
      else if (!data.found && dataGemini.success) {
        setResult({
          // Data from Call 1 (YOLO/OpenCV)
          image: uri,
          label: dataGemini.success 
          ? (dataGemini.data.tags || ["Unknown"]) // Get the full list from Gemini
          : [data.label || "Unknown"],            // Wrap YOLO result in an array
          color: dataGemini.data.color ?? "Unknown",
          
          // Data from Local GPS
          location: locString,
          
          // Data from Call 2 (Gemini)
          // If Gemini fails for some reason, fallback to a default string
          description: dataGemini.success ? dataGemini.data.description : "Analysis unavailable.",
        });
      }
      else {
        Alert.alert("No Object Found!");
        setLoading(false);
        return; // Don't run the next code
      }

      console.log("Data from Gemini:", dataGemini.success, dataGemini.data);

    } catch (error) {
      Alert.alert("Connection Error", "Check your backend connection.");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---
  if (!permission) return <View style={styles.blackBg} />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <ThemedText>Camera permission is required.</ThemedText>
        <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
          <Text style={styles.btnTextBlack}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 1. If we have a result, show the Child Component
  if (result) {
    return (
      <AnalysisResult
        // FIX 3: TypeScript Safety Check (?? "")
        imageUri={result.image ?? ""}
        label={Array.isArray(result.label) ? result.label : [result.label]}
        color={result.color}
        location={result.location}
        descriptionGemini={result.description}
        isSensitive={isSensitive}
        onScanAgain={() => setResult(null)}
      />
    );
  }

  // 2. Otherwise, show the Camera
  return (
    <View style={styles.container}>
      
      {/* 1. Nice Header Area */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>AI Object Scan</Text>
        <Text style={styles.headerSubtitle}>
          Center the item within the frame to detect
        </Text>
      </View>

      <Text style={styles.hintText}>{loading ? "Hold still..." : "Ready to scan"}</Text>

      {/* 2. The Camera "Card" with Rounded Corners */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill} // Fills the container
          facing="back"
        />
        
        {/* 3. The Visual "Corners" to look cool */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />

        {/* Loading Overlay inside the camera frame */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#00FF9D" />
            <Text style={styles.loadingText}>Analyzing...</Text>
          </View>
        )}
      </View>

      {/* 4. Bottom Controls */}
      <View style={styles.bottomControls}>        
        <TouchableOpacity 
          onPress={handleCapture} 
          disabled={loading}
          style={[styles.captureBtn, loading && styles.captureBtnDisabled]}
        >
          <View style={styles.captureBtnInner} />
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  // --- Layout ---
  container: {
    flex: 1,
    backgroundColor: "#000000ff", // Slightly lighter than pure black looks more premium
    alignItems: "center",
    justifyContent: "space-between", // Pushes header up and button down
    paddingVertical: 60,
  },
  
  // --- Header ---
  headerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: "#AAAAAA",
    fontSize: 14,
    marginTop: 8,
  },

  // --- Camera Frame ---
  cameraContainer: {
    width: 320,  // Fixed width
    height: 420, // Fixed height (Portrait aspect ratio)
    borderRadius: 30, // High curvature for modern look
    overflow: 'hidden', // CLIPS the camera to the rounded corners
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', // Subtle border
    position: 'relative',
  },
  
  // --- Corner Markers (The "Scanner" look) ---
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: Colors.light.yellow, // Your theme color
    borderWidth: 4,
  },
  topLeft: { top: 20, left: 20, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 20, right: 20, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 20, left: 20, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 20, right: 20, borderLeftWidth: 0, borderTopWidth: 0 },

  // --- Loading ---
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)", // Semi-transparent dark
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  loadingText: {
    color: Colors.light.purple,
    marginTop: 15,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },

  // --- Bottom Controls ---
  bottomControls: {
    alignItems: "center",
    gap: 20,
  },
  hintText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginBottom: 10,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "white",
    marginBottom: '15%',
    marginTop: '5%',
    
    // Glow Effect (iOS/Android)
    shadowColor: Colors.light.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  captureBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "white",
  },

  // --- Permissions ---
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  blackBg: { flex: 1, backgroundColor: "black" },
  permBtn: {
    marginTop: 20,
    backgroundColor: "#00FF9D",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  btnTextBlack: {
    color: "black",
    fontWeight: "bold",
  },
});