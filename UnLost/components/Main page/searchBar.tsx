import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For the magnifying glass icon
import { Colors } from '../../constants/theme'; // Adjust your path

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void; // Optional: Run search when they hit "Enter" on keyboard
};

export default function SearchBar({ value, onChangeText, onSubmit }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search for lost items..."
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit} // "Enter" key
        returnKeyType="search"
      />
      <Ionicons name="search" size={20} color="#666" style={styles.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0', // Light grey background
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 6,
    marginHorizontal: 20, // Space from screen edges
    marginVertical: 40,
    
    // Shadow (Optional)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,

    height: 50,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1, // Takes remaining space
    fontSize: 16,
    color: '#000',
  },
});