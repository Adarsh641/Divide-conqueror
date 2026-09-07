import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../config/colors';

/**
 * Procedural Vector Thumbnails based on Trip Theme
 */
const TripThumbnail = ({ theme = 'beach' }) => {
  if (theme === 'beach') {
    return (
      <Svg width={52} height={52} viewBox="0 0 52 52" fill="none">
        <Defs>
          <LinearGradient id="beachSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#0E4433" />
            <Stop offset="100%" stopColor="#08291F" />
          </LinearGradient>
          <LinearGradient id="sunGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFDE69" />
            <Stop offset="100%" stopColor="#FF9F43" />
          </LinearGradient>
        </Defs>
        <Rect width={52} height={52} rx={14} fill="url(#beachSky)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        {/* Sun */}
        <Circle cx="36" cy="18" r="6" fill="url(#sunGlow)" />
        {/* Ocean Waves */}
        <Path d="M0 38C12 36 18 42 32 39C42 36 48 40 52 38V52H0V38Z" fill="#00E599" opacity={0.3} />
        <Path d="M0 44C10 42 20 46 34 43C44 41 48 44 52 43V52H0V44Z" fill="#00E599" opacity={0.6} />
        {/* Palm Tree Trunk & Leaves */}
        <Path d="M16 48C18 36 21 26 23 20" stroke="#7A5034" strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M23 20C18 16 12 18 10 20" stroke="#4EFEB3" strokeWidth="2" strokeLinecap="round" />
        <Path d="M23 20C28 16 34 18 36 21" stroke="#4EFEB3" strokeWidth="2" strokeLinecap="round" />
        <Path d="M23 20C24 13 22 10 20 8" stroke="#00E599" strokeWidth="2" strokeLinecap="round" />
      </Svg>
    );
  }

  // Mountain Theme Default
  return (
    <Svg width={52} height={52} viewBox="0 0 52 52" fill="none">
      <Defs>
        <LinearGradient id="mountainSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#134737" />
          <Stop offset="100%" stopColor="#08231A" />
        </LinearGradient>
      </Defs>
      <Rect width={52} height={52} rx={14} fill="url(#mountainSky)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      {/* Mountain Peak 1 */}
      <Path d="M16 16L32 44H0L16 16Z" fill="#1C5E4A" />
      <Path d="M16 16L20 23L16 25L12 23L16 16Z" fill="#FFFFFF" opacity={0.9} />
      {/* Mountain Peak 2 */}
      <Path d="M34 22L50 46H18L34 22Z" fill="#00E599" opacity={0.8} />
      <Path d="M34 22L38 28L34 30L30 28L34 22Z" fill="#FFFFFF" opacity={0.95} />
      {/* Stars */}
      <Circle cx="40" cy="12" r="1" fill="#FFDE69" />
      <Circle cx="12" cy="10" r="1.2" fill="#FFDE69" />
    </Svg>
  );
};

/**
 * TripCard Component
 * Premium frosted emerald card presenting a single group travel instance.
 */
export const TripCard = ({
  title,
  destination,
  membersCount,
  totalExpense,
  dateRange,
  status = 'Active', // 'Active' | 'Settled'
  theme = 'mountain',
  onPress,
}) => {
  const isSettled = status === 'Settled';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isSettled && styles.cardSettled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.contentRow}>
        {/* Left Thumbnail Illustration */}
        <View style={styles.thumbnailWrapper}>
          <TripThumbnail theme={theme} />
        </View>

        {/* Center Details */}
        <View style={styles.detailsColumn}>
          <View style={styles.titleHeader}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <View
              style={[
                styles.statusBadge,
                isSettled ? styles.badgeSettled : styles.badgeActive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isSettled ? styles.statusTextSettled : styles.statusTextActive,
                ]}
              >
                {status}
              </Text>
            </View>
          </View>

          {/* Destination & Date Range */}
          <Text style={styles.destinationText} numberOfLines={1}>
            📍 {destination} • {dateRange}
          </Text>

          {/* Bottom Metagroup: Friends & Total Expense */}
          <View style={styles.metaRow}>
            <View style={styles.membersPill}>
              <Text style={styles.membersText}>👥 {membersCount} Friends</Text>
            </View>
            <View style={styles.expenseWrapper}>
              <Text style={styles.expenseLabel}>Total: </Text>
              <Text style={styles.expenseAmount}>{totalExpense}</Text>
            </View>
          </View>
        </View>

        {/* Right Caret Indicator */}
        <View style={styles.arrowColumn}>
          <View style={styles.arrowCircle}>
            <Text style={styles.arrowIcon}>›</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0A2B20',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  cardSettled: {
    opacity: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailWrapper: {
    marginRight: 14,
  },
  detailsColumn: {
    flex: 1,
  },
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    flex: 1,
    paddingRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  badgeActive: {
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.3)',
  },
  badgeSettled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusTextActive: {
    color: colors.primary,
  },
  statusTextSettled: {
    color: colors.textMuted,
  },
  destinationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membersPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  membersText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  expenseWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  expenseLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  arrowColumn: {
    paddingLeft: 10,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: -2,
  },
});

export default TripCard;
