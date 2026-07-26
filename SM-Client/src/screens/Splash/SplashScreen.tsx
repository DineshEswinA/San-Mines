import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Circle,
} from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const STATUS_MESSAGES = [
  '📍 Locking GPS Geofence Nodes & Fetching Material Registries...',
  '🔑 Verifying Operator Credentials & Syncing Session...',
  '📦 Loading Fleet Management Databases...',
  '🌍 Synchronizing Yard Queue & Material Flows...',
  '🚀 Initializing Operational Workspace...',
];

interface SplashScreenProps {}

export const SplashScreen: React.FC<SplashScreenProps> = () => {
  const [msgIndex, setMsgIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Indeterminate progress slider animation loop
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [slideAnim]);

  // Cycle status messages every 2.2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setMsgIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 2200);

    return () => clearInterval(timer);
  }, [fadeAnim]);

  const trackWidth = width - 64; // container has 32px padding on each side
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, trackWidth],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090D1A" />
      
      {/* Background Radial Glow */}
      <View style={styles.glowBgContainer}>
        <Svg width={400} height={400} viewBox="0 0 300 300">
          <Defs>
            <RadialGradient id="bgGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
              <Stop offset="60%" stopColor="#1E3A8A" stopOpacity={0.05} />
              <Stop offset="100%" stopColor="#090D1A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={150} cy={150} r={150} fill="url(#bgGlow)" />
        </Svg>
      </View>

      {/* Main Logo & Branding */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/splash-icon.png')}
          style={{ width: 140, height: 140 }}
          resizeMode="contain"
        />

        <Text style={styles.brandTitle}>SAN MINES</Text>
        <Text style={styles.brandSubtitle}>FIELD OPERATIONS SUITE</Text>
      </View>

      {/* Loading Progress Bar & Cycle Status */}
      <View style={styles.loaderContainer}>
        <View style={styles.loaderHeader}>
          <Text style={styles.loaderTitle}>LOADING RESOURCES...</Text>
        </View>

        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: 60, transform: [{ translateX }] }]}>
            <View style={styles.glowDot} />
          </Animated.View>
        </View>

        <Animated.View style={[styles.statusTextContainer, { opacity: fadeAnim }]}>
          <Text style={styles.statusText}>{STATUS_MESSAGES[msgIndex]}</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D1A', // Pitch dark blue background matching image
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  glowBgContainer: {
    position: 'absolute',
    top: height * 0.25,
    left: width * 0.5 - 200,
    width: 400,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.22,
    zIndex: 1,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 8,
    marginTop: 24,
    textAlign: 'center',
  },
  brandSubtitle: {
    color: '#5C6BC0', // Indigo tint subtext
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 10,
    textAlign: 'center',
  },
  loaderContainer: {
    width: '100%',
    paddingHorizontal: 32,
    marginBottom: 40,
    zIndex: 1,
  },
  loaderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  loaderTitle: {
    color: '#5C6BC0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  track: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#4F46E5', // Indigo start
    borderRadius: 3,
    position: 'relative',
  },
  glowDot: {
    position: 'absolute',
    right: -5,
    top: -3.5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#818CF8',
    shadowColor: '#818CF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 8,
  },
  statusTextContainer: {
    marginTop: 16,
    minHeight: 40,
  },
  statusText: {
    color: '#475569', // Muted text color for log-style output
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});
