import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle 
} from 'react-native';

import { Colors } from '../../constants/theme'; 

// 1. Define what data this button needs
type ThemedButtonProps = {
  title: string;            // The text inside
  onPress?: () => void;      // <--- THE FUNCTION (Logic)
  loading?: boolean;        // Should it show a spinner?
  disabled?: boolean;       // Is it clickable?
  style?: ViewStyle;        // Optional: Override container style
  textStyle?: TextStyle;    // Optional: Override text style
  variant?: 'primary' | 'secondary'; // Different looks
};

export function ButtonOrange ({ 
  title, 
  onPress, 
  loading = false, 
  disabled = false, 
  style,
  textStyle,  // ← Add this parameter
  variant = 'primary' 
}: ThemedButtonProps) {

  // Logic to handle disabled state
  const isEnabled = !loading && !disabled;

  return (
    <TouchableOpacity
      onPress={isEnabled ? onPress : undefined} // Only run function if enabled
      activeOpacity={0.7}
      style={[
        styles.base, 
        variant === 'primary' ? styles.primary : styles.secondary,
        !isEnabled && styles.disabled, // Apply disabled style if needed
        style // Apply custom style last
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'black' : 'white'} />
      ) : (
        <Text style={[
          styles.textBase, 
          variant === 'primary' ? styles.textPrimary : styles.textSecondary,
          textStyle  // ← Add this line to apply custom text styles
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginLeft: '5%',
    borderRadius: 7,
    alignItems: 'center',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'row',
    width: 80,
    height: 30,
    fontSize: 30,
    marginVertical: 15,
  },
  // Style 1: The Glow Button (Like your 'Scan')
  primary: {
    backgroundColor: Colors.light.orange,
    borderWidth: 1,
    borderColor: 'black',
  },
  // Style 2: The Dark Button (Like your 'Scan Again')
  secondary: {
    backgroundColor: Colors.light.purple,
    borderWidth: 1,
    borderColor: 'black',
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  textPrimary: {
    color: 'black',
  },
  textSecondary: {
    color: 'white',
    fontSize: 20,
  },
});