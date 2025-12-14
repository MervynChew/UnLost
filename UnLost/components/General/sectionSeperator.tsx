import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from "../../constants/theme"; // Import your colors

type subtitleProps = {
  title: string,
}

export default function SectionSeperator({title}: subtitleProps) {
  return(
    <View style={styles.container}>
      <Text style={styles.subtitle}>{title}</Text>
      {/* Optional: A small decorative line under the title */}
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginLeft: '6%', // Indent to align with your content cards
    marginTop: 25,    // Push it down from the previous section
    marginBottom: 20, // Give some space before the next content starts
    alignSelf: 'flex-start',
  },
  subtitle: {
    color: Colors.light.purple, // Using your theme's main dark color
    fontSize: 18,     // Slightly larger than body text
    fontWeight: '800', // Bold and heavy
    letterSpacing: 0.5,
    textTransform: 'uppercase', // Optional: Makes it look more like a "Header"
  },
  // Optional: A small accent line
  line: {
    marginTop: 4,
    height: 3,
    width: 25, // Short line
    backgroundColor: Colors.light.orange, // Your accent yellow
    borderRadius: 2,
  }
})