import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Colors } from "../../constants/theme";

type WelcomePerson = {
  name: string;
}

export default function Welcome({name}: WelcomePerson) {
  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Hi! Welcome,</Text>
      <Text style={styles.user}>{name}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'center',
    width: '70%',
  },
  welcome: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.purple,
  },
  user: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.orange,
  },
})