import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../config/colors';

/**
 * StepIndicator Component
 * Visual progress stepper: ●━━○━━○ with step names and glowing completed states.
 */
export const StepIndicator = ({ currentStep = 1, totalSteps = 3 }) => {
  const steps = [
    { number: 1, label: 'Details' },
    { number: 2, label: 'Members' },
    { number: 3, label: 'Review' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;

          return (
            <React.Fragment key={step.number}>
              {/* Connector Line */}
              {index > 0 ? (
                <View
                  style={[
                    styles.connector,
                    step.number <= currentStep
                      ? styles.connectorActive
                      : styles.connectorInactive,
                  ]}
                />
              ) : null}

              {/* Node Circle */}
              <View style={styles.nodeWrapper}>
                <View
                  style={[
                    styles.node,
                    isActive && styles.nodeActive,
                    isCompleted && styles.nodeCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Text style={styles.checkText}>✓</Text>
                  ) : (
                    <Text
                      style={[
                        styles.numberText,
                        isActive && styles.numberTextActive,
                      ]}
                    >
                      {step.number}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    isActive && styles.labelActive,
                    isCompleted && styles.labelCompleted,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 280,
  },
  nodeWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  nodeCompleted: {
    backgroundColor: '#0D3528',
    borderColor: colors.primary,
  },
  numberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  numberTextActive: {
    color: colors.background,
    fontWeight: '800',
  },
  checkText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  labelCompleted: {
    color: colors.textSecondary,
  },
  connector: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    marginTop: -16,
  },
  connectorActive: {
    backgroundColor: colors.primary,
  },
  connectorInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default StepIndicator;
