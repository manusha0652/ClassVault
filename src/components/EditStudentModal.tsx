import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import type { BatchWithLocation, UpdateStudentInput } from '../db/queries';
import type { Student } from '../types';
import { colors } from '../theme';

interface EditStudentModalProps {
  visible: boolean;
  student: Student | null;
  batches: BatchWithLocation[];
  onSave: (input: UpdateStudentInput) => void | Promise<void>;
  onClose: () => void;
}

export function EditStudentModal({ visible, student, batches, onSave, onClose }: EditStudentModalProps) {
  const [fullName, setFullName] = useState(student?.fullName ?? '');
  const [phone, setPhone] = useState(student?.phone ?? '');
  const [weeklyFee, setWeeklyFee] = useState(String(student?.weeklyFee ?? 0));
  const [batchId, setBatchId] = useState(student?.batchId ?? 0);
  const [isActive, setIsActive] = useState(student?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);

  async function save(): Promise<void> {
    const fee = Number(weeklyFee);
    if (!student || !fullName.trim() || !Number.isFinite(fee) || fee < 0 || batchId <= 0 || isSaving) return;

    setIsSaving(true);
    try {
      await onSave({
        fullName,
        phone: phone || null,
        batchId,
        weeklyFee: fee,
        isActive,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Edit student</Text>
          <TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Full name" style={styles.input} value={fullName} />
          <TextInput keyboardType="phone-pad" onChangeText={setPhone} placeholder="Phone (optional)" style={styles.input} value={phone} />
          <Text style={styles.fieldLabel}>Class batch</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.batchOptions}>
            {batches.map((batch) => {
              const selected = batch.id === batchId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={batch.id}
                  onPress={() => setBatchId(batch.id)}
                  style={[styles.batchOption, selected && styles.selectedBatch]}
                >
                  <Text style={[styles.batchName, selected && styles.selectedText]}>{batch.name}</Text>
                  <Text style={[styles.locationName, selected && styles.selectedText]}>{batch.locationName}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <TextInput keyboardType="decimal-pad" onChangeText={setWeeklyFee} placeholder="Weekly fee" style={styles.input} value={weeklyFee} />
          <View style={styles.activeRow}>
            <Text style={styles.activeLabel}>Active student</Text>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.gold }} />
          </View>
          <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void save()} style={[styles.saveButton, isSaving && styles.disabled]}>
            <Text style={styles.saveText}>{isSaving ? 'Saving…' : 'Save changes'}</Text>
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
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21, 26, 38, 0.45)' },
  sheet: { gap: 12, padding: 22, paddingBottom: 30, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.surface },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  input: { minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.text },
  fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  batchOptions: { gap: 8, paddingVertical: 2 },
  batchOption: { minWidth: 104, minHeight: 52, justifyContent: 'center', gap: 2, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface },
  selectedBatch: { borderColor: colors.navy, backgroundColor: colors.navy },
  batchName: { color: colors.text, fontSize: 12, fontWeight: '700' },
  locationName: { color: colors.muted, fontSize: 10 },
  selectedText: { color: colors.surface },
  activeRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  saveButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.gold },
  disabled: { opacity: 0.55 },
  saveText: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  cancelButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});