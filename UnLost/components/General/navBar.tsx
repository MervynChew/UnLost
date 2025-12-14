import React from 'react';
import { useState, useEffect } from 'react';

import { View, LayoutChangeEvent, StyleSheet, TouchableOpacity} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  withSequence, 
  withTiming, 
  withDelay 
} from 'react-native-reanimated';

import { Colors } from '../../constants/theme';

import { Platform } from 'react-native';

export default function CustomTaskBar({ state, descriptors, navigation }: any) {
  const translateX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const [tabWidth, setTabWidth] = useState(0);

    const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setTabWidth(width / state.routes.length);
    translateX.value = (width / state.routes.length) * state.index;
  };

  useEffect(() => {
    if (tabWidth > 0) {
      const targetX = state.index * tabWidth;
      const standardWidth = tabWidth - 20;
      const squeezedWidth = standardWidth * 0.4; // Shrink to 40% size

      // --- THE SQUEEZE ANIMATION ---
      
      // 1. Animate Position (Move to new tab)
      translateX.value = withSpring(targetX, {
        damping: 18,    // Enough friction to stop perfectly without oscillating
        stiffness: 200, // Fast enough to feel responsive, but not "twitchy"
        mass: 1,
      });

      // 2. Animate Width (Shrink -> Wait -> Expand)
      indicatorWidth.value = withSequence(
        // Step A: Squeeze fast (100ms)
        withTiming(squeezedWidth, { duration: 100 }), 
        
        // Step B: Expand back to normal (The "Apple Pop")
        withSpring(standardWidth, {
          damping: 18,    // Slightly lower damping here lets it "breathe" just a tiny bit as it expands
          stiffness: 150, // Softer spring makes the expansion feel organic, not robotic
          mass: 1,
        })
      );
    }
  }, [state.index, tabWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    // Math to keep the indicator centered while it shrinks:
    // We calculate how much smaller we are compared to the full size
    const standardWidth = tabWidth - 20;
    const widthDifference = standardWidth - indicatorWidth.value;
    
    // We shift position by half that difference to stay centered
    const centerCorrection = widthDifference / 2;

    return {
      // Apply the position + the correction
      transform: [{ translateX: translateX.value + centerCorrection }],
      width: indicatorWidth.value,
    };
  });

  // Here is to hide the navigation bar when not needed
  // --- NEW LOGIC START ---
  // 1. Check the options of the currently active screen
  const focusedRoute = state.routes[state.index];
  const { options } = descriptors[focusedRoute.key];

  // 2. If the screen has set "display: none", do not render the bar at all
  if (options.tabBarStyle?.display === 'none') {
    return null;
  }
  // --- NEW LOGIC END ---

  return (
    <View style={styles.tabBarContainer}>
      <BlurView intensity={60}
      tint={Platform.OS === 'ios' ? 'extraLight' : 'light'} 
      style={styles.blurContainer} onLayout={onLayout}>
        <Animated.View style={[styles.activeIndicator, animatedIndicatorStyle]} />
        <View style={styles.tabsRow}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const Icon = options.tabBarIcon; 

            return (
              <View key={route.key} style={styles.tabItemContainer}>
                <TouchableOpacity 
                  onPress={onPress} 
                  activeOpacity={0.7}
                  style={styles.tabItem}
                >
                  {Icon && (
                    <Icon 
                      // Pass the correct color based on focus state
                      color={isFocused ? Colors.glass.activeIcon : Colors.glass.inactiveIcon} 
                      size={28} // Slightly larger for better touch target
                      colorBackground={isFocused ? Colors.glass.activeBackground : Colors.glass.white}
                    />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 30,
    height: 70,
    width: '70%',
    borderRadius: 35,
    alignSelf: 'center',
    justifyContent: 'center',
    
    // --- KEY CHANGE 1: CLIP THE CONTENT ---
    overflow: 'hidden', 

    // --- KEY CHANGE 2: SEMI-TRANSPARENT BACKGROUND ---
    // This matches your back button exactly
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 

    // --- BORDER ON PARENT ONLY ---
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)', // Slightly lighter border for glass effect

    // --- SHADOWS ---
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  blurContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    
    // --- KEY CHANGE 3: TRANSPARENT ---
    // Remove backgroundColor here! The blur needs to see through to the map/content.
    backgroundColor: 'transparent', 
    
    // Remove borders here (handled by parent now)
    borderRadius: 35,
  },
  tabsRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabItemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    height: 50,
    
    borderRadius: 25,
    marginLeft: 10,
    borderColor: 'rgba(205, 189, 209, 0.5)', 
    borderWidth: 1, 

    backgroundColor: 'rgba(93, 1, 107, 0.1)',
  },
});

