import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
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

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Track progress loading (2.5 seconds total)
  useEffect(() => {
    const duration = 2500;
    const intervalTime = 30; // updates every 30ms for smooth progress bar
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          // Let the 100% state display briefly, then call complete
          setTimeout(() => {
            if (onAnimationComplete) {
              onAnimationComplete();
            }
          }, 200);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onAnimationComplete]);

  // Transition messages gracefully based on progress milestones
  useEffect(() => {
    let newIndex = 0;
    if (progress < 25) newIndex = 0;
    else if (progress < 50) newIndex = 1;
    else if (progress < 75) newIndex = 2;
    else if (progress < 90) newIndex = 3;
    else newIndex = 4;

    if (newIndex !== msgIndex) {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setMsgIndex(newIndex);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [progress, msgIndex, fadeAnim]);

  const progressPercentage = `${Math.min(Math.round(progress), 100)}%` as any;

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
        {/* Double triangle SVG Logo */}
        <Svg width={120} height={120} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="leftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#818CF8" stopOpacity={0.9} />
              <Stop offset="100%" stopColor="#4F46E5" stopOpacity={0.2} />
            </LinearGradient>
            <LinearGradient id="rightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#60A5FA" stopOpacity={0.95} />
              <Stop offset="100%" stopColor="#2563EB" stopOpacity={0.25} />
            </LinearGradient>
            <RadialGradient id="glowGrad" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          
          {/* Left triangle */}
          <Path
            d="M 46,24 L 28,76 L 54,76 Z"
            fill="url(#leftGrad)"
          />
          
          {/* Right triangle */}
          <Path
            d="M 54,24 L 46,76 L 72,76 Z"
            fill="url(#rightGrad)"
          />
          
          {/* Glowing Apexes */}
          <Circle cx={46} cy={24} r={6} fill="url(#glowGrad)" />
          <Circle cx={46} cy={24} r={2} fill="#FFFFFF" />
          
          <Circle cx={54} cy={24} r={6} fill="url(#glowGrad)" />
          <Circle cx={54} cy={24} r={2} fill="#FFFFFF" />
        </Svg>

        <Text style={styles.brandTitle}>SAN MINES</Text>
        <Text style={styles.brandSubtitle}>FIELD OPERATIONS SUITE</Text>
      </View>

      {/* Loading Progress Bar & Cycle Status */}
      <View style={styles.loaderContainer}>
        <View style={styles.loaderHeader}>
          <Text style={styles.loaderTitle}>LOADING</Text>
          <Text style={styles.loaderPercent}>{Math.min(Math.round(progress), 100)}%</Text>
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: progressPercentage }]}>
            <View style={styles.glowDot} />
          </View>
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
  loaderPercent: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    width: '100%',
    position: 'relative',
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
