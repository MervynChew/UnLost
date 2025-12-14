import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

type HeaderProps = {
  title: string;
  subtitle?: string; // Added optional subtitle for a "Pro" look
};

export default function Header({ title, subtitle }: HeaderProps ) {
  return (
    <View style={styles.container}>
      {/* 1. Title with subtle shadow */}
      <Text style={styles.titleText}>{title}</Text>
      
      {/* 2. Optional Subtitle (Great for UX) */}
      {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}

      {/* 3. The "Brand Pill" Accent (Short & Thick) */}
      <View style={styles.accentContainer}>
        <View style={styles.accentPill} />
        <View style={[styles.accentPill, styles.accentDot]} /> 
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 30, // More top spacing
    paddingBottom: 15,
    marginTop: '5%', // Adjusted safe area
  },
  titleText: {
    fontSize: 36, // Bigger
    fontWeight: '800',
    color: Colors.light.purple,
    letterSpacing: -1, // Tight tracking for modern feel
    
    // Subtle Text Shadow (Elevation for Text)
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitleText: {
    fontSize: 16,
    // color: '#888', // Subtle grey
    color: Colors.light.orange,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  
  // New Accent Style: A Line + A Dot
  accentContainer: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
    gap: 5, // Space between line and dot
  },
  accentPill: {
    height: 6,
    width: 40, // Short width looks cleaner
    borderRadius: 3,
    backgroundColor: Colors.light.purple,
  },
  accentDot: {
    width: 6, // Just a circle
    opacity: 0.5, // Faded for style
  }
});