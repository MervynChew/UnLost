import { Image, StyleSheet } from 'react-native';

export default function Logo() {
  return (
    <Image 
      source={require('../../assets/image/SignIn/FullLogo_Transparent.png')} 
      style={styles.logo} 
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: '60%',       // Reduced width slightly to look more balanced
    aspectRatio: 1/2,  // Adjust this based on your actual logo file's shape
    alignSelf: 'center',
    marginTop: -450,      // Specific top margin instead of vertical
    marginBottom: -450,    // Remove bottom margin to pull the title closer
  },
});