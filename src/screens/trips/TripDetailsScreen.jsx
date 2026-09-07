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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../config/colors';
import { useExpenseStore } from '../../store/expenseStore';
import { useTripStore } from '../../store/tripStore';
import useAuthStore from '../../store/authStore';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { key: 'FOOD', label: 'Food', icon: '🍔' },
  { key: 'TRAVEL', label: 'Travel', icon: '✈️' },
  { key: 'STAY', label: 'Stay', icon: '🏨' },
  { key: 'ACTIVITIES', label: 'Activities', icon: '🎟️' },
  { key: 'SHOPPING', label: 'Shopping', icon: '🛍️' },
  { key: 'OTHER', label: 'Other', icon: '💳' },
];

/**
 * Screen: Trip Details & Expense Splitting Hub
 * Features:
 *  - Real-time expenses feed with category icons & split tracking
 *  - 3-Mode Expense Splitting: Equal, Percentage (%), and Exact (₹)
 *  - Dynamic net balance calculation
 *  - Real-Time Debt Minimization (Greedy Cash Flow Simplification)
 *  - One-Tap "Settle Up" action to zero out balances in MongoDB Atlas
 */
export const TripDetailsScreen = ({ route, navigation }) => {
  const tripId = route?.params?.tripId;
  const tripNameParam = route?.params?.tripName || 'Trip Details';

  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'balances' | 'settlements'
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Add Expense Modal State
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('FOOD');
  const [paidBy, setPaidBy] = useState('');
  const [splitMode, setSplitMode] = useState('EQUAL'); // 'EQUAL' | 'PERCENTAGE' | 'EXACT'
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSplits, setMemberSplits] = useState({}); // { [username]: percentage or exactAmount }

  // Settle Up Modal State
  const [settleModalData, setSettleModalData] = useState(null);
  const [settlePaymentMethod, setSettlePaymentMethod] = useState('UPI'); // 'UPI' | 'CASH' | 'BANK_TRANSFER'
  const [settleProofOrNote, setSettleProofOrNote] = useState('');

  const currentUser = useAuthStore((s) => s.user);
  const { trips } = useTripStore();
  const currentTrip = trips.find((t) => t.id === tripId) || {};

  const {
    expenses,
    balances,
    settlementPlan,
    pendingSettlements,
    pendingExpenseSplits,
    tripSummary,
    isLoading,
    isActionLoading,
    error,
    successMessage,
    fetchTripData,
    addExpense,
    recordSettlement,
    requestSettlement,
    respondSettlement,
    respondToExpenseSplit,
    deleteExpense,
    clearMessages,
  } = useExpenseStore();

  const loadData = useCallback(() => {
    if (tripId) {
      fetchTripData(tripId);
      clearMessages();
    }
  }, [tripId, fetchTripData, clearMessages]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Initialize members when Add Expense modal opens
  const openAddExpenseModal = () => {
    const membersList = currentTrip.members || balances.map((b) => ({ username: b.username, fullName: b.fullName })) || [];
    const myUsername = currentUser?.username || membersList[0]?.username || '';
    setPaidBy(myUsername);

    const initialMembers = membersList.map((m) => m.username || m.userId?.username).filter(Boolean);
    setSelectedMembers(initialMembers);

    // Initial splits
    const initialSplits = {};
    if (initialMembers.length > 0) {
      const equalPct = (100 / initialMembers.length).toFixed(1);
      initialMembers.forEach((u) => {
        initialSplits[u] = equalPct;
      });
    }
    setMemberSplits(initialSplits);

    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseCategory('FOOD');
    setSplitMode('EQUAL');
    setIsAddModalVisible(true);
  };

  const handleToggleMember = (username) => {
    if (selectedMembers.includes(username)) {
      if (selectedMembers.length <= 1) return; // Keep at least one
      setSelectedMembers(selectedMembers.filter((u) => u !== username));
    } else {
      setSelectedMembers([...selectedMembers, username]);
    }
  };

  const handleSaveExpense = async () => {
    const numAmount = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid title and positive expense amount');
      return;
    }

    const payload = {
      title: expenseTitle.trim(),
      amount: numAmount,
      category: expenseCategory,
      splitType: splitMode,
      paidByUsername: paidBy,
    };

    if (splitMode === 'PERCENTAGE') {
      const splitsArray = selectedMembers.map((u) => ({
        username: u,
        percentage: parseFloat(memberSplits[u] || 0),
      }));
      const totalPct = splitsArray.reduce((sum, s) => sum + s.percentage, 0);
      if (Math.abs(totalPct - 100) > 0.1) {
        alert(`Percentages must sum to 100% (currently ${totalPct.toFixed(1)}%)`);
        return;
      }
      payload.splits = splitsArray;
    } else if (splitMode === 'EXACT') {
      const splitsArray = selectedMembers.map((u) => ({
        username: u,
        amount: parseFloat(memberSplits[u] || 0),
      }));
      const totalExact = splitsArray.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalExact - numAmount) > 0.5) {
        alert(`Exact shares sum (₹${totalExact}) must match total amount (₹${numAmount})`);
        return;
      }
      payload.splits = splitsArray;
    } else {
      // EQUAL
      payload.splitBetweenUsernames = selectedMembers;
    }

    try {
      await addExpense(tripId, payload);
      setIsAddModalVisible(false);
    } catch (err) {
      // Handled in store
    }
  };

  const handleConfirmSettleUp = async () => {
    if (!settleModalData) return;
    try {
      await requestSettlement(tripId, {
        creditorUsername: settleModalData.toUsername,
        amountMinor: settleModalData.amountMinor,
        paymentMethod: settlePaymentMethod,
        proofOrNote: settleProofOrNote,
      });
      setSettleModalData(null);
      setSettleProofOrNote('');
    } catch (err) {
      // Handled in store
    }
  };

  const filteredExpenses = selectedCategory === 'ALL'
    ? expenses
    : expenses.filter((e) => e.category === selectedCategory);

  const myBalanceObj = balances.find((b) => b.username === currentUser?.username);
  const myNetMinor = myBalanceObj ? myBalanceObj.netBalanceMinor : 0;
  const myBalColor = myNetMinor > 0 ? colors.primary : myNetMinor < 0 ? '#FFA285' : colors.textSecondary;
  const myBalText = myNetMinor > 0 ? `+₹${(myNetMinor / 100).toFixed(0)}` : myNetMinor < 0 ? `-₹${(Math.abs(myNetMinor) / 100).toFixed(0)}` : 'Settled';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#051B14" />
      <View style={styles.ambientHaloTop} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top App Bar */}
        <View style={styles.appBar}>
          <Pressable onPress={() => navigation?.goBack?.() || navigation?.navigate?.('TripsHub')} style={styles.backBtn} hitSlop={8}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>

          <View style={styles.appBarTitleCenter}>
            <Text style={styles.appBarTitle} numberOfLines={1}>
              {currentTrip.title || tripSummary.tripName || tripNameParam}
            </Text>
            <Text style={styles.appBarSubtitle}>
              {currentTrip.destination ? `📍 ${currentTrip.destination}` : 'Shared Trip Ledger'}
            </Text>
          </View>

          <Pressable onPress={openAddExpenseModal} style={styles.addExpenseNavBtn} hitSlop={8}>
            <Text style={styles.addExpenseNavBtnText}>+ Add</Text>
          </Pressable>
        </View>

        {/* Notifications */}
        {successMessage ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>✓ {successMessage}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* Hero Balance Summary Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSmallLabel}>TOTAL TRIP SPEND</Text>
              <Text style={styles.heroBigValue}>
                ₹{(tripSummary.tripTotalSpendMinor / 100).toFixed(0)}
              </Text>
              <Text style={styles.heroSubtext}>
                {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} recorded
              </Text>
            </View>

            <View style={styles.heroBalanceBox}>
              <Text style={styles.heroSmallLabel}>YOUR BALANCE</Text>
              <Text style={[styles.heroBalValue, { color: myBalColor }]}>
                {myBalText}
              </Text>
              <Text style={styles.heroSubtext}>
                {myNetMinor > 0 ? 'You are owed' : myNetMinor < 0 ? 'You owe' : 'All clear'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3 Tabs: Expenses | Balances | Settle Up */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab('expenses')}
            style={[styles.tabItem, activeTab === 'expenses' && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>
              Expenses ({expenses.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('balances')}
            style={[styles.tabItem, activeTab === 'balances' && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, activeTab === 'balances' && styles.tabTextActive]}>
              Balances ({balances.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('settlements')}
            style={[styles.tabItem, activeTab === 'settlements' && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, activeTab === 'settlements' && styles.tabTextActive]}>
              Settle Up ⚡
            </Text>
            {settlementPlan.length > 0 && (
              <View style={styles.settleBadge}>
                <Text style={styles.settleBadgeText}>{settlementPlan.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Content Body */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* ─── PENDING SETTLEMENT APPROVAL ALERTS ─── */}
          {pendingSettlements && pendingSettlements.length > 0 && (
            <View style={styles.pendingSection}>
              {pendingSettlements.map((req) => {
                const isIncoming = req.needsMyApproval;
                const isOutgoing = req.sentByMe;
                const amtRs = (req.amountMinor / 100).toFixed(0);

                if (isIncoming) {
                  return (
                    <View key={req.id} style={styles.approvalAlertCard}>
                      <View style={styles.approvalHeader}>
                        <Text style={{ fontSize: 20 }}>🔔</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.approvalTitle}>Payment Verification Needed</Text>
                          <Text style={styles.approvalBody}>
                            <Text style={{ fontWeight: '700', color: '#fff' }}>@{req.payer.username}</Text> marked{' '}
                            <Text style={{ fontWeight: '800', color: colors.primary }}>₹{amtRs}</Text> as paid via{' '}
                            <Text style={{ fontWeight: '700', color: '#fff' }}>{req.paymentMethod}</Text>
                            {req.proofOrNote ? ` (Ref: ${req.proofOrNote})` : ''}.
                          </Text>
                        </View>
                      </View>
                      <View style={styles.approvalBtnRow}>
                        <Pressable
                          onPress={() => respondSettlement(tripId, req.id, 'REJECT')}
                          disabled={isActionLoading}
                          style={styles.rejectBtn}
                        >
                          <Text style={styles.rejectBtnText}>Not Received ✕</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => respondSettlement(tripId, req.id, 'APPROVE')}
                          disabled={isActionLoading}
                          style={styles.approveBtn}
                        >
                          <Text style={styles.approveBtnText}>Confirm Received ✓</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                }

                if (isOutgoing) {
                  return (
                    <View key={req.id} style={styles.pendingOutgoingCard}>
                      <Text style={{ fontSize: 16 }}>⏳</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pendingOutgoingTitle}>Settlement Sent — Awaiting Approval</Text>
                        <Text style={styles.pendingOutgoingBody}>
                          You marked ₹{amtRs} as paid to @{req.receiver.username} via {req.paymentMethod}. The debt will zero out once they approve.
                        </Text>
                      </View>
                    </View>
                  );
                }

                return null;
              })}
            </View>
          )}

          {/* ─── PENDING BILL SPLIT APPROVAL ALERTS ─── */}
          {pendingExpenseSplits && pendingExpenseSplits.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              {pendingExpenseSplits.map((split) => {
                const shareRs = (split.myShareMinor / 100).toFixed(0);
                const totalRs = (split.totalAmountMinor / 100).toFixed(0);
                return (
                  <View key={split.expenseId} style={styles.splitAlertCard}>
                    <View style={styles.approvalHeader}>
                      <Text style={{ fontSize: 20 }}>🧾</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.splitAlertTitle}>Bill Split Request</Text>
                        <Text style={styles.approvalBody}>
                          <Text style={{ fontWeight: '700', color: '#fff' }}>@{split.payer.username}</Text> wants to split{' '}
                          <Text style={{ fontWeight: '800', color: '#fff' }}>"{split.title}"</Text> (Total: ₹{totalRs}).
                          {'\n'}Your share: <Text style={{ fontWeight: '900', color: colors.primary }}>₹{shareRs}</Text>.
                        </Text>
                      </View>
                    </View>
                    <View style={styles.approvalBtnRow}>
                      <Pressable
                        onPress={() => respondToExpenseSplit(tripId, split.expenseId, 'DECLINE')}
                        disabled={isActionLoading}
                        style={styles.rejectBtn}
                      >
                        <Text style={styles.rejectBtnText}>Decline ✕</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => respondToExpenseSplit(tripId, split.expenseId, 'ACCEPT')}
                        disabled={isActionLoading}
                        style={styles.approveBtn}
                      >
                        <Text style={styles.approveBtnText}>Accept Split ✓</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* TAB 1: EXPENSES TIMELINE */}
          {activeTab === 'expenses' && (
            <View>
              {/* Category Filter Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <Pressable
                  onPress={() => setSelectedCategory('ALL')}
                  style={[styles.catPill, selectedCategory === 'ALL' && styles.catPillActive]}
                >
                  <Text style={[styles.catPillText, selectedCategory === 'ALL' && styles.catPillTextActive]}>
                    All
                  </Text>
                </Pressable>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.key}
                    onPress={() => setSelectedCategory(c.key)}
                    style={[styles.catPill, selectedCategory === c.key && styles.catPillActive]}
                  >
                    <Text style={styles.catPillIcon}>{c.icon}</Text>
                    <Text style={[styles.catPillText, selectedCategory === c.key && styles.catPillTextActive]}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {isLoading ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.centerBoxText}>Loading live expenses...</Text>
                </View>
              ) : filteredExpenses.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🧾</Text>
                  <Text style={styles.emptyTitle}>No Expenses Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Add food, travel, stay, or shopping bills. Divide & Rule automatically computes fair shares and minimizes debts.
                  </Text>
                  <Pressable onPress={openAddExpenseModal} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>+ Add First Expense</Text>
                  </Pressable>
                </View>
              ) : (
                filteredExpenses.map((exp) => {
                  const catObj = CATEGORIES.find((c) => c.key === exp.category) || { icon: '💳' };
                  const isSettlement = exp.category === 'SETTLEMENT';
                  const isPayer = exp.isPayer;
                  const myShare = exp.myShareMinor;

                  return (
                    <View key={exp.id} style={[styles.expenseCard, isSettlement && styles.settlementCardBorder]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.catIconCircle, isSettlement && { backgroundColor: 'rgba(0, 229, 153, 0.15)' }]}>
                          <Text style={{ fontSize: 18 }}>{isSettlement ? '🤝' : catObj.icon}</Text>
                        </View>

                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.expenseTitle}>{exp.title}</Text>
                          <Text style={styles.expenseSub}>
                            Paid by <Text style={{ color: colors.primary, fontWeight: '700' }}>@{exp.paidBy?.username}</Text> • {exp.splitCount} {exp.splitCount === 1 ? 'member' : 'members'}
                          </Text>
                          <Text style={styles.expenseDate}>
                            {new Date(exp.expenseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.expenseTotal}>₹{(exp.amountMinor / 100).toFixed(0)}</Text>
                          {!isSettlement && (
                            <Text style={[styles.myShareBadge, isPayer ? { color: colors.primary } : { color: '#FFA285' }]}>
                              {isPayer ? `You paid ₹${(exp.amountMinor / 100).toFixed(0)}` : `Your share ₹${(myShare / 100).toFixed(0)}`}
                            </Text>
                          )}
                          {isPayer && (
                            <Pressable onPress={() => deleteExpense(tripId, exp.id)} hitSlop={6} style={{ marginTop: 4 }}>
                              <Text style={styles.deleteExpenseText}>Delete</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>

                      {/* Participant Approval Chips */}
                      {exp.splitBetween && exp.splitBetween.length > 0 && !isSettlement && (
                        <View style={styles.splitChipsRow}>
                          {exp.splitBetween.map((s, sIdx) => {
                            const isAcc = s.status === 'ACCEPTED';
                            const isDec = s.status === 'DECLINED';
                            return (
                              <View
                                key={sIdx}
                                style={[
                                  styles.splitStatusChip,
                                  isAcc ? styles.chipAccepted : isDec ? styles.chipDeclined : styles.chipPending,
                                ]}
                              >
                                <Text style={styles.splitChipText}>
                                  @{s.username} {isAcc ? '✓' : isDec ? '✕' : '⏳'}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* Immediate In-Card Approval Action when user has not yet approved */}
                      {exp.needsMyApproval && (
                        <View style={styles.cardApprovalBox}>
                          <Text style={styles.cardApprovalText}>
                            Approve your split of ₹{(myShare / 100).toFixed(0)}?
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable
                              onPress={() => respondToExpenseSplit(tripId, exp.id, 'DECLINE')}
                              disabled={isActionLoading}
                              style={styles.cardDeclineBtn}
                            >
                              <Text style={styles.cardDeclineText}>Decline ✕</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => respondToExpenseSplit(tripId, exp.id, 'ACCEPT')}
                              disabled={isActionLoading}
                              style={styles.cardAcceptBtn}
                            >
                              <Text style={styles.cardAcceptText}>Accept ✓</Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 2: BALANCES */}
          {activeTab === 'balances' && (
            <View>
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionHeading}>Member Balances</Text>
                <Text style={styles.sectionHeadingSub}>{balances.length} members</Text>
              </View>

              {balances.map((b) => {
                const net = b.netBalanceMinor;
                const isPositive = net > 0;
                const isZero = net === 0;
                const statusColor = isPositive ? colors.primary : isZero ? colors.textSecondary : '#FFA285';
                const statusText = isPositive ? `+₹${(net / 100).toFixed(0)}` : isZero ? 'Settled' : `-₹${(Math.abs(net) / 100).toFixed(0)}`;

                return (
                  <View key={b.userId} style={styles.balanceCard}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {(b.fullName || b.username || 'U').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.memberName}>{b.fullName || b.username}</Text>
                        {b.role === 'OWNER' && <View style={styles.ownerBadge}><Text style={styles.ownerBadgeText}>Owner</Text></View>}
                      </View>
                      <Text style={styles.memberHandle}>@{b.username}</Text>
                      <Text style={styles.memberStatsRow}>
                        Paid: ₹{(b.totalPaidMinor / 100).toFixed(0)} • Share: ₹{(b.totalShareMinor / 100).toFixed(0)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.balanceNet, { color: statusColor }]}>{statusText}</Text>
                      <Text style={styles.balanceStatusSub}>
                        {isPositive ? 'Is Owed' : isZero ? 'All Good' : 'Owes Group'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* TAB 3: SETTLEMENT PLAN & ONE-TAP SETTLE UP */}
          {activeTab === 'settlements' && (
            <View>
              <View style={styles.settleHeroInfo}>
                <Text style={styles.settleHeroTitle}>⚡ Greedy Debt Minimization</Text>
                <Text style={styles.settleHeroDesc}>
                  Our algorithm simplifies multi-party IOUs into the minimum number of payments. Tap "Settle Up" to record payment and instantly zero out balances.
                </Text>
              </View>

              {settlementPlan.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>🎉</Text>
                  <Text style={styles.emptyTitle}>All Settled Up!</Text>
                  <Text style={styles.emptySubtitle}>
                    There are no outstanding debts in this trip. Every member has paid their fair share!
                  </Text>
                </View>
              ) : (
                settlementPlan.map((txn, idx) => (
                  <View key={idx} style={styles.settlePlanCard}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.settleFlowRow}>
                        <View style={styles.settleUserBubble}>
                          <Text style={styles.settleBubbleName}>@{txn.fromUsername}</Text>
                          <Text style={styles.settleBubbleRole}>Debtor</Text>
                        </View>

                        <View style={styles.settleArrowWrap}>
                          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                            <Path d="M5 12H19M19 12L12 5M19 12L12 19" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </Svg>
                          <Text style={styles.settleArrowAmount}>₹{(txn.amountMinor / 100).toFixed(0)}</Text>
                        </View>

                        <View style={[styles.settleUserBubble, { borderColor: colors.primary }]}>
                          <Text style={[styles.settleBubbleName, { color: colors.primary }]}>@{txn.toUsername}</Text>
                          <Text style={styles.settleBubbleRole}>Creditor</Text>
                        </View>
                      </View>

                      <Text style={styles.settlePlainEnglish}>
                        <Text style={{ fontWeight: '700', color: '#fff' }}>@{txn.fromUsername}</Text> pays <Text style={{ fontWeight: '700', color: colors.primary }}>@{txn.toUsername}</Text> ₹{(txn.amountMinor / 100).toFixed(0)}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => setSettleModalData(txn)}
                      style={styles.settleUpBtn}
                    >
                      <Text style={styles.settleUpBtnText}>Settle Up ➔</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* ─── ADD EXPENSE MODAL ─── */}
        <Modal visible={isAddModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Add Trip Expense</Text>
                <Pressable onPress={() => setIsAddModalVisible(false)} hitSlop={8}>
                  <Text style={styles.sheetClose}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.75 }} showsVerticalScrollIndicator={false}>
                {/* Title & Amount */}
                <Text style={styles.inputLabel}>EXPENSE TITLE</Text>
                <TextInput
                  value={expenseTitle}
                  onChangeText={setExpenseTitle}
                  placeholder="e.g. Seafood Dinner, Uber, Resort Villa"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.modalInput}
                />

                <Text style={styles.inputLabel}>TOTAL AMOUNT (₹)</Text>
                <TextInput
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  style={[styles.modalInput, { fontSize: 20, fontWeight: '800', color: colors.primary }]}
                />

                {/* Category Selector */}
                <Text style={styles.inputLabel}>CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  {CATEGORIES.map((c) => (
                    <Pressable
                      key={c.key}
                      onPress={() => setExpenseCategory(c.key)}
                      style={[styles.modalCatPill, expenseCategory === c.key && styles.modalCatPillActive]}
                    >
                      <Text style={{ fontSize: 16 }}>{c.icon}</Text>
                      <Text style={[styles.modalCatText, expenseCategory === c.key && styles.modalCatTextActive]}>
                        {c.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Paid By Selector */}
                <Text style={styles.inputLabel}>WHO PAID?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  {(currentTrip.members || balances).map((m) => {
                    const u = m.username || m.userId?.username;
                    if (!u) return null;
                    const isSelected = paidBy.toLowerCase() === u.toLowerCase();
                    return (
                      <Pressable
                        key={u}
                        onPress={() => setPaidBy(u)}
                        style={[styles.modalPayerChip, isSelected && styles.modalPayerChipActive]}
                      >
                        <Text style={[styles.modalPayerText, isSelected && styles.modalPayerTextActive]}>
                          @{u} {isSelected ? '(Payer)' : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Split Mode Segmented Tabs */}
                <Text style={styles.inputLabel}>SPLIT METHOD</Text>
                <View style={styles.splitModeSegment}>
                  <Pressable
                    onPress={() => setSplitMode('EQUAL')}
                    style={[styles.splitModeTab, splitMode === 'EQUAL' && styles.splitModeTabActive]}
                  >
                    <Text style={[styles.splitModeText, splitMode === 'EQUAL' && styles.splitModeTextActive]}>
                      Equal (=)
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSplitMode('PERCENTAGE')}
                    style={[styles.splitModeTab, splitMode === 'PERCENTAGE' && styles.splitModeTabActive]}
                  >
                    <Text style={[styles.splitModeText, splitMode === 'PERCENTAGE' && styles.splitModeTextActive]}>
                      Percentage (%)
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSplitMode('EXACT')}
                    style={[styles.splitModeTab, splitMode === 'EXACT' && styles.splitModeTabActive]}
                  >
                    <Text style={[styles.splitModeText, splitMode === 'EXACT' && styles.splitModeTextActive]}>
                      Exact Share (₹)
                    </Text>
                  </Pressable>
                </View>

                {/* Member Breakdown per Mode */}
                <Text style={styles.inputLabel}>MEMBERS INVOLVED ({selectedMembers.length})</Text>
                {(currentTrip.members || balances).map((m) => {
                  const u = m.username || m.userId?.username;
                  if (!u) return null;
                  const isChecked = selectedMembers.includes(u);

                  return (
                    <View key={u} style={styles.splitMemberRow}>
                      <Pressable onPress={() => handleToggleMember(u)} style={styles.splitCheckBtn}>
                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                          {isChecked && <Text style={{ color: '#051B14', fontSize: 11, fontWeight: '900' }}>✓</Text>}
                        </View>
                        <Text style={[styles.splitMemberName, !isChecked && { opacity: 0.5 }]}>@{u}</Text>
                      </Pressable>

                      {isChecked && splitMode === 'PERCENTAGE' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TextInput
                            value={memberSplits[u] || ''}
                            onChangeText={(val) => setMemberSplits({ ...memberSplits, [u]: val })}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                            style={styles.inlineSplitInput}
                          />
                          <Text style={{ color: colors.primary, fontWeight: '800', marginLeft: 4 }}>%</Text>
                        </View>
                      )}

                      {isChecked && splitMode === 'EXACT' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ color: colors.primary, fontWeight: '800', marginRight: 4 }}>₹</Text>
                          <TextInput
                            value={memberSplits[u] || ''}
                            onChangeText={(val) => setMemberSplits({ ...memberSplits, [u]: val })}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                            style={styles.inlineSplitInput}
                          />
                        </View>
                      )}

                      {isChecked && splitMode === 'EQUAL' && (
                        <Text style={styles.equalSharePreview}>
                          ₹{expenseAmount ? (parseFloat(expenseAmount) / selectedMembers.length).toFixed(0) : '0'}
                        </Text>
                      )}
                    </View>
                  );
                })}

                <Pressable
                  onPress={handleSaveExpense}
                  disabled={isActionLoading}
                  style={styles.saveExpenseBtn}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color="#051B14" />
                  ) : (
                    <Text style={styles.saveExpenseBtnText}>Add Expense to Trip</Text>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ─── SETTLE UP CONFIRMATION MODAL ─── */}
        <Modal visible={!!settleModalData} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.settleConfirmCard}>
              <Text style={styles.settleConfirmTitle}>Record Payment & Request Approval</Text>
              <Text style={styles.settleConfirmSub}>
                Select how you paid. An approval request will be sent to your friend to verify and zero out the balance.
              </Text>

              {settleModalData && (
                <View style={styles.settleDetailsBox}>
                  <Text style={styles.settleDetailsAmount}>
                    ₹{(settleModalData.amountMinor / 100).toFixed(0)}
                  </Text>
                  <Text style={styles.settleDetailsFromTo}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>@{settleModalData.fromUsername}</Text>
                    {'  ➔  '}
                    <Text style={{ color: colors.primary, fontWeight: '800' }}>@{settleModalData.toUsername}</Text>
                  </Text>
                </View>
              )}

              {/* Payment Mode Selector */}
              <Text style={styles.inputLabel}>PAYMENT METHOD</Text>
              <View style={styles.paymentMethodRow}>
                {[
                  { key: 'UPI', label: '📱 UPI' },
                  { key: 'CASH', label: '💵 Cash' },
                  { key: 'BANK_TRANSFER', label: '🏦 Bank' },
                ].map((pm) => (
                  <Pressable
                    key={pm.key}
                    onPress={() => setSettlePaymentMethod(pm.key)}
                    style={[
                      styles.paymentMethodChip,
                      settlePaymentMethod === pm.key && styles.paymentMethodChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentMethodChipText,
                        settlePaymentMethod === pm.key && styles.paymentMethodChipTextActive,
                      ]}
                    >
                      {pm.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Reference ID or Note */}
              <Text style={styles.inputLabel}>TRANSACTION REFERENCE / NOTE (OPTIONAL)</Text>
              <TextInput
                value={settleProofOrNote}
                onChangeText={setSettleProofOrNote}
                placeholder="e.g. UPI Ref / UTR / Paid at Cafe"
                placeholderTextColor={colors.textSecondary}
                style={[styles.modalInput, { marginBottom: 16 }]}
              />

              <View style={styles.settleActionsRow}>
                <Pressable onPress={() => setSettleModalData(null)} style={styles.cancelSettleBtn}>
                  <Text style={styles.cancelSettleText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmSettleUp}
                  disabled={isActionLoading}
                  style={styles.confirmSettleBtn}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color="#051B14" />
                  ) : (
                    <Text style={styles.confirmSettleText}>Send Request ➔</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#051B14' },
  ambientHaloTop: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0, 229, 153, 0.08)',
  },
  safeArea: { flex: 1 },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitleCenter: { flex: 1, marginHorizontal: 12 },
  appBarTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  appBarSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  addExpenseNavBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  addExpenseNavBtnText: { fontSize: 12, fontWeight: '800', color: '#051B14' },
  successBanner: {
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.35)',
    marginHorizontal: 18,
    marginTop: 8,
    padding: 8,
    borderRadius: 10,
  },
  successBannerText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  errorBanner: {
    backgroundColor: 'rgba(255, 92, 92, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 92, 0.35)',
    marginHorizontal: 18,
    marginTop: 8,
    padding: 8,
    borderRadius: 10,
  },
  errorBannerText: { color: '#FFA285', fontSize: 12, fontWeight: '700' },
  heroCard: {
    backgroundColor: 'rgba(13, 53, 40, 0.65)',
    marginHorizontal: 18,
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroSmallLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, color: colors.textSecondary, marginBottom: 4 },
  heroBigValue: { fontSize: 24, fontWeight: '900', color: '#fff' },
  heroSubtext: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  heroBalanceBox: {
    backgroundColor: 'rgba(10, 43, 32, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'flex-end',
  },
  heroBalValue: { fontSize: 18, fontWeight: '800' },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    marginTop: 14,
    marginBottom: 6,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabItemActive: {
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: '800' },
  settleBadge: {
    marginLeft: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  settleBadgeText: { fontSize: 10, fontWeight: '800', color: '#051B14' },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 18, paddingTop: 10 },
  categoryScroll: { marginBottom: 12 },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
  },
  catPillActive: { backgroundColor: 'rgba(0, 229, 153, 0.18)', borderWidth: 1, borderColor: colors.primary },
  catPillIcon: { marginRight: 4, fontSize: 13 },
  catPillText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  catPillTextActive: { color: colors.primary, fontWeight: '800' },
  centerBox: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  centerBoxText: { fontSize: 12, color: colors.textSecondary },
  emptyCard: {
    backgroundColor: 'rgba(13, 53, 40, 0.45)',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 6 },
  emptySubtitle: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  primaryBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  primaryBtnText: { fontSize: 12, fontWeight: '800', color: '#051B14' },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 53, 40, 0.65)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  settlementCardBorder: { borderColor: 'rgba(0, 229, 153, 0.4)', backgroundColor: 'rgba(13, 53, 40, 0.85)' },
  catIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0F3C2C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  expenseTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  expenseSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  expenseDate: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  expenseTotal: { fontSize: 15, fontWeight: '800', color: '#fff' },
  myShareBadge: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  deleteExpenseText: { fontSize: 10, color: '#FFA285', fontWeight: '700' },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionHeading: { fontSize: 13, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeadingSub: { fontSize: 11, color: colors.textSecondary },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 53, 40, 0.65)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F3C2C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.3)',
  },
  memberAvatarText: { fontSize: 13, fontWeight: '800', color: colors.primary },
  memberName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  ownerBadge: { backgroundColor: 'rgba(0, 229, 153, 0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  ownerBadgeText: { fontSize: 9, fontWeight: '800', color: colors.primary },
  memberHandle: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  memberStatsRow: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  balanceNet: { fontSize: 15, fontWeight: '800' },
  balanceStatusSub: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  settleHeroInfo: {
    backgroundColor: 'rgba(0, 229, 153, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.25)',
  },
  settleHeroTitle: { fontSize: 13, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  settleHeroDesc: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
  settlePlanCard: {
    backgroundColor: 'rgba(13, 53, 40, 0.75)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 153, 0.3)',
  },
  settleFlowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  settleUserBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 43, 32, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    minWidth: 80,
  },
  settleBubbleName: { fontSize: 12, fontWeight: '800', color: '#fff' },
  settleBubbleRole: { fontSize: 9, color: colors.textSecondary, marginTop: 1 },
  settleArrowWrap: { alignItems: 'center', gap: 2 },
  settleArrowAmount: { fontSize: 13, fontWeight: '900', color: colors.primary },
  settlePlainEnglish: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
  settleUpBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleUpBtnText: { fontSize: 13, fontWeight: '800', color: '#051B14' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#08251C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  sheetClose: { fontSize: 18, color: colors.textSecondary, padding: 4 },
  inputLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.6, marginBottom: 6, marginTop: 10 },
  modalInput: {
    backgroundColor: 'rgba(10, 43, 32, 0.8)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalCatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    gap: 6,
  },
  modalCatPillActive: { backgroundColor: 'rgba(0, 229, 153, 0.2)', borderWidth: 1, borderColor: colors.primary },
  modalCatText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  modalCatTextActive: { color: colors.primary, fontWeight: '800' },
  modalPayerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 8,
  },
  modalPayerChipActive: { backgroundColor: 'rgba(0, 229, 153, 0.2)', borderWidth: 1, borderColor: colors.primary },
  modalPayerText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  modalPayerTextActive: { color: colors.primary, fontWeight: '800' },
  splitModeSegment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 43, 32, 0.8)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  splitModeTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  splitModeTabActive: { backgroundColor: colors.primary },
  splitModeText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  splitModeTextActive: { color: '#051B14', fontWeight: '900' },
  splitMemberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  splitCheckBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  splitMemberName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  inlineSplitInput: {
    backgroundColor: 'rgba(10, 43, 32, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 36,
    width: 70,
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  equalSharePreview: { fontSize: 13, fontWeight: '700', color: colors.primary },
  saveExpenseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  saveExpenseBtnText: { fontSize: 14, fontWeight: '800', color: '#051B14' },
  settleConfirmCard: {
    backgroundColor: '#08251C',
    borderRadius: 22,
    padding: 24,
    marginHorizontal: 20,
    alignSelf: 'center',
    width: width - 40,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 153, 0.3)',
  },
  settleConfirmTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 6 },
  settleConfirmSub: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 16 },
  settleDetailsBox: {
    backgroundColor: 'rgba(10, 43, 32, 0.8)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  settleDetailsAmount: { fontSize: 28, fontWeight: '900', color: colors.primary, marginBottom: 6 },
  settleDetailsFromTo: { fontSize: 13, color: colors.textSecondary },
  settleActionsRow: { flexDirection: 'row', gap: 10 },
  cancelSettleBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelSettleText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  confirmSettleBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmSettleText: { fontSize: 13, fontWeight: '800', color: '#051B14' },

  // 2-Step Settlement Verification Styles
  pendingSection: { marginBottom: 14 },
  approvalAlertCard: {
    backgroundColor: 'rgba(23, 80, 61, 0.85)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  approvalHeader: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  approvalTitle: { fontSize: 13, fontWeight: '800', color: colors.primary, marginBottom: 2 },
  approvalBody: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  approvalBtnRow: { flexDirection: 'row', gap: 8 },
  rejectBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 162, 133, 0.15)',
    borderWidth: 1,
    borderColor: '#FFA285',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectBtnText: { fontSize: 12, fontWeight: '800', color: '#FFA285' },
  approveBtn: {
    flex: 1.6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveBtnText: { fontSize: 12, fontWeight: '900', color: '#051B14' },
  pendingOutgoingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(10, 43, 32, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 222, 105, 0.4)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  pendingOutgoingTitle: { fontSize: 12, fontWeight: '800', color: '#FFDE69', marginBottom: 2 },
  pendingOutgoingBody: { fontSize: 11, color: colors.textSecondary, lineHeight: 15 },
  paymentMethodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  paymentMethodChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  paymentMethodChipActive: {
    backgroundColor: 'rgba(0, 229, 153, 0.18)',
    borderColor: colors.primary,
  },
  paymentMethodChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  paymentMethodChipTextActive: { color: colors.primary, fontWeight: '900' },

  // Bill Split Approval Styles
  splitAlertCard: {
    backgroundColor: 'rgba(16, 63, 48, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 153, 0.4)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  splitAlertTitle: { fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 2 },
  splitChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  splitStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipAccepted: { backgroundColor: 'rgba(0, 229, 153, 0.12)', borderColor: 'rgba(0, 229, 153, 0.35)' },
  chipPending: { backgroundColor: 'rgba(255, 222, 105, 0.12)', borderColor: 'rgba(255, 222, 105, 0.35)' },
  chipDeclined: { backgroundColor: 'rgba(255, 162, 133, 0.12)', borderColor: 'rgba(255, 162, 133, 0.35)' },
  splitChipText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  cardApprovalBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardApprovalText: { fontSize: 12, fontWeight: '700', color: '#FFDE69' },
  cardDeclineBtn: {
    backgroundColor: 'rgba(255, 162, 133, 0.15)',
    borderWidth: 1,
    borderColor: '#FFA285',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardDeclineText: { fontSize: 11, fontWeight: '800', color: '#FFA285' },
  cardAcceptBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardAcceptText: { fontSize: 11, fontWeight: '900', color: '#051B14' },
});

export default TripDetailsScreen;
