import React, { useState } from 'react';
import { 
  Alert, 
  StyleSheet, 
  View, 
  AppState, 
  TextInput, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Image
} from 'react-native';
import { supabase } from '../lib/supabase'; // Make sure this path points to your file

// Tell Supabase to stop auto-refreshing if the app is closed
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function AuthScreen() {
  // State variables
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // Needed for the Profile trigger
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Sign Up

  // 1. Validation Logic
  const validateInputs = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }
    
    // USM Email Check
    const lowerEmail = email.toLowerCase();
    if (!isLogin && !lowerEmail.endsWith('@student.usm.my')) {
      Alert.alert('Restricted Access', 'Only USM students (@student.usm.my) can register.');
      return false;
    }
    return true;
  };

  // 2. Login Function
  async function signInWithEmail() {
    if (!validateInputs()) return;
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Login Failed', error.message);
    setLoading(false);
  }

  // 3. Sign Up Function
  async function signUpWithEmail() {
    if (!validateInputs()) return;
    if (!fullName) {
       Alert.alert('Error', 'Please enter your full name');
       return;
    }

    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName, // This gets sent to your 'profiles' table via the SQL trigger!
        },
      },
    });

    if (error) {
      Alert.alert('Registration Error', error.message);
    } else if (!data.session) {
      Alert.alert('Verification Sent', 'Please check your USM email to confirm your account.');
    }
    
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>USM Lost & Found</Text>
        <Text style={styles.subtitle}>{isLogin ? 'Welcome Back' : 'Student Registration'}</Text>
      </View>

      {/* Form Section */}
      <View style={styles.form}>
        
        {/* Only show Name field if Registering */}
        {!isLogin && (
          <TextInput
            style={styles.input}
            onChangeText={setFullName}
            value={fullName}
            placeholder="Full Name (e.g. Ali bin Abu)"
            placeholderTextColor="#888"
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          placeholder="USM Email (@student.usm.my)"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          onChangeText={setPassword}
          value={password}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry={true}
          autoCapitalize="none"
        />

        {/* Action Button */}
        <TouchableOpacity 
          style={styles.button} 
          onPress={isLogin ? signInWithEmail : signUpWithEmail}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
          )}
        </TouchableOpacity>

        {/* Toggle Switch */}
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchContainer}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Text style={styles.switchBold}>{isLogin ? 'Sign Up' : 'Log In'}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#F5F7FB', // Light grey background
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4B2C85', // USM Purple-ish
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#E67E22', // USM Orange-ish
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#666',
    fontSize: 16,
  },
  switchBold: {
    color: '#4B2C85',
    fontWeight: 'bold',
  },
});