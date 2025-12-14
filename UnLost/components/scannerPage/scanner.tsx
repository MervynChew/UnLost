import React, { useEffect, useRef } from 'react';
import { StyleSheet, Platform, Animated, Easing } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

type ScannerOverlayProps = {
  status?: string;   // The text from backend (e.g. "LOCKED: CUP")
  isLocked?: boolean; // Changes color from Green to Red/Orange
};

export function ScannerOverlay({ status = "AI OBJECT SCAN", isLocked = false }: ScannerOverlayProps) {
  // Change color based on lock status
  const themeColor = isLocked ? '#FF3B30' : '#00FF9D'; // Red if locked, Green if scanning
  
  // 1. Setup Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 2. Run the Laser Scan Loop (Always runs unless locked)
  useEffect(() => {
    if (!isLocked) {
      const startScanning = () => {
        scanLineAnim.setValue(0);
        Animated.loop(
          Animated.sequence([
            Animated.timing(scanLineAnim, {
              toValue: 1,
              duration: 2000, // 2 seconds down
              easing: Easing.linear,
              useNativeDriver: true, // Smoother animation on phone GPU
            }),
            Animated.timing(scanLineAnim, {
              toValue: 0,
              duration: 2000, // 2 seconds up
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      startScanning();
    } else {
      // If locked, stop the line at the center (or hide it) and pulse the target
      scanLineAnim.setValue(0.5); 
    }
  }, [isLocked]);

  // 3. Run Pulse Animation (Only when locked)
  useEffect(() => {
    if (isLocked) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2, // Scale up
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1, // Scale down
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1); // Reset scale
    }
  }, [isLocked]);

  // Interpolate 0-1 value to screen percentage for the laser line
  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150], // Moves 150px up and down from center
  });

  return (
    <ThemedView style={styles.container}>
      
      {/* 4. The Reticle Corners (The "Scope" effect) */}
      <ThemedView style={[styles.corner, styles.topLeft, { borderColor: themeColor }]} />
      <ThemedView style={[styles.corner, styles.topRight, { borderColor: themeColor }]} />
      <ThemedView style={[styles.corner, styles.bottomLeft, { borderColor: themeColor }]} />
      <ThemedView style={[styles.corner, styles.bottomRight, { borderColor: themeColor }]} />

      {/* 5. Center Target Icon (Animated) */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <IconSymbol
          size={60}
          color={themeColor}
          name="qrcode.viewfinder"
          style={styles.targetIcon}
        />
      </Animated.View>

      {/* 6. The Animated Laser Line */}
      {!isLocked && (
        <Animated.View 
          style={[
            styles.scanLine, 
            { 
              backgroundColor: themeColor, 
              shadowColor: themeColor,
              transform: [{ translateY }] 
            }
          ]} 
        />
      )}

      {/* 7. Status Label (The Predicted Output) */}
      <ThemedView style={[styles.statusTag, { backgroundColor: themeColor }]}>
        <ThemedText style={styles.statusText}>{status}</ThemedText>
      </ThemedView>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject, // Fill the whole screen
    backgroundColor: 'transparent', // IMPORTANT: Must be transparent to see camera!
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10, // Ensure it sits ON TOP of the camera
  },

  // --- The Laser Line ---
  scanLine: {
    position: 'absolute',
    width: '80%', // Not full width, looks more like a scanner
    height: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  // --- Central Icon ---
  targetIcon: {
    opacity: 0.9,
  },
  // --- Corners ---
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
    borderRadius: 4,
  },
  topLeft: { top: '35%', left: '15%', borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: '35%', right: '15%', borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: '35%', left: '15%', borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: '35%', right: '15%', borderLeftWidth: 0, borderTopWidth: 0 },
  
  // --- Text Label ---
  statusTag: {
    position: 'absolute',
    bottom: 100, // Safe distance from bottom
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusText: {
    color: '#000', // Black text on colored background for contrast
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    textTransform: 'uppercase',
  },
});