import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../config/colors';

/**
 * BrandLogo Component
 * Custom geometric emblem representing fairness, balanced division, and unity.
 * Includes an ambient electric mint halo.
 */
export const BrandLogo = ({ size = 90 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Ambient Halo Glow */}
      <View
        style={[
          styles.ambientHalo,
          {
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: (size * 1.5) / 2,
          },
        ]}
      />

      {/* SVG Emblem Mark */}
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Defs>
          <LinearGradient id="mintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4EFEB3" />
            <Stop offset="100%" stopColor="#00E599" />
          </LinearGradient>
          <LinearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#103F30" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#08231A" stopOpacity="0.95" />
          </LinearGradient>
        </Defs>

        {/* Outer Frosted Squircle Shield */}
        <Path
          d="M26 8h44c14 0 20 6 20 20v40c0 14-6 20-20 20H26C12 88 6 82 6 68V28C6 14 12 8 26 8z"
          fill="url(#cardGrad)"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.5"
        />

        {/* Upper Share Arc */}
        <Path
          d="M30 38C30 28 38 22 48 22H52"
          stroke="url(#mintGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Lower Share Arc */}
        <Path
          d="M66 58C66 68 58 74 48 74H44"
          stroke="url(#mintGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Dynamic Split Axis (Division with Balance) */}
        <Path
          d="M60 30L36 66"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Equilibrium Node Points */}
        <Circle cx="32" cy="38" r="3.5" fill="#4EFEB3" />
        <Circle cx="64" cy="58" r="3.5" fill="#4EFEB3" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ambientHalo: {
    position: 'absolute',
    backgroundColor: colors.ambientGlow,
    opacity: 0.85,
  },
});

export default BrandLogo;
