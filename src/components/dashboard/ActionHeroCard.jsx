import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../../config/colors';

/**
 * Custom Vector Artwork for Trip Split (Mountain & Adventure Scene)
 */
const TripIllustration = () => (
  <Svg width={72} height={72} viewBox="0 0 72 72" fill="none">
    <Defs>
      <LinearGradient id="mountainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#4EFEB3" stopOpacity="0.8" />
        <Stop offset="100%" stopColor="#00E599" stopOpacity="0.2" />
      </LinearGradient>
      <LinearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFDE69" />
        <Stop offset="100%" stopColor="#FFB800" />
      </LinearGradient>
    </Defs>
    {/* Sun / Horizon */}
    <Circle cx="48" cy="24" r="8" fill="url(#sunGrad)" opacity={0.85} />
    {/* Background Mountain */}
    <Path d="M26 22L46 54H6L26 22Z" fill="#134737" opacity={0.6} />
    {/* Main Foreground Mountain */}
    <Path d="M42 16L66 54H18L42 16Z" fill="url(#mountainGrad)" stroke="#00E599" strokeWidth="1.2" />
    {/* Mountain Snow Peak Accent */}
    <Path d="M42 16L48 26L42 28L36 26L42 16Z" fill="#FFFFFF" opacity={0.9} />
    {/* Travel Path Line */}
    <Path d="M10 58C22 56 34 60 58 56" stroke="#4EFEB3" strokeWidth="2" strokeDasharray="3 3" />
  </Svg>
);

/**
 * Custom Vector Artwork for Quick Split (Café / Dining / Bill Sharing)
 */
const QuickIllustration = () => (
  <Svg width={72} height={72} viewBox="0 0 72 72" fill="none">
    <Defs>
      <LinearGradient id="cupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#4EFEB3" />
        <Stop offset="100%" stopColor="#05B374" />
      </LinearGradient>
      <LinearGradient id="steamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <Stop offset="0%" stopColor="#00E599" stopOpacity="0.6" />
        <Stop offset="100%" stopColor="#00E599" stopOpacity="0" />
      </LinearGradient>
    </Defs>
    {/* Coffee Cup / Table Icon */}
    <Rect x="20" y="28" width="28" height="24" rx="6" fill="#134737" stroke="#00E599" strokeWidth="1.5" />
    {/* Cup Handle */}
    <Path d="M48 33C52 33 55 36 55 40C55 44 52 47 48 47" stroke="#00E599" strokeWidth="2" strokeLinecap="round" />
    {/* Saucer / Plate */}
    <Path d="M14 54C26 57 42 57 54 54" stroke="#4EFEB3" strokeWidth="2" strokeLinecap="round" />
    {/* Rising Steam */}
    <Path d="M28 22C28 17 32 16 32 12" stroke="url(#steamGrad)" strokeWidth="2" strokeLinecap="round" />
    <Path d="M38 22C38 17 42 16 42 12" stroke="url(#steamGrad)" strokeWidth="2" strokeLinecap="round" />
    {/* Split Bill Badge */}
    <Circle cx="20" cy="22" r="7" fill="#00E599" />
    <Path d="M17 22H23M20 19V25" stroke="#051B14" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

/**
 * ActionHeroCard Component
 * Large interactive card with premium vector art, rich copywriting, and directional CTA.
 */
export const ActionHeroCard = ({
  badgeText,
  title,
  description,
  variant = 'trip', // 'trip' | 'quick'
  onPress,
}) => {
  const isTrip = variant === 'trip';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isTrip ? styles.tripCardBorder : styles.quickCardBorder,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.textColumn}>
          {badgeText ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <View style={styles.visualColumn}>
          <View style={styles.illustrationWrapper}>
            {isTrip ? <TripIllustration /> : <QuickIllustration />}
          </View>
          <View style={styles.arrowButton}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0A2B20',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  tripCardBorder: {
    borderColor: 'rgba(0, 229, 153, 0.25)',
  },
  quickCardBorder: {
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textColumn: {
    flex: 1,
    paddingRight: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.3)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 19,
  },
  visualColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationWrapper: {
    marginBottom: 8,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  arrowText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '900',
    marginTop: -2,
  },
});

export default ActionHeroCard;
