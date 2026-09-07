import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { colors } from '../../config/colors';
import { typography, spacing } from '../../config/theme';
import { BrandLogo } from '../../components/common/BrandLogo';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

/**
 * PulseDots Component
 * Minimalist pulsating loading indicator in Electric Mint.
 */
const PulseDots = () => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createPulse = (animatedVal, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animatedVal, {
            toValue: 1,
            duration: 500,
            delay,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(animatedVal, {
            toValue: 0.3,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createPulse(dot1, 0);
    const anim2 = createPulse(dot2, 200);
    const anim3 = createPulse(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.pulseContainer}>
      <Animated.View style={[styles.dot, { opacity: dot1, transform: [{ scale: dot1 }] }]} />
      <Animated.View style={[styles.dot, { opacity: dot2, transform: [{ scale: dot2 }] }]} />
      <Animated.View style={[styles.dot, { opacity: dot3, transform: [{ scale: dot3 }] }]} />
    </View>
  );
};

/**
 * Screen 1: Splash Screen
 * Manages brand reveal, initialization check, and navigation dispatch.
 */
export const SplashScreen = ({ navigation }) => {
  const checkSession = useAuthStore((state) => state.checkSession);

  // Animation values
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(18)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Stage Entrance Animations
    Animated.sequence([
      // Logo Reveal
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Title Reveal
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Tagline & Pulse Reveal
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 2. Perform Session Check & Navigate
    const initialize = async () => {
      const token = await checkSession();

      // Smooth Exit Transition
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (navigation) {
          if (token) {
            navigation.replace('MainTabs');
          } else {
            navigation.replace('Welcome');
          }
        }
      });
    };

    initialize();
  }, [checkSession, navigation]);

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Ambient background spheres for depth */}
      <View style={styles.topAmbientHalo} />
      <View style={styles.bottomAmbientHalo} />

      {/* Main Brand Container */}
      <View style={styles.contentWrapper}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <BrandLogo size={96} />
        </Animated.View>

        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.title}>Divide & Rule</Text>
        </Animated.View>

        <Animated.View style={{ opacity: taglineOpacity, alignItems: 'center' }}>
          <Text style={styles.tagline}>
            Never pay more than your share.{'\n'}Just enjoy the journey.
          </Text>
        </Animated.View>
      </View>

      {/* Footer Loading Indicator */}
      <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
        <PulseDots />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  topAmbientHalo: {
    position: 'absolute',
    top: -100,
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: colors.backgroundElevated,
    opacity: 0.7,
  },
  bottomAmbientHalo: {
    position: 'absolute',
    bottom: -80,
    right: -60,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    backgroundColor: colors.backgroundCard,
    opacity: 0.5,
  },
  contentWrapper: {
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignItems: 'center',
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
});

export default SplashScreen;
