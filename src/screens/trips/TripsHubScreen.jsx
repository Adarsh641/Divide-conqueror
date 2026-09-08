import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../../config/colors';
import { spacing } from '../../config/theme';
import { TripCard } from '../../components/trips/TripCard';
import { TripsEmptyState } from '../../components/trips/TripsEmptyState';
import { FloatingBottomBar } from '../../components/navigation/FloatingBottomBar';
import { useTripStore } from '../../store/tripStore';

const { width } = Dimensions.get('window');

/**
 * Procedural Hero Travel Banner Artwork (Mountains, Clouds, Sun Panorama)
 */
const HeroTravelIllustration = () => (
  <Svg width="100%" height="110" viewBox="0 0 340 110" fill="none" preserveAspectRatio="none">
    <Defs>
      <LinearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#103F30" stopOpacity="0.85" />
        <Stop offset="100%" stopColor="#051B14" stopOpacity="0.9" />
      </LinearGradient>
      <LinearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFDE69" />
        <Stop offset="100%" stopColor="#FF9F43" />
      </LinearGradient>
      <LinearGradient id="frontMountain" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#00E599" stopOpacity="0.4" />
        <Stop offset="100%" stopColor="#08231A" stopOpacity="0.8" />
      </LinearGradient>
    </Defs>

    {/* Sky Backdrop */}
    <Rect width="340" height="110" rx="20" fill="url(#skyGrad)" />

    {/* Sun */}
    <Circle cx="250" cy="38" r="18" fill="url(#sunGrad)" opacity={0.85} />

    {/* Distant Mountains */}
    <Path d="M40 110L110 40L180 110H40Z" fill="#17503D" opacity={0.5} />
    <Path d="M150 110L220 28L290 110H150Z" fill="#1C5E4A" opacity={0.7} />
    <Path d="M220 28L232 46L220 50L208 46L220 28Z" fill="#FFFFFF" opacity={0.8} />

    {/* Foreground Mountain Range */}
    <Path d="M0 110L70 55L140 110H0Z" fill="url(#frontMountain)" />
    <Path d="M230 110L300 50L370 110H230Z" fill="url(#frontMountain)" />

    {/* Gentle Flight / Birds Arc */}
    <Path d="M80 32C84 30 88 33 92 31" stroke="#4EFEB3" strokeWidth="1.5" strokeLinecap="round" />
    <Path d="M96 28C100 26 104 29 108 27" stroke="#4EFEB3" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);


/**
 * Screen: Trips Hub (Trip Split Landing Page)
 * Displays live trips from MongoDB Atlas via useTripStore.
 * Auto-refreshes every time this screen gains focus (useFocusEffect).
 */
export const TripsHubScreen = ({ navigation }) => {
  const { trips, isLoading, error, fetchTrips } = useTripStore();
  const [activeFilter, setActiveFilter] = useState('All'); // 'All' | 'Active' | 'Settled'

  // Automatically fetch fresh trip data from MongoDB whenever screen mounts
  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleCreateNewTrip = () => {
    if (navigation?.navigate) {
      try {
        navigation.navigate('CreateTrip');
      } catch (e) {
        navigation.navigate('CreateTripForm');
      }
    }
  };

  const handleTripPress = (trip) => {
    navigation?.navigate('TripDetails', { tripId: trip.id, tripName: trip.title });
  };

  const filteredTrips = trips.filter((t) => {
    if (activeFilter === 'All') return true;
    return t.status === activeFilter;
  });

  return (
    <View style={styles.rootContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Ambient background spheres */}
      <View style={styles.topAmbientHalo} />
      <View style={styles.bottomAmbientHalo} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top App Bar */}
        <View style={styles.appBar}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 12H5M5 12L12 19M5 12L12 5"
                stroke={colors.textPrimary}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>

          <View style={styles.appBarCenter}>
            <Text style={styles.appBarTitle}>Trips Hub</Text>
            <Text style={styles.appBarSubtitle}>Split journeys with friends</Text>
          </View>

          <Pressable style={styles.iconButton}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Circle cx="11" cy="11" r="7" stroke={colors.textSecondary} strokeWidth="2" />
              <Path d="M20 20L16 16" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Hero Section (Top 25–30%) */}
          <View style={styles.heroCard}>
            <View style={styles.heroArtwork}>
              <HeroTravelIllustration />
            </View>
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Adventure Awaits</Text>
              </View>
              <Text style={styles.heroHeadline}>
                "The wait is over. Your next adventure starts here."
              </Text>
              <Text style={styles.heroSubtitle}>
                Create a trip, invite your friends, and let Divide & Rule handle every shared expense.
              </Text>
            </View>
          </View>

          {/* 2. Primary Action: + Create New Trip */}
          <Pressable
            onPress={handleCreateNewTrip}
            style={({ pressed }) => [
              styles.createTripBtn,
              pressed && styles.createTripBtnPressed,
            ]}
          >
            <View style={styles.plusCircle}>
              <Text style={styles.plusIcon}>+</Text>
            </View>
            <Text style={styles.createTripText}>Create New Trip</Text>
          </Pressable>

          {/* 3. Section Divider & Filter Chips */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Your Trips</Text>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{filteredTrips.length} Total</Text>
              </View>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterRow}>
              {['All', 'Active', 'Settled'].map((filter) => (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[
                    styles.filterChip,
                    activeFilter === filter && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      activeFilter === filter && styles.filterChipTextActive,
                    ]}
                  >
                    {filter}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 4. Trips List — Loading / Error / Data states */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading your trips...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Could not load trips</Text>
              <Text style={styles.errorDesc}>{error}</Text>
              <Pressable onPress={fetchTrips} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : filteredTrips.length > 0 ? (
            <View style={styles.tripsList}>
              {filteredTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  title={trip.title}
                  destination={trip.destination}
                  membersCount={trip.membersCount}
                  totalExpense={trip.totalExpense}
                  dateRange={trip.dateRange}
                  status={trip.status}
                  theme={trip.theme}
                  onPress={() => handleTripPress(trip)}
                />
              ))}
            </View>
          ) : (
            <TripsEmptyState onCreateTrip={handleCreateNewTrip} />
          )}

          {/* Bottom spacing to clear floating dock */}
          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Floating Bottom Navigation Bar */}
      <FloatingBottomBar
        activeTab="trips"
        onTabPress={(tab) => {
          if (tab === 'home') navigation?.navigate('Home');
        }}
        onAddExpensePress={() => navigation?.navigate('AddExpense')}
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
    top: -60,
    left: -40,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: colors.backgroundElevated,
    opacity: 0.8,
  },
  bottomAmbientHalo: {
    position: 'absolute',
    bottom: 80,
    right: -60,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    backgroundColor: 'rgba(0, 229, 153, 0.08)',
    opacity: 0.9,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  appBarCenter: {
    alignItems: 'center',
  },
  appBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  appBarSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
  },
  heroCard: {
    backgroundColor: '#0A2B20',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 153, 0.25)',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  heroArtwork: {
    width: '100%',
    height: 110,
    backgroundColor: '#072017',
  },
  heroContent: {
    padding: 18,
    paddingTop: 14,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.3)',
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroHeadline: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 23,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  createTripBtn: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 5,
  },
  createTripBtnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  plusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#051B14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
    marginTop: -2,
  },
  createTripText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#051B14',
    letterSpacing: 0.2,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  countPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  countText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 229, 153, 0.18)',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tripsList: {
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 80, 80, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 80, 80, 0.25)',
    gap: 8,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFA285',
  },
  errorDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  retryBtnText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '800',
  },
});

export default TripsHubScreen;
