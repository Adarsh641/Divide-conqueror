import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../config/colors';

/**
 * MemberChip Component
 * Frosted emerald rounded chip with avatar initials and remove button.
 */
export const MemberChip = ({
  name,
  isOrganizer = false,
  onRemove,
}) => {
  const getInitials = (n) => {
    if (!n) return '?';
    const parts = n.trim().split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <View style={[styles.chip, isOrganizer && styles.organizerChip]}>
      {/* Avatar Circle */}
      <View style={[styles.avatar, isOrganizer && styles.organizerAvatar]}>
        <Text style={styles.avatarText}>{getInitials(name)}</Text>
      </View>

      {/* Name */}
      <Text style={styles.nameText} numberOfLines={1}>
        {name} {isOrganizer ? '(You)' : ''}
      </Text>

      {/* Remove Cross */}
      {!isOrganizer && onRemove ? (
        <Pressable
          onPress={onRemove}
          style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}
          hitSlop={8}
        >
          <Text style={styles.removeIcon}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A2B20',
    borderRadius: 9999,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  organizerChip: {
    borderColor: 'rgba(0, 229, 153, 0.3)',
    backgroundColor: 'rgba(0, 229, 153, 0.08)',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#134737',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerAvatar: {
    backgroundColor: colors.primary,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  nameText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  removeBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  removeBtnPressed: {
    backgroundColor: 'rgba(255, 92, 92, 0.3)',
  },
  removeIcon: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: -2,
  },
});

export default MemberChip;
