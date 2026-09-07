import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../config/colors';

/**
 * Modern 5-Tab Floating Bottom Navigation Bar
 * Features an elevated Electric Mint center CTA for "Add Expense".
 */
export const FloatingBottomBar = ({
  activeTab = 'home',
  onTabPress,
  onAddExpensePress,
}) => {
  const tabs = [
    { key: 'home', label: 'Home', icon: (active) => <HomeIcon active={active} /> },
    { key: 'trips', label: 'Trips', icon: (active) => <TripsIcon active={active} /> },
    { key: 'add', label: '', isCenter: true },
    { key: 'friends', label: 'Friends', icon: (active) => <FriendsIcon active={active} /> },
    { key: 'profile', label: 'Profile', icon: (active) => <ProfileIcon active={active} /> },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.dock}>
        {tabs.map((tab) => {
          if (tab.isCenter) {
            return (
              <View key="center-action" style={styles.centerButtonWrapper}>
                <Pressable
                  onPress={onAddExpensePress}
                  style={({ pressed }) => [
                    styles.centerButton,
                    pressed && styles.centerButtonPressed,
                  ]}
                >
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 5V19M5 12H19"
                      stroke="#051B14"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  </Svg>
                </Pressable>
              </View>
            );
          }

          const isActive = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabPress?.(tab.key)}
              style={styles.tabItem}
            >
              <View style={styles.iconWrapper}>{tab.icon(isActive)}</View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.activeLabel : styles.inactiveLabel,
                ]}
              >
                {tab.label}
              </Text>
              {isActive ? <View style={styles.activeIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

// Clean Vector Tab Icons
const HomeIcon = ({ active }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10L12 3L21 10V20C21 20.5523 20.5523 21 20 21H15V14H9V21H4C3.44772 21 3 20.5523 3 20V10Z"
      stroke={active ? colors.primary : colors.textSecondary}
      strokeWidth="2"
      fill={active ? 'rgba(0, 229, 153, 0.15)' : 'none'}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TripsIcon = ({ active }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 17H5C3.89543 17 3 16.1046 3 15V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V15C21 16.1046 20.1046 17 19 17Z"
      stroke={active ? colors.primary : colors.textSecondary}
      strokeWidth="2"
      fill={active ? 'rgba(0, 229, 153, 0.15)' : 'none'}
    />
    <Path d="M16 21H8" stroke={active ? colors.primary : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
    <Path d="M12 17V21" stroke={active ? colors.primary : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const FriendsIcon = ({ active }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21"
      stroke={active ? colors.primary : colors.textSecondary}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Circle
      cx="12"
      cy="11"
      r="4"
      stroke={active ? colors.primary : colors.textSecondary}
      strokeWidth="2"
      fill={active ? 'rgba(0, 229, 153, 0.15)' : 'none'}
    />
  </Svg>
);

const ProfileIcon = ({ active }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="7"
      r="4"
      stroke={active ? colors.primary : colors.textSecondary}
      strokeWidth="2"
      fill={active ? 'rgba(0, 229, 153, 0.15)' : 'none'}
    />
    <Path
      d="M4 21C4 17.5 7.5 15 12 15C16.5 15 20 17.5 20 21"
      stroke={active ? colors.primary : colors.textSecondary}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 43, 32, 0.92)',
    borderRadius: 32,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  iconWrapper: {
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  inactiveLabel: {
    color: colors.textSecondary,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  centerButtonWrapper: {
    top: -18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#051B14',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  centerButtonPressed: {
    transform: [{ scale: 0.93 }],
  },
});

export default FloatingBottomBar;
