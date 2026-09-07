import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../config/colors';

/**
 * DailyThoughtCard Component
 * Calm, elegant card featuring an inspirational quote for travel and friendship.
 */
export const DailyThoughtCard = ({
  quote = "Good friends split expenses. Great friends make better memories.",
  author = "Divide & Rule Daily",
}) => {
  return (
    <View style={styles.card}>
      {/* Subtle Background Scenery / Wave Lines */}
      <View style={styles.artworkOverlay}>
        <Svg width="100%" height="100%" viewBox="0 0 320 120" fill="none" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="auroraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#00E599" stopOpacity="0.12" />
              <Stop offset="50%" stopColor="#38BDF8" stopOpacity="0.08" />
              <Stop offset="100%" stopColor="#051B14" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path
            d="M0 40C80 80 160 10 240 60C280 80 300 30 320 50V120H0V40Z"
            fill="url(#auroraGrad)"
          />
        </Svg>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.sparkleIcon}>✦</Text>
          <Text style={styles.headerTitle}>DAILY THOUGHT</Text>
        </View>

        <Text style={styles.quoteText}>"{quote}"</Text>

        <Text style={styles.authorText}>— {author}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(13, 53, 40, 0.65)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  artworkOverlay: {
    position: 'absolute',
    inset: 0,
    opacity: 0.8,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sparkleIcon: {
    color: colors.primary,
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  quoteText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 23,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  authorText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
});

export default DailyThoughtCard;
