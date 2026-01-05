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
  Platform, 
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { supabase } from '../lib/supabase'; // Make sure this path points to your file
import { Ionicons } from '@expo/vector-icons';
import { Colors } from "../constants/theme";
import Logo from "../components/General/Logo"

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

      // Strong Password Constraints
      // Regex: At least 8 chars, 1 digit, 1 small letter, 1 capital letter, 1 special character
      // If password lacks some requirement, alerts the user
      if (!isLogin && !hint.isStrong) {
        Alert.alert('Weak Password', hint.message);
        return false;
      }
    }
    return true;
  };

  // 2. Get Password Hint
  const getPasswordHint = () => {
    if (password.length === 0) return { message: '', color: '#888', icon: 'ellipse-outline', isStrong: false };
    
    if (password.length < 8) 
      return { message: "Must be at least 8 characters", color: '#E67E22', icon: 'alert-circle', isStrong: false };
    if (!/[A-Z]/.test(password)) 
      return { message: "Add an uppercase letter", color: '#E67E22', icon: 'alert-circle', isStrong: false };
    if (!/[a-z]/.test(password)) 
      return { message: "Add a lowercase letter", color: '#E67E22', icon: 'alert-circle', isStrong: false };
    if (!/\d/.test(password)) 
      return { message: "Include at least one digit", color: '#E67E22', icon: 'alert-circle', isStrong: false };
    if (!/[!@#$%^&*]/.test(password)) 
      return { message: "Add a special character (!@#$%^&*)", color: '#E67E22', icon: 'alert-circle', isStrong: false };
    
    return { message: "Password is secure!", color: '#27AE60', icon: 'checkmark-circle', isStrong: true };
  };
  const hint = getPasswordHint();

  // 3. Login Function
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

  // 4. Sign Up Function
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
    <View style={styles.mainContainer}>
    <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.scrollContainer}>
              {/* Header Section */}
              <Logo/>
            <View style={styles.header}>
                {/* <Text style={styles.title}>UNLOST</Text> */}
                <Text style={styles.subtitle}>{isLogin ? 'A USM lost & found system' : 'Student Registration'}</Text>
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
                {/* Password Requirement Hints */}
                {!isLogin && hint.message !== '' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -10, marginBottom: 12, paddingLeft: 10 }}>
                      <Ionicons name={hint.icon} size={16} color={hint.color} />
                      <Text style={{ marginLeft: 6, fontSize: 13, color: hint.color, fontWeight: '500' }}>
                        {hint.message}
                      </Text>
                    </View>
                )}

                {/* Confirm Password Field */}
                {!isLogin && (
                  <View>
                    <View style={[
                      styles.passwordContainer, 
                      // Red Border if Mismatch
                      passwordsDoNotMatch ? { borderColor: '#E67E22', borderWidth: 1 } : {}
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

                    {/* Error Text */}
                    {passwordsDoNotMatch && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#E67E22" />
                        <Text style={styles.errorText}>
                          Passwords do not match
                        </Text>
                      </View>
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
                    <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>
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
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  scrollContainer: {
    // flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fef7f7ff',
    minHeight: '100%', // Ensures it fills the screen on Android
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#fef7f7ff', // Added color to background outside scroll container when typing
  },
  header: {
    marginBottom: 26,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'fantasy',
    fontSize: 30,
    fontWeight: 'bold',
    color: '#4B2C85', // USM Purple-ish
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 12,
    paddingLeft: 10,
  },
  errorText: {
    color: '#E67E22',
    fontSize: 13,
    fontWeight: '500', // Same as password hint weight
    marginLeft: 6,      // Space between icon and text
  },
});