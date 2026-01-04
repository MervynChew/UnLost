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
import { Ionicons } from '@expo/vector-icons';
import { Colors } from "../constants/theme";

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState(''); // Needed for the Profile trigger
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Sign Up
  const [showPassword, setShowPassword] = useState(false); // Toggle eye button
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Toggle eye button
  const passwordsDoNotMatch = !isLogin && confirmPassword.length > 0 && password !== confirmPassword;

  // 1. Validation Logic
  const validateInputs = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }

    if (!isLogin) {

      // Check Name
      if (!fullName.trim()) {
        Alert.alert('Error', 'Please enter your full name');
        return false;
      }
      // USM Email Check
      const lowerEmail = email.toLowerCase();
      if (!isLogin && !lowerEmail.endsWith('@student.usm.my')) {
        Alert.alert('Restricted Access', 'Only USM students (@student.usm.my) can register.');
        return false;
      }
      // Check Confirm Password empty
      if (!confirmPassword) {
        Alert.alert('Error', 'Please confirm your password');
        return false;
      }
      // Check Password Match
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return false;
      }

      // trong Password Constraints
      // Regex: At least 8 chars, 1 digit, 1 small letter, 1 capital letter, 1 special character
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
      
      if (!strongPasswordRegex.test(password)) {
        Alert.alert(
          'Weak Password', 
          'Password must be at least 8 characters long and include:\n• One Uppercase letter\n• One Lowercase letter\n• One Number\n• One Special Character (!@#$%^&*)'
        );
        return false;
      }
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
    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName.trim(), // This gets sent to your 'profiles' table via the SQL trigger!
        },                            // Trim excludes leading and ending whitespaces if any
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
        <Text style={styles.title}>UNLOST</Text>
        <Text style={styles.subtitle}>{isLogin ? 'USM LOST & FOUND SYSTEM' : 'STUDENT REGISTRATION'}</Text>
      </View>

      {/* Form Section */}
      <View style={styles.form}>
        
        {/* Only show Name field if Registering */}
        {!isLogin && (
          <View>
            <TextInput
              style={styles.input}
              onChangeText={setFullName}
              value={fullName}
              placeholder="Full Name (e.g Ali bin Abu)"
              placeholderTextColor="#888"
              autoCapitalize="words"
              maxLength={25}
            />
            {/* Character counter */}
            <Text style={{
              fontSize: 12,
              color: fullName.length > 25 ? '#E67E22' : '#888',
              alignSelf: 'flex-end',
              marginTop: -15,
              marginBottom: 3,
              marginRight: 5
            }}>
              {fullName.length}/25
            </Text>
          </View>
        )}

        {/* Email Field */}
        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          placeholder="USM Email (@student.usm.my)"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Password Field */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            onChangeText={setPassword}
            value={password}
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)} 
            style={styles.eyeButton}
          >
            {/* This icon changes based on the showPassword state */}
            <Ionicons 
              name={showPassword ? "eye" : "eye-off"} 
              size={26} 
              color="#4B2C85" 
            />
          </TouchableOpacity>
        </View>

        {/* Confirm Password Field */}
        {!isLogin && (
          <View>
            <View style={[
              styles.passwordContainer, 
              // Red Border if Mismatch
              passwordsDoNotMatch ? { borderColor: 'red', borderWidth: 1 } : {}
            ]}>
              <TextInput
                style={styles.passwordInput}
                onChangeText={setConfirmPassword}
                value={confirmPassword}
                placeholder="Confirm Password"
                placeholderTextColor="#888"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)} 
                style={styles.eyeButton}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye" : "eye-off"} 
                  size={24} 
                  color="#4B2C85" 
                />
              </TouchableOpacity>
            </View>

            {/* Red Error Text */}
            {passwordsDoNotMatch && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}
          </View>
        )}

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
    backgroundColor: '#fef7f7ff', // Light grey background
  },
  header: {
    marginBottom: 26,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'fantasy',
    fontSize: 55,
    fontWeight: 'bold',
    color: '#4B2C85', // USM Purple-ish
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  form: {
    backgroundColor: '#F5F7FB',
    marginHorizontal: 1,
    padding: 20,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#ffffffff', // Subtle yellow border
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 25,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.light.purple,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#E67E22', // USM Orange-ish
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#EA8F79',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.light.purple,
  },
  passwordInput: {
    flex: 1, 
    padding: 15,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 15,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 20, // Push the button down slightly
    marginTop: -13,   // Pull up closer to the input
    marginLeft: 5,
  }
});