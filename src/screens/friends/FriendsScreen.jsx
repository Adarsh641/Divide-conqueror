import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../config/colors';
import { useFriendStore } from '../../store/friendStore';

const { width } = Dimensions.get('window');

/**
 * Screen: Friends & Connections Management
 * Features:
 *  - View accepted friends with quick "Plan Trip" shortcut
 *  - Live user search by @username with instantaneous request dispatch
 *  - Incoming & Outgoing friend request handling (Accept / Reject)
 *  - Real-time MongoDB synchronization via useFriendStore
 */
export const FriendsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'search'
  const [query, setQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const {
    friends,
    incomingRequests,
    outgoingRequests,
    searchResults,
    isLoading,
    isSearching,
    error,
    successMessage,
    fetchAll,
    searchUsers,
    sendFriendRequest,
    respondToRequest,
    clearMessages,
  } = useFriendStore();

  // Auto-refresh friends & requests on mount
  useEffect(() => {
    fetchAll();
    clearMessages();
  }, [fetchAll, clearMessages]);

  // Debounce search query
  useEffect(() => {
    if (activeTab !== 'search') return;
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchUsers(query);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, activeTab, searchUsers]);

  const handleSendRequest = async (targetUsername) => {
    setActionLoadingId(targetUsername);
    try {
      await sendFriendRequest(targetUsername);
    } catch (e) {
      // Handled by store
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRespond = async (requestId, action) => {
    setActionLoadingId(requestId);
    try {
      await respondToRequest(requestId, action);
    } catch (e) {
      // Handled by store
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePlanTripWithFriend = (friendUsername) => {
    if (navigation?.navigate) {
      navigation.navigate('CreateTrip', { preselectedFriend: friendUsername });
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#051B14" />

      {/* Ambient background glows */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top App Bar */}
        <View style={styles.appBar}>
          <Pressable
            onPress={() => navigation?.goBack?.() || navigation?.navigate?.('Home')}
            style={styles.backBtn}
            hitSlop={8}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 12H5M5 12L12 19M5 12L12 5"
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>

          <View style={styles.appBarTitleContainer}>
            <Text style={styles.appBarTitle}>Friends & Peers</Text>
            <Text style={styles.appBarSubtitle}>Manage your expense-splitting circle</Text>
          </View>

          <Pressable
            onPress={() => fetchAll()}
            style={styles.refreshBtn}
            hitSlop={8}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 12A9 9 0 0 0 6 5.3L3 8M3 3V8H8M3 12A9 9 0 0 0 18 18.7L21 16M21 21V16H16"
                stroke={colors.primary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>

        {/* Notifications (Toast style) */}
        {successMessage ? (
          <View style={styles.successToast}>
            <Text style={styles.successToastText}>✓ {successMessage}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorToast}>
            <Text style={styles.errorToastText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab('friends')}
            style={[styles.tabItem, activeTab === 'friends' && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
              Friends
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{friends.length}</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('requests')}
            style={[styles.tabItem, activeTab === 'requests' && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
              Requests
            </Text>
            {incomingRequests.length > 0 ? (
              <View style={[styles.badge, styles.badgeHighlight]}>
                <Text style={[styles.badgeText, styles.badgeHighlightText]}>
                  {incomingRequests.length}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('search')}
            style={[styles.tabItem, activeTab === 'search' && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
              Find Users
            </Text>
          </Pressable>
        </View>

        {/* Content Body */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'friends' && (
            <View>
              {isLoading ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading friends...</Text>
                </View>
              ) : friends.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconCircle}>
                    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21"
                        stroke={colors.primary}
                        strokeWidth="2"
                      />
                      <Circle cx="12" cy="11" r="4" stroke={colors.primary} strokeWidth="2" />
                    </Svg>
                  </View>
                  <Text style={styles.emptyTitle}>No Friends Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Search for registered users by @username to add them to your travel circle, or invite them when creating trips!
                  </Text>
                  <Pressable
                    onPress={() => setActiveTab('search')}
                    style={styles.primaryActionBtn}
                  >
                    <Text style={styles.primaryActionBtnText}>+ Search & Add Friends</Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>All Connections</Text>
                    <Text style={styles.sectionCount}>{friends.length} active</Text>
                  </View>

                  {friends.map((f, idx) => (
                    <View key={f.username || idx} style={styles.friendCard}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitials}>
                          {(f.fullName || f.username || 'F')
                            .slice(0, 2)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.friendInfo}>
                        <Text style={styles.friendFullName}>{f.fullName || f.username}</Text>
                        <Text style={styles.friendUsername}>@{f.username}</Text>
                      </View>

                      <Pressable
                        onPress={() => handlePlanTripWithFriend(f.username)}
                        style={styles.planTripBtn}
                      >
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}>
                          <Path
                            d="M12 5V19M5 12H19"
                            stroke="#051B14"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </Svg>
                        <Text style={styles.planTripBtnText}>Plan Trip</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* TAB 2: REQUESTS */}
          {activeTab === 'requests' && (
            <View>
              {/* Incoming Requests */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Incoming Requests</Text>
                <Text style={styles.sectionCount}>
                  {incomingRequests.length} pending
                </Text>
              </View>

              {incomingRequests.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>No pending incoming requests</Text>
                </View>
              ) : (
                incomingRequests.map((req) => (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitials}>
                        {(req.fromUser?.fullName || req.fromUser?.username || 'U')
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.friendInfo}>
                      <Text style={styles.friendFullName}>
                        {req.fromUser?.fullName || req.fromUser?.username}
                      </Text>
                      <Text style={styles.friendUsername}>@{req.fromUser?.username}</Text>
                      <Text style={styles.timeAgo}>
                        Requested {new Date(req.createdAt).toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={styles.requestActions}>
                      <Pressable
                        onPress={() => handleRespond(req.id, 'ACCEPT')}
                        disabled={actionLoadingId === req.id}
                        style={styles.acceptBtn}
                      >
                        {actionLoadingId === req.id ? (
                          <ActivityIndicator size="small" color="#051B14" />
                        ) : (
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        )}
                      </Pressable>

                      <Pressable
                        onPress={() => handleRespond(req.id, 'REJECT')}
                        disabled={actionLoadingId === req.id}
                        style={styles.declineBtn}
                      >
                        <Text style={styles.declineBtnText}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}

              {/* Outgoing Requests */}
              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <Text style={styles.sectionTitle}>Sent Requests</Text>
                <Text style={styles.sectionCount}>
                  {outgoingRequests.length} waiting
                </Text>
              </View>

              {outgoingRequests.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>No pending outgoing requests</Text>
                </View>
              ) : (
                outgoingRequests.map((req) => (
                  <View key={req.id} style={styles.outgoingCard}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitials}>
                        {(req.toUser?.fullName || req.toUser?.username || 'U')
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.friendInfo}>
                      <Text style={styles.friendFullName}>
                        {req.toUser?.fullName || req.toUser?.username}
                      </Text>
                      <Text style={styles.friendUsername}>@{req.toUser?.username}</Text>
                    </View>

                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Pending</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 3: USER SEARCH */}
          {activeTab === 'search' && (
            <View>
              {/* Search Bar */}
              <View style={styles.searchBarContainer}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={styles.searchIcon}>
                  <Circle cx="11" cy="11" r="7" stroke={colors.textSecondary} strokeWidth="2" />
                  <Path d="M21 21L16.65 16.65" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
                </Svg>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search registered user by @username..."
                  placeholderTextColor={colors.textSecondary}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {query.length > 0 && (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <Text style={styles.clearSearchText}>✕</Text>
                  </Pressable>
                )}
              </View>

              {/* Status Indicator */}
              {isSearching && (
                <View style={styles.searchingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.searchingText}>Searching registered users...</Text>
                </View>
              )}

              {/* Search Results */}
              {searchResults.length > 0 ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.sectionSubtitle}>
                    {searchResults.length} {searchResults.length === 1 ? 'user' : 'users'} found
                  </Text>

                  {searchResults.map((user) => {
                    const isFriends = user.friendshipStatus === 'FRIENDS';
                    const isSent = user.friendshipStatus === 'REQUEST_SENT';
                    const isReceived = user.friendshipStatus === 'REQUEST_RECEIVED';
                    const isActioning = actionLoadingId === user.username;

                    return (
                      <View key={user.username} style={styles.searchResultCard}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarInitials}>
                            {(user.fullName || user.username).slice(0, 2).toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.friendInfo}>
                          <Text style={styles.friendFullName}>{user.fullName}</Text>
                          <Text style={styles.friendUsername}>@{user.username}</Text>
                        </View>

                        {isFriends ? (
                          <View style={styles.statusPillFriends}>
                            <Text style={styles.statusPillTextFriends}>✓ Friends</Text>
                          </View>
                        ) : isSent ? (
                          <View style={styles.statusPillPending}>
                            <Text style={styles.statusPillTextPending}>Pending</Text>
                          </View>
                        ) : isReceived ? (
                          <Pressable
                            onPress={() => setActiveTab('requests')}
                            style={styles.acceptSmallBtn}
                          >
                            <Text style={styles.acceptSmallBtnText}>Respond</Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            onPress={() => handleSendRequest(user.username)}
                            disabled={isActioning}
                            style={styles.addFriendBtn}
                          >
                            {isActioning ? (
                              <ActivityIndicator size="small" color="#051B14" />
                            ) : (
                              <Text style={styles.addFriendBtnText}>+ Add Friend</Text>
                            )}
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : query.trim().length >= 2 && !isSearching ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>
                    No user found matching "@{query.trim().replace(/^@/, '')}"
                  </Text>
                </View>
              ) : (
                <View style={styles.searchTipBox}>
                  <Text style={styles.searchTipTitle}>💡 Quick Tip</Text>
                  <Text style={styles.searchTipText}>
                    Type a username like <Text style={{ color: colors.primary, fontWeight: '700' }}>@rahul123</Text> or <Text style={{ color: colors.primary, fontWeight: '700' }}>@mayap200</Text> to find users on Divide & Rule and connect directly.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#051B14',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -60,
    left: width * 0.15,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 229, 153, 0.08)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -80,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(0, 229, 153, 0.05)',
  },
  safeArea: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  appBarTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  appBarSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 229, 153, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.25)',
  },
  successToast: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.35)',
  },
  successToastText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  errorToast: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 162, 133, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 162, 133, 0.35)',
  },
  errorToastText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFA285',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgeHighlight: {
    backgroundColor: colors.primary,
  },
  badgeHighlightText: {
    color: '#051B14',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  sectionCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 53, 40, 0.6)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F3C2C',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 153, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  friendInfo: {
    flex: 1,
  },
  friendFullName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  friendUsername: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  planTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  planTripBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#051B14',
  },
  emptyCard: {
    backgroundColor: 'rgba(13, 53, 40, 0.45)',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 229, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 153, 0.3)',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#051B14',
  },
  emptySection: {
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 12,
  },
  emptySectionText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 53, 40, 0.7)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.2)',
  },
  outgoingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 53, 40, 0.4)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 62,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#051B14',
  },
  declineBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 53, 40, 0.8)',
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.3)',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#FFFFFF',
    fontSize: 14,
  },
  clearSearchText: {
    color: colors.textSecondary,
    fontSize: 16,
    paddingHorizontal: 6,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  searchingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 53, 40, 0.65)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusPillFriends: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.3)',
  },
  statusPillTextFriends: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  statusPillPending: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusPillTextPending: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  acceptSmallBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  acceptSmallBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#051B14',
  },
  addFriendBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 95,
    alignItems: 'center',
  },
  addFriendBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#051B14',
  },
  searchTipBox: {
    backgroundColor: 'rgba(0, 229, 153, 0.06)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.2)',
    marginTop: 10,
  },
  searchTipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  searchTipText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default FriendsScreen;
