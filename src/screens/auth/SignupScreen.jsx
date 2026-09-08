import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors } from '../../config/colors';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { ServerConfigModal } from '../../components/common/ServerConfigModal';

export const SignupScreen = ({ navigation, onNavigateToLogin, onSignupSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [serverConfigVisible, setServerConfigVisible] = useState(false);

  const setUser = useAuthStore((state) => state.setUser);

  const handleSignup = async () => {
    setErrorMessage('');
    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanFullName || !cleanUsername || !cleanEmail || !password) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      setErrorMessage('Username must be 3-20 letters, numbers, or underscores');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const data = await api.signup(cleanFullName, cleanUsername, cleanEmail, password);

      setUser(data.user, data.token);

      if (onSignupSuccess) {
        onSignupSuccess(data.user);
      } else if (navigation) {
        navigation.replace('Home');
      }
    } catch (err) {
      const rawMsg = err.message || '';
      if (rawMsg.includes('Network') || rawMsg.includes('Failed to fetch') || rawMsg.includes('connect')) {
        setErrorMessage(`Network error: Cannot reach server at ${api.getBaseUrl()}. Tap "Server Settings" above to verify.`);
      } else {
        setErrorMessage(rawMsg || 'Unable to connect to server');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>✦ NEW ACCOUNT</Text>
            </View>
            <TouchableOpacity
              style={styles.serverPill}
              onPress={() => setServerConfigVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.serverPillText}>⚙️ Server</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Join Divide & Rule</Text>
          <Text style={styles.subtitle}>
            Split travel and everyday expenses with friends fairly. Zero awkward math.
          </Text>
        </View>

        {/* Error Alert */}
        {errorMessage ? (
          <TouchableOpacity
            style={styles.errorBanner}
            onPress={() => setServerConfigVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            <Text style={styles.errorHintText}>Tap to check server settings ➔</Text>
          </TouchableOpacity>
        ) : null}

        {/* Form Inputs */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Adarsh Goutam"
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Unique Username</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. @adarshg"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="adarsh@gmail.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.toggleText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSignup}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account ➔</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Toggle */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity
            onPress={onNavigateToLogin || (() => navigation?.navigate('Login'))}
          >
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ServerConfigModal
        visible={serverConfigVisible}
        onClose={() => setServerConfigVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 28,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  serverPill: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  serverPillText: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: '700',
  },
  brandBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 229, 153, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.3)',
  },
  errorHintText: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  brandBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 92, 92, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 92, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#FFA285',
    fontSize: 13,
    fontWeight: '600',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: colors.textPrimary,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default SignupScreen;
