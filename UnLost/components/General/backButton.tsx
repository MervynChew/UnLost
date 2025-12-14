import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform, ViewStyle, StyleProp } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons'; 

type GlassBackProps = {
  onPress?: () => void; 
};

export default function backButton({ onPress }: GlassBackProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress(); 
    } else {
      router.back(); 
    }
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      activeOpacity={0.7}
      style={styles.container}
    >
      <BlurView 
        intensity={40} 
        tint="light" 
        style={styles.blurContent}
      >
        <Ionicons 
          name="chevron-back" 
          size={28} 
          color="#111" 
          style={styles.iconFix}
        />
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 50,  // Slightly larger for premium feel
    height: 50,
    borderRadius: 25,
    overflow: 'hidden', // Clips the glass effect perfectly
    
    // --- POSITIONING (Kept as is) ---
    position: 'absolute',
    bottom: 100, 
    alignSelf: 'center', 
    
    // --- STYLE FIXES ---
    // 1. We put the background & border on the PARENT to fix the "Octagon" glitch
    backgroundColor: 'rgba(255,255,255,0.6)', 
    borderWidth: 1.5,
    borderColor: '#FFFFFF',

    // 2. Premium Soft Shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  blurContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // 3. Removed inner border/backgrounds to keep it clean
    borderRadius: 50,
  },
  iconFix: {
    marginRight: 3, 
    marginTop: 1,
  },
});