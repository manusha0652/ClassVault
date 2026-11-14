import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SelectDropdown } from './SelectDropdown';
import type { BatchWithLocation, NewStudent } from '../db/queries';
import type { Location } from '../types';
import { colors } from '../theme';
import { formatRegistrationNumber } from '../utils/formatters';

interface RegisterStudentModalProps {
  visible: boolean;
  locations: Location[];
  batches: BatchWithLocation[];
  initialLocationId: number | null;
  initialBatchId: number | null;
  nextRegNumber: number;
  onSubmit: (student: NewStudent) => void | Promise<void>;
  onClose: () => void;
}

export function RegisterStudentModal({
  visible,
  locations,
  batches,
  initialLocationId,
  initialBatchId,
  nextRegNumber,
  onSubmit,
  onClose,
}: RegisterStudentModalProps) {
  const resolvedInitialLocationId = initialLocationId ?? locations[0]?.id ?? null;
  const initialBatch = batches.find(
    (batch) => batch.id === initialBatchId && batch.locationId === resolvedInitialLocationId,
  ) ?? batches.find((batch) => batch.locationId === resolvedInitialLocationId);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState(resolvedInitialLocationId);
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatch?.id ?? null);
  const [weeklyFee, setWeeklyFee] = useState(initialBatch ? String(initialBatch.defaultFee) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const locationBatches = batches.filter((batch) => batch.locationId === selectedLocationId);
  const selectedBatch = locationBatches.find((batch) => batch.id === selectedBatchId) ?? locationBatches[0];
  const selectedLocation = locations.find((location) => location.id === selectedLocationId);
  const locationOptions = locations.map((location) => ({
    value: String(location.id),
    label: location.name,
  }));
  const batchOptions = locationBatches.map((batch) => ({
    value: String(batch.id),
    label: batch.name,
  }));

  async function submit(): Promise<void> {
    const fee = Number(weeklyFee);
    if (!fullName.trim() || !selectedBatch || !Number.isFinite(fee) || fee < 0 || isSaving) {
      setErrorMessage('Enter a student name, choose a class, and enter a valid weekly fee.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSubmit({ fullName, phone: phone || null, batchId: selectedBatch.id, weeklyFee: fee });
      setFullName('');
      setPhone('');
      setWeeklyFee(String(selectedBatch.defaultFee));
      setSelectedBatchId(selectedBatch.id);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Student could not be saved.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          style={styles.sheet}
        >
          <Text style={styles.title}>Register student</Text>
          <Text style={styles.registration}>Student ID · {formatRegistrationNumber(nextRegNumber)}</Text>
          <TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Full name" placeholderTextColor={colors.muted} style={styles.input} value={fullName} />
          <TextInput keyboardType="phone-pad" onChangeText={setPhone} placeholder="Phone (optional)" placeholderTextColor={colors.muted} style={styles.input} value={phone} />
          <SelectDropdown
            label="Location"
            value={selectedLocationId === null ? '' : String(selectedLocationId)}
            options={locationOptions}
            placeholder="Choose a location"
            onChange={(value) => {
              const nextLocationId = Number(value);
              const firstBatch = batches.find((batch) => batch.locationId === nextLocationId);
              setSelectedLocationId(nextLocationId);
              setSelectedBatchId(firstBatch?.id ?? null);
              setWeeklyFee(firstBatch ? String(firstBatch.defaultFee) : '');
            }}
          />
          <SelectDropdown
            label="Class / grade"
            value={selectedBatch ? String(selectedBatch.id) : ''}
            options={batchOptions}
            placeholder={selectedLocation ? 'Choose a class or grade' : 'Choose a location first'}
            disabled={!selectedLocation || locationBatches.length === 0}
            onChange={(value) => {
              const batch = locationBatches.find((item) => item.id === Number(value));
              if (!batch) return;
              setSelectedBatchId(batch.id);
              setWeeklyFee(String(batch.defaultFee));
            }}
          />
          <TextInput keyboardType="decimal-pad" onChangeText={setWeeklyFee} placeholder="Weekly fee (Rs.)" placeholderTextColor={colors.muted} style={styles.input} value={weeklyFee} />
          {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
          <Pressable accessibilityRole="button" disabled={isSaving || !selectedBatch} onPress={() => void submit()} style={[styles.submitButton, (isSaving || !selectedBatch) && styles.disabled]}>
            <Text style={styles.submitText}>{isSaving ? 'Saving…' : 'Save student'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21, 26, 38, 0.45)' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.surface },
  sheetContent: { gap: 12, padding: 22, paddingBottom: 30 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  registration: { color: colors.gold, fontSize: 13, fontWeight: '800' },
  input: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.text },
  submitButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.gold },
  submitText: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  error: { color: colors.danger, fontSize: 12 },
  closeButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});