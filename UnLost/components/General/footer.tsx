import React from 'react';
import { View, StyleSheet } from 'react-native'

export default function Footer() {
  return (
    <View style={styles.container}></View>
  );
}

const styles = StyleSheet.create ({
  container: {
    minHeight: 60,
    backgroundColor: 'transparent',
  }
});