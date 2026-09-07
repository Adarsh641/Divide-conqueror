import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../../config/colors';

/**
 * TripsEmptyState Component
 * Displayed when user has 0 trips yet, providing an inspirational illustration and direct CTA.
 */
export const TripsEmptyState = ({ onCreateTrip }) => {
  return (
    <View style={styles.container}>
      {/* Travel Backpack & Map Vector Artwork */}
      <View style={styles.illustrationWrapper}>
        <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
          <Defs>
            <LinearGradient id="emptyGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#00E599" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#051B14" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Ambient Circular Aura */}
          <Circle cx="60" cy="60" r="50" fill="url(#emptyGlow)" />

          {/* Luggage / Backpack Contour */}
          <Rect x="38" y="44" width="44" height="52" rx="14" fill="#0E4433" stroke="#00E599" strokeWidth="2" />
          <Rect x="46" y="58" width="28" height="24" rx="8" fill="#134737" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

          {/* Backpack Straps & Handle */}
          <Path d="M50 44V34C50 30 70 30 70 34V44" stroke="#4EFEB3" strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M52 70H68" stroke="#00E599" strokeWidth="2" strokeLinecap="round" />

          {/* Compass / Adventure Pin */}
          <Circle cx="84" cy="38" r="14" fill="#17503D" stroke="#00E599" strokeWidth="1.5" />
          <Path d="M84 28L88 38L84 48L80 38L84 28Z" fill="#00E599" />

          {/* Floating Sparkles */}
          <Circle cx="30" cy="34" r="2.5" fill="#FFDE69" />
          <Circle cx="96" cy="74" r="2" fill="#4EFEB3" />
        </Svg>
      </View>

      <Text style={styles.title}>No adventures yet.</Text>
      <Text style={styles.subtitle}>
        Create your first trip and start making memories with your friends without any financial confusion.
      </Text>

      <Pressable
        onPress={onCreateTrip}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>+ Create Your First Trip</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(10, 43, 32, 0.4)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 12,
  },
  illustrationWrapper: {
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
    marginBottom: 22,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 9999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

export default TripsEmptyState;
