import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../config/colors';
import { spacing, typography } from '../../config/theme';
import { BrandLogo } from '../../components/common/BrandLogo';
import { StatWidget } from '../../components/dashboard/StatWidget';
import { ActionHeroCard } from '../../components/dashboard/ActionHeroCard';
import { DailyThoughtCard } from '../../components/dashboard/DailyThoughtCard';
import { FloatingBottomBar } from '../../components/navigation/FloatingBottomBar';
import { useDashboardStore } from '../../store/dashboardStore';

const { width } = Dimensions.get('window');

/**
 * Screen: Home Dashboard
 * The primary post-login experience for Divide & Rule.
 */
export const HomeScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('home');
  const { stats, recentTrips, isLoading, fetchDashboard } = useDashboardStore();

  // Auto-refresh MongoDB dashboard data whenever Home Screen mounts
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleTripSplit = () => {
    navigation?.navigate('CreateTrip');
  };

  const handleQuickSplit = () => {
    navigation?.navigate('QuickSplit');
  };

  const handleAddExpense = () => {
    navigation?.navigate('AddExpense');
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Ambient background glows */}
      <View style={styles.topAmbientHalo} />
      <View style={styles.middleAmbientHalo} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoWrapper}>
              <BrandLogo size={42} />
            </View>
            <View style={styles.titleColumn}>
              <Text style={styles.brandTitle}>Divide & Rule</Text>
              <Text style={styles.tagline}>Never pay more than your share.</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {/* Notification Bell */}
            <Pressable style={styles.headerIconBtn}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z"
                  stroke={colors.textSecondary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M13.73 21A2 2 0 0 1 10.27 21"
                  stroke={colors.textSecondary}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </Svg>
              <View style={styles.notifBadge} />
            </Pressable>

            {/* Profile Avatar */}
            <Pressable style={styles.avatarBtn}>
              <Text style={styles.avatarText}>AG</Text>
            </Pressable>
          </View>
        </View>

        {/* Scrollable Dashboard Body */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Statistics Section (3 Modern Mini Cards) */}
          <View style={styles.statsSection}>
            <StatWidget
              icon={
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21"
                    stroke={colors.primary}
                    strokeWidth="2"
                  />
                  <Circle cx="12" cy="11" r="4" stroke={colors.primary} strokeWidth="2" />
                </Svg>
              }
              label="Friends"
              value={`${stats.friendsCount} Active`}
              sublabel={`In ${stats.groupsCount} Trips`}
              type="neutral"
              onPress={() => navigation?.navigate('Friends')}
            />

            <StatWidget
              icon={
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                  <Path d="M7 7L17 17M17 7V17H7" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" />
                </Svg>
              }
              label="Incoming"
              value={`+₹${(stats.incomingMinor / 100).toFixed(0)}`}
              sublabel="Owed to you"
              type="positive"
              onPress={() => navigation?.navigate('IncomingBalances')}
            />

            <StatWidget
              icon={
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                  <Path d="M7 17L17 7M7 7H17V17" stroke="#FFA285" strokeWidth="2.5" strokeLinecap="round" />
                </Svg>
              }
              label="Outgoing"
              value={`-₹${(stats.outgoingMinor / 100).toFixed(0)}`}
              sublabel="You owe"
              type="negative"
              onPress={() => navigation?.navigate('OutgoingBalances')}
            />
          </View>

          {/* 2. Primary Action Cards */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Split & Track</Text>
            <Text style={styles.sectionSubtitle}>Choose your mode</Text>
          </View>

          <View style={styles.actionCardsStack}>
            {/* Card 1: Trip Split */}
            <ActionHeroCard
              badgeText="Group Experience"
              title="Trip Split"
              description="Create a trip, invite friends, and split every expense effortlessly."
              variant="trip"
              onPress={handleTripSplit}
            />

            {/* Card 2: Quick Split */}
            <ActionHeroCard
              badgeText="Instant & Simple"
              title="Quick Split"
              description="Split a single expense instantly without creating a trip."
              variant="quick"
              onPress={handleQuickSplit}
            />
          </View>

          {/* 3. Recent Trips — from MongoDB Atlas (via useDashboardStore) */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <Text style={styles.sectionSubtitle}>Your latest activity</Text>
          </View>

          {stats.groupsCount === 0 && !isLoading ? (
            <View style={styles.emptyTripsCard}>
              <Text style={styles.emptyTripsText}>No active trips yet.</Text>
              <Pressable onPress={handleTripSplit} style={styles.emptyTripsBtn}>
                <Text style={styles.emptyTripsBtnText}>+ Create Trip</Text>
              </Pressable>
            </View>
          ) : (
            recentTrips.slice(0, 3).map((t) => {
              const thumb = (t.destination || '').toLowerCase().includes('goa') ||
                            (t.destination || '').toLowerCase().includes('beach') ? '🏖️' :
                            (t.destination || '').toLowerCase().includes('manali') ||
                            (t.destination || '').toLowerCase().includes('mountain') ? '🏔️' : '✈️';
              const balColor = t.myStatus === 'IS_OWED' ? colors.primary :
                               t.myStatus === 'OWES' ? '#FFA285' : colors.textSecondary;
              const balLabel = t.myStatus === 'IS_OWED' ? `+₹${(t.myBalanceMinor / 100).toFixed(0)}` :
                               t.myStatus === 'OWES' ? `-₹${(Math.abs(t.myBalanceMinor) / 100).toFixed(0)}` : 'Settled';

              return (
                <Pressable
                  key={t.id}
                  onPress={() => navigation?.navigate('TripDetails', { tripId: t.id, tripName: t.name })}
                  style={styles.recentTripCard}
                >
                  <View style={styles.recentTripThumb}>
                    <Text style={{ fontSize: 20 }}>{thumb}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentTripName}>{t.name}</Text>
                    <Text style={styles.recentTripDest}>{t.destination}</Text>
                  </View>
                  <Text style={[styles.recentTripBal, { color: balColor }]}>{balLabel}</Text>
                </Pressable>
              );
            })
          )}

          {/* 4. Daily Thought Card */}
          <View style={styles.dailyThoughtWrapper}>
            <DailyThoughtCard
              quote="Good friends split expenses. Great friends make better memories."
              author="Divide & Rule Daily"
            />
          </View>

          {/* Bottom spacing to clear floating navigation bar */}
          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Floating Bottom Navigation Bar */}
      <FloatingBottomBar
        activeTab={activeTab}
        onTabPress={(tab) => {
          setActiveTab(tab);
          if (tab === 'trips') navigation?.navigate('TripsHub');
          if (tab === 'friends') navigation?.navigate('Friends');
        }}
        onAddExpensePress={handleAddExpense}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  safeArea: {
    flex: 1,
  },
  topAmbientHalo: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: (width * 0.85) / 2,
    backgroundColor: colors.backgroundElevated,
    opacity: 0.8,
  },
  middleAmbientHalo: {
    position: 'absolute',
    top: 300,
    left: -80,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    backgroundColor: 'rgba(0, 229, 153, 0.05)',
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrapper: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  titleColumn: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: -0.1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#134737',
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 18,
  },
  statsSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionCardsStack: {
    gap: 14,
    marginBottom: 22,
  },
  dailyThoughtWrapper: {
    marginBottom: 16,
  },
  recentTripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 53, 40, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 12,
  },
  recentTripThumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTripName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  recentTripDest: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recentTripBal: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyTripsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(13, 53, 40, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  emptyTripsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyTripsBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyTripsBtnText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '800',
  },
});

export default HomeScreen;
