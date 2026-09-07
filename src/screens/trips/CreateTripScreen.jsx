import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../../config/colors';
import { spacing } from '../../config/theme';
import { StepIndicator } from '../../components/trips/StepIndicator';
import { MemberChip } from '../../components/trips/MemberChip';
import { useTripStore } from '../../store/tripStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
];

const COVERS = [
  { id: 'beach', name: 'Beach', icon: '🏖️' },
  { id: 'mountain', name: 'Mountain', icon: '🏔️' },
  { id: 'roadtrip', name: 'Roadtrip', icon: '🚗' },
  { id: 'city', name: 'City', icon: '🌆' },
];

/**
 * Screen: Create New Trip
 * Guided 3-step progressive creation flow.
 * Members are loaded from GET /api/friends — only real registered usernames are submitted.
 */
export const CreateTripScreen = ({ navigation, onTripCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createTrip } = useTripStore();
  const fetchDashboard = useDashboardStore((state) => state.fetchDashboard);
  const { user } = useAuthStore();

  // Step 1 Form State
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState('INR');

  // Step 2 — Real Friends from MongoDB (no hardcoded placeholders)
  const [friendsList, setFriendsList] = useState([]);         // All friends from GET /api/friends
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);     // Search results from GET /api/friends/search
  const [isSearching, setIsSearching] = useState(false);

  // Selected trip members — starts empty.
  // The backend ALWAYS auto-adds the owner (current user) as the first member.
  // Only real registered usernames from MongoDB are added here for other members.
  const [members, setMembers] = useState([]);

  // Step 3 Form State (Optional details)
  const [selectedCover, setSelectedCover] = useState('beach');
  const [notes, setNotes] = useState('');

  // ── Load real friends from backend when Step 2 is active ──────────────────
  useEffect(() => {
    if (currentStep === 2) {
      loadFriends();
    }
  }, [currentStep]);

  const loadFriends = async () => {
    setFriendsLoading(true);
    try {
      const response = await api.getFriends();
      setFriendsList(response.friends || []);
    } catch (err) {
      Alert.alert('Could not load friends', err.message);
    } finally {
      setFriendsLoading(false);
    }
  };

  // ── Live search for registered users ──────────────────────────────────────
  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await api.searchFriends(query);
      setSearchResults(response.results || []);
    } catch (err) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ── Add a real user (from friend list or search results) ──────────────────
  const handleAddMember = (userObj) => {
    const alreadyAdded = members.some((m) => m.username === userObj.username);
    if (alreadyAdded) {
      Alert.alert('Already added', `@${userObj.username} is already in this trip.`);
      return;
    }
    setMembers((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        username: userObj.username,
        fullName: userObj.fullName,
        isOrganizer: false,
      },
    ]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveMember = (id) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  // ── Step navigation & validation ──────────────────────────────────────────
  const validateStep1 = () => {
    if (!tripName.trim()) {
      Alert.alert('Required', 'Please enter a trip name.');
      return false;
    }
    if (!destination.trim()) {
      Alert.alert('Required', 'Please enter a destination.');
      return false;
    }
    if (!startDate.trim() || !endDate.trim()) {
      Alert.alert('Required', 'Please enter start and end dates (e.g. 2026-10-12).');
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      try {
        setIsSubmitting(true);

        // Submit usernames of all added members (owner is auto-added by backend)
        const memberUsernames = members.map((m) => m.username);

        const payload = {
          name: tripName.trim(),
          destination: destination.trim(),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          currency,
          memberUsernames,
          coverImage: selectedCover,
          notes: notes.trim(),
        };

        const createdTrip = await createTrip(payload);

        // Auto-refresh Dashboard store data in background
        fetchDashboard();

        if (onTripCreated) onTripCreated(createdTrip);

        setIsSubmitting(false);
        // Navigate to TripsHub so user immediately sees the new trip
        navigation?.navigate('TripsHub');
      } catch (err) {
        setIsSubmitting(false);
        Alert.alert('Trip Creation Failed', err.message || 'Could not save trip to backend.');
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation?.goBack();
    }
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top App Bar */}
        <View style={styles.appBar}>
          <Pressable style={styles.appBarBtn} onPress={handleBack}>
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
            <Text style={styles.appBarTitle}>Create New Trip</Text>
            <Text style={styles.appBarSubtitle}>Step {currentStep} of 3</Text>
          </View>

          <Pressable
            style={styles.cancelBtn}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

        {/* 3-Step Progress Stepper */}
        <StepIndicator currentStep={currentStep} totalSteps={3} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Hero Banner (Top) */}
          <View style={styles.heroBanner}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>New Journey</Text>
            </View>
            <Text style={styles.heroHeadline}>Start a New Adventure</Text>
            <Text style={styles.heroSubtitle}>
              Every unforgettable journey begins with a plan. Create your trip, invite your friends, and let Divide & Rule handle the expenses.
            </Text>
          </View>

          {/* STEP 1: TRIP DETAILS */}
          {currentStep === 1 && (
            <View style={styles.stepSection}>
              {/* Trip Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TRIP NAME *</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>🏷️</Text>
                  <TextInput
                    value={tripName}
                    onChangeText={setTripName}
                    placeholder="e.g. Goa Escape 2026"
                    placeholderTextColor={colors.textMuted}
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Destination */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DESTINATION *</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>📍</Text>
                  <TextInput
                    value={destination}
                    onChangeText={setDestination}
                    placeholder="e.g. Goa, India"
                    placeholderTextColor={colors.textMuted}
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Date Range Pickers */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DATE RANGE *</Text>
                <View style={styles.datesRow}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Text style={styles.inputIcon}>📅</Text>
                    <TextInput
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="Start Date"
                      placeholderTextColor={colors.textMuted}
                      style={styles.textInput}
                    />
                  </View>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Text style={styles.inputIcon}>📅</Text>
                    <TextInput
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="End Date"
                      placeholderTextColor={colors.textMuted}
                      style={styles.textInput}
                    />
                  </View>
                </View>
              </View>

              {/* Currency Dropdown Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CURRENCY *</Text>
                <View style={styles.currencyRow}>
                  {CURRENCIES.map((curr) => {
                    const isSelected = currency === curr.code;
                    return (
                      <Pressable
                        key={curr.code}
                        onPress={() => setCurrency(curr.code)}
                        style={[
                          styles.currencyPill,
                          isSelected && styles.currencyPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.currencyText,
                            isSelected && styles.currencyTextActive,
                          ]}
                        >
                          {curr.symbol} {curr.code}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* STEP 2: MEMBERS — Loaded from GET /api/friends (real registered users only) */}
          {currentStep === 2 && (
            <View style={styles.stepSection}>
              <Text style={styles.stepTitle}>Who's coming?</Text>
              <Text style={styles.stepDesc}>
                Search for registered users or pick from your friends list.
              </Text>

              {/* Live Search Input */}
              <View style={styles.addMemberBar}>
                <TextInput
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholder="Search by @username..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.memberInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                )}
              </View>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <View style={styles.searchResultsList}>
                  {searchResults.map((u) => (
                    <Pressable
                      key={u.username}
                      onPress={() => handleAddMember(u)}
                      style={styles.searchResultItem}
                    >
                      <View style={styles.searchResultAvatar}>
                        <Text style={styles.searchResultAvatarText}>
                          {(u.fullName || u.username)[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchResultName}>{u.fullName}</Text>
                        <Text style={styles.searchResultUsername}>@{u.username}</Text>
                      </View>
                      <Text style={styles.searchResultAdd}>+ Add</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Friends List — Your existing friends from MongoDB */}
              {searchQuery.length === 0 && (
                <View style={styles.membersListWrapper}>
                  <Text style={styles.membersCountLabel}>YOUR FRIENDS</Text>
                  {friendsLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
                  ) : friendsList.length === 0 ? (
                    <Text style={styles.noFriendsText}>
                      No friends yet. Search for users above to add them.
                    </Text>
                  ) : (
                    <View style={styles.chipsContainer}>
                      {friendsList.map((f) => {
                        const alreadyAdded = members.some((m) => m.username === f.username);
                        return (
                          <Pressable
                            key={f.username}
                            onPress={() => !alreadyAdded && handleAddMember(f)}
                            style={[
                              styles.friendPill,
                              alreadyAdded && styles.friendPillAdded,
                            ]}
                          >
                            <Text style={[styles.friendPillText, alreadyAdded && styles.friendPillTextAdded]}>
                              {alreadyAdded ? '✓ ' : '+ '}{f.fullName || f.username}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Current Trip Members — owner is always added by backend, not shown here */}
              {members.length > 0 && (
                <View style={[styles.membersListWrapper, { marginTop: 12 }]}>
                  <Text style={styles.membersCountLabel}>
                    {members.length} {members.length === 1 ? 'FRIEND' : 'FRIENDS'} ADDED
                  </Text>
                  <View style={styles.chipsContainer}>
                    {members.map((m) => (
                      <MemberChip
                        key={m.id}
                        name={`@${m.username}`}
                        isOrganizer={false}
                        onRemove={() => handleRemoveMember(m.id)}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* STEP 3: OPTIONAL DETAILS & REVIEW */}
          {currentStep === 3 && (
            <View style={styles.stepSection}>
              {/* Trip Cover Preset Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CHOOSE A TRIP COVER</Text>
                <View style={styles.coversRow}>
                  {COVERS.map((cov) => {
                    const isSelected = selectedCover === cov.id;
                    return (
                      <Pressable
                        key={cov.id}
                        onPress={() => setSelectedCover(cov.id)}
                        style={[
                          styles.coverCard,
                          isSelected && styles.coverCardSelected,
                        ]}
                      >
                        <Text style={styles.coverIcon}>{cov.icon}</Text>
                        <Text
                          style={[
                            styles.coverName,
                            isSelected && styles.coverNameSelected,
                          ]}
                        >
                          {cov.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOTES (OPTIONAL)</Text>
                <View style={[styles.inputContainer, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Weekend trip with college friends..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.textInput, { height: '100%' }]}
                    multiline
                  />
                </View>
              </View>

              {/* Final Review Summary Card */}
              <View style={styles.reviewCard}>
                <Text style={styles.reviewCardTitle}>Trip Summary</Text>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Destination</Text>
                  <Text style={styles.reviewVal}>{destination}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Dates</Text>
                  <Text style={styles.reviewVal}>{startDate} – {endDate}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Currency</Text>
                  <Text style={styles.reviewVal}>{currency}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Total Members</Text>
                  <Text style={[styles.reviewVal, { color: colors.primary }]}>{members.length} Friends</Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Sticky Bottom Action Button */}
        <View style={styles.bottomBar}>
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.primaryActionBtn,
              pressed && styles.primaryActionBtnPressed,
            ]}
          >
            <Text style={styles.primaryActionText}>
              {currentStep === 1 && 'Continue to Members →'}
              {currentStep === 2 && 'Continue to Review →'}
              {currentStep === 3 && '✨ Create Trip'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  appBarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarCenter: {
    alignItems: 'center',
  },
  appBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  appBarSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  cancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
  },
  heroBanner: {
    backgroundColor: '#0A2B20',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 153, 0.25)',
    marginBottom: 20,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.3)',
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroHeadline: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  stepSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 53, 40, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyPill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPillActive: {
    backgroundColor: 'rgba(0, 229, 153, 0.18)',
    borderColor: colors.primary,
  },
  currencyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  currencyTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  stepDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  addMemberBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  memberInput: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(13, 53, 40, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.textPrimary,
  },
  addMemberBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMemberBtnPressed: {
    transform: [{ scale: 0.96 }],
  },
  addMemberBtnText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
  membersListWrapper: {
    backgroundColor: 'rgba(10, 43, 32, 0.5)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  membersCountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  coversRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coverCard: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    gap: 4,
  },
  coverCardSelected: {
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    borderColor: colors.primary,
  },
  coverIcon: {
    fontSize: 20,
  },
  coverName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  coverNameSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  reviewCard: {
    backgroundColor: '#0A2B20',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.3)',
    gap: 10,
  },
  reviewCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  reviewKey: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5, 27, 20, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 14,
  },
  primaryActionBtn: {
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryActionBtnPressed: {
    transform: [{ scale: 0.98 }],
  },
  primaryActionText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  // ── Step 2 Search & Friend Styles ─────────────────────────────────────────
  searchResultsList: {
    backgroundColor: 'rgba(13, 53, 40, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.25)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 10,
  },
  searchResultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 229, 153, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultAvatarText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  searchResultName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  searchResultUsername: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  searchResultAdd: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  friendPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  friendPillAdded: {
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    borderColor: colors.primary,
  },
  friendPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  friendPillTextAdded: {
    color: colors.primary,
    fontWeight: '700',
  },
  noFriendsText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
    lineHeight: 18,
  },
});

export default CreateTripScreen;
