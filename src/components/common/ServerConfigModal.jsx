import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors } from '../../config/colors';
import api from '../../services/api';

export const ServerConfigModal = ({ visible, onClose }) => {
  const [urlInput, setUrlInput] = useState(api.getBaseUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  useEffect(() => {
    if (visible) {
      setUrlInput(api.getBaseUrl());
      setTestResult(null);
    }
  }, [visible]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await api.checkHealth(urlInput);
      setTestResult({
        success: true,
        message: `Connected! ${data.service || 'API'} (v${data.version || '1.0.0'}) is online.`,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: `${err.message || 'Cannot reach server'}. Check Wi-Fi connection.`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const saved = api.setBaseUrl(urlInput);
    setUrlInput(saved);
    if (onClose) onClose();
  };

  const setPreset = (preset) => {
    setUrlInput(preset);
    setTestResult(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>⚙️ Server Settings</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Configure the backend server URL your phone connects to. Make sure your phone and laptop are on the same Wi-Fi!
          </Text>

          {/* URL Input */}
          <Text style={styles.label}>Server Base URL</Text>
          <TextInput
            style={styles.input}
            value={urlInput}
            onChangeText={(txt) => {
              setUrlInput(txt);
              setTestResult(null);
            }}
            placeholder="http://192.168.1.11:5001/api"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Quick Presets */}
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setPreset('http://192.168.1.11:5001/api')}
            >
              <Text style={styles.presetText}>Home Wi-Fi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setPreset('http://10.0.2.2:5001/api')}
            >
              <Text style={styles.presetText}>Android Emulator</Text>
            </TouchableOpacity>
          </View>

          {/* Test Status Banner */}
          {testResult && (
            <View
              style={[
                styles.resultBanner,
                testResult.success ? styles.resultSuccess : styles.resultError,
              ]}
            >
              <Text style={styles.resultText}>
                {testResult.success ? '✓' : '⚠️'} {testResult.message}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.testButton, testing && styles.btnDisabled]}
              onPress={handleTest}
              disabled={testing}
              activeOpacity={0.8}
            >
              {testing ? (
                <ActivityIndicator size="small" color={colors.mint} />
              ) : (
                <Text style={styles.testButtonText}>Test Connection</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save & Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    fontSize: 18,
    color: colors.textMuted,
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  presetChip: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  presetText: {
    fontSize: 11,
    color: colors.mint,
    fontWeight: '600',
  },
  resultBanner: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  resultSuccess: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: colors.mint,
  },
  resultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.coral,
  },
  resultText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  testButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mint,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.mint,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default ServerConfigModal;
