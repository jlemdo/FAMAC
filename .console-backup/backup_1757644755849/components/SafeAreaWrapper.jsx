import React from 'react';
import { View, Platform, Dimensions, StatusBar } from 'react-native';

// Función para obtener safe area superior
const getStatusBarHeight = () => {
  const { height } = Dimensions.get('window');
  
  if (Platform.OS === 'ios') {
    // iPhone X y modelos más nuevos
    if (height >= 812) {
      return 44;
    }
    // iPhone 6/7/8 Plus
    else if (height >= 736) {
      return 20;
    }
    // iPhone 6/7/8
    else if (height >= 667) {
      return 20;
    }
    // iPhone SE (1st gen) y más pequeños
    else {
      return 20;
    }
  }
  
  // Android
  return StatusBar.currentHeight || 24;
};

// Función para obtener safe area inferior
const getBottomSafeArea = () => {
  const { height } = Dimensions.get('window');
  
  if (Platform.OS === 'ios') {
    // iPhone X y modelos más nuevos (con home indicator)
    if (height >= 812) {
      return 34;
    }
    // Modelos más antiguos
    else {
      return 0;
    }
  }
  
  // Android
  return 0;
};

export const SafeAreaWrapper = ({ children, includeTop = false, includeBottom = false, style = {} }) => {
  const paddingTop = includeTop ? getStatusBarHeight() : 0;
  const paddingBottom = includeBottom ? getBottomSafeArea() : 0;

  return (
    <View style={[
      {
        flex: 1,
        paddingTop,
        paddingBottom,
      },
      style
    ]}>
      {children}
    </View>
  );
};

export const getSafeAreaInsets = () => ({
  top: getStatusBarHeight(),
  bottom: getBottomSafeArea(),
});

export default SafeAreaWrapper;