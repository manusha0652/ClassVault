import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SEED_BATCHES } from '../db/schema';
import { colors } from '../theme';

interface AddLocationModalProps {
  visible: boolean;
  onSubmit: (name: string, defaultFees: number[]) => Promise<void>;
  onClose: () => void;
}

export function AddLocationModal({ visible, onSubmit, onClose }: AddLocationModalProps) {
  const [name, setName] = useState('');
  const [defaultFees, setDefaultFees] = useState(() => SEED_BATCHES.map(() => ''));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function submit(): Promise<void> {
    const fees = defaultFees.map(Number);
    if (!name.trim() || defaultFees.some((value) => value.trim() === '') || fees.some((fee) => !Number.isFinite(fee) || fee < 0)) {
      setErrorMessage('Enter a location name and a valid starting fee for every grade.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSubmit(name.trim(), fees);
      setName('');
      setDefaultFees(SEED_BATCHES.map(() => ''));
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Location could not be saved.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add teaching location</Text>
          <TextInput
            accessibilityLabel="Location name"
            autoCapitalize="words"
            onChangeText={setName}
            placeholder="Location name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={name}
          />
          <Text style={styles.sectionTitle}>Starting weekly fee for each grade</Text>
          <ScrollView style={styles.feeList} keyboardShouldPersistTaps="handled">
            {SEED_BATCHES.map((batchName, index) => (
              <View key={batchName} style={styles.feeRow}>
                <Text style={styles.gradeName}>{batchName}</Text>
                <Text style={styles.currency}>Rs.</Text>
                <TextInput
                  accessibilityLabel={`${batchName} starting weekly fee`}
                  keyboardType="decimal-pad"
                  onChangeText={(value) => setDefaultFees((current) => current.map((fee, feeIndex) => feeIndex === index ? value : fee))}
                  placeholder="Amount"
                  placeholderTextColor={colors.muted}
                  style={styles.feeInput}
                  value={defaultFees[index]}
                />
              </View>
            ))}
          </ScrollView>
          {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
          <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void submit()} style={[styles.submitButton, isSaving && styles.disabled]}>
            <Text style={styles.submitText}>{isSaving ? 'Creating…' : 'Create location & classes'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21, 26, 38, 0.5)' },
  sheet: { gap: 12, maxHeight: '90%', padding: 20, paddingBottom: 28, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.surface },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  input: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.text },
  sectionTitle: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  feeList: { maxHeight: 300 },
  feeRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  gradeName: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  currency: { color: colors.muted, fontSize: 11 },
  feeInput: { width: 112, minHeight: 38, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 9, color: colors.text, textAlign: 'right', fontSize: 13 },
  submitButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.gold },
  submitText: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  cancelButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 12 },
});
