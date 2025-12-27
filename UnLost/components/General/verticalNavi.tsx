import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons"; // Ensure you import Ionicons

type JumpMenuProps = {
  sections: string[];
  activeSection: string;
  onTabPress: (title: string) => void;
  opacity: any;
};

export default function JumpMenu({ sections, activeSection, onTabPress, opacity }: JumpMenuProps) {
  
  // 1. Create a Helper Function to pick the icon based on the title
  const getIconName = (title: string, isActive: boolean) => {
    switch (title) {
      case 'Posted by':
        return isActive ? 'person' : 'person-outline';
      case 'Tags':
        return isActive ? 'pricetags' : 'pricetags-outline';
      case 'Description':
        return isActive ? 'document-text' : 'document-text-outline';
      case 'Schedule':
        return isActive ? 'calendar' : 'calendar-outline';
      case 'Attendance Tracking':
        return isActive ? 'checkmark-done-circle' : 'checkmark-done-circle-outline';
      case 'Item Retrieval':
        return isActive ? 'ribbon' : 'ribbon-outline';
      case 'Claimed By':
        return isActive ? 'person' : 'person-outline';
      default:
        return 'help-circle-outline';
    }
  };

  return (
    <Animated.View style={[styles.outerWrapper, { opacity: opacity }]}>
      <View style={styles.glassContainer}>
        {sections.map((title: string) => {
          const isActive = activeSection === title;

          return (
            <TouchableOpacity 
              key={title} 
              onPress={() => onTabPress(title)}
              style={[styles.chip, isActive && styles.activeCircle]}
            >
              {/* 2. Replace the Text component with Ionicons */}
              <Ionicons 
                name={getIconName(title, isActive) as any} 
                size={22} 
                color={isActive ? "#000" : "#b8b2b2ff"} 
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    right: 15, // Reduced from 20 to keep it closer to edge
    top: '25%', // Adjusted to center vertically based on your content
    zIndex: 999,
    alignItems: 'center',
  },
  glassContainer: {
    backgroundColor: Colors.glass.backgroundColor, // Increased opacity for better icon visibility
    borderRadius: 40,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.4)',
    gap: 12,
    // Add a slight shadow to the container itself
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  chip: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  activeCircle: {
    backgroundColor: '#fff', // Solid white background for the active icon
    transform: [{ scale: 1.15 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
});