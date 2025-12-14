import React from 'react';
import { Text, View, StyleSheet } from 'react-native'

type WelcomePerson = {
  name: string;
}

export default function Welcome({name}: WelcomePerson) {
  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Hi! welcome,</Text>
      <Text style={styles.user}>{name}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    top: '7%',
    left: '8%',
  },
  welcome: {
    fontSize: 28,
  },
  user: {
    fontSize: 22,
  },
})