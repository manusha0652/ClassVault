import { FlashList } from '@shopify/flash-list';
import { MessageCircle } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { EditStudentModal } from '@/src/components/EditStudentModal';
import {
    getStudentById,
    getStudentPaymentHistory,
    listAllBatches,
    updateStudent,
    type BatchWithLocation,
    type UpdateStudentInput,
} from '@/src/db/queries';
import { useClassStore } from '@/src/store/useClassStore';
import type { Student, StudentPaymentHistoryEntry } from '@/src/types';
import { formatCurrency, formatRegistrationNumber, formatShortDate } from '@/src/utils/formatters';
import { colors } from '@/src/theme';

export default function StudentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = Number(id);
  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<StudentPaymentHistoryEntry[]>([]);
  const [availableBatches, setAvailableBatches] = useState<BatchWithLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const reloadDirectory = useClassStore((state) => state.reloadDirectory);
  const selectLocation = useClassStore((state) => state.selectLocation);
  const selectBatch = useClassStore((state) => state.selectBatch);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getStudentById(studentId),
      getStudentPaymentHistory(studentId),
      listAllBatches(),
    ])
      .then(([nextStudent, nextHistory, nextBatches]) => {
        if (cancelled) return;
        setStudent(nextStudent);
        setHistory(nextHistory);
        setAvailableBatches(nextBatches);
      })
      .catch(() => {
        if (!cancelled) setErrorMessage('Could not load student details.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, profileRefreshKey]);

  async function saveStudent(input: UpdateStudentInput): Promise<void> {
    if (!student) return;
    await updateStudent(student.id, input);
    const targetBatch = availableBatches.find((batch) => batch.id === input.batchId);
    await reloadDirectory();
    if (targetBatch) await selectLocation(targetBatch.locationId);
    await selectBatch(input.batchId);
    setErrorMessage('');
    setEditVisible(false);
    setProfileRefreshKey((key) => key + 1);
  }

  async function messageStudent(): Promise<void> {
    if (!student?.phone) return;
    const digits = student.phone.replace(/\D/g, '');
    const normalized = digits.startsWith('0') ? `94${digits.slice(1)}` : digits;
    if (normalized.length < 10) {
      setErrorMessage('This phone number is not valid for WhatsApp.');
      return;
    }
    try {
      await Linking.openURL(`https://wa.me/${normalized}`);
    } catch {
      setErrorMessage('Could not open WhatsApp for this student.');
    }
  }

  if (isLoading) {
    return <View style={styles.screen}><Text style={styles.secondary}>Loading student…</Text></View>;
  }

  if (!student) {
    return <View style={styles.screen}><Text style={styles.secondary}>{errorMessage || 'Student not found.'}</Text></View>;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text style={styles.registration}>{formatRegistrationNumber(student.regNumber)}</Text>
          <Text style={styles.name}>{student.fullName}</Text>
          {!!student.phone && <Text style={styles.secondary}>{student.phone}</Text>}
        </View>
        <View style={styles.headerActions}>
          {!!student.phone && <Pressable accessibilityLabel={`Message ${student.fullName} on WhatsApp`} accessibilityRole="button" onPress={() => void messageStudent()} style={styles.messageButton}><MessageCircle color={colors.success} size={19} strokeWidth={1.7} /></Pressable>}
          <Pressable accessibilityRole="button" onPress={() => {
            setEditKey((key) => key + 1);
            setEditVisible(true);
          }} style={styles.editButton}>
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.feeSummary}>
        <View style={styles.summaryItem}>
          <Text style={styles.secondary}>Weekly fee</Text>
          <Text style={styles.fee}>{formatCurrency(student.weeklyFee)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.secondary}>Status</Text>
          <Text style={[styles.status, student.isActive ? styles.activeStatus : styles.inactiveStatus]}>
            {student.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <Text style={styles.historyTitle}>Payment history</Text>
      {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
      <FlashList
        data={history}
        keyExtractor={(item) => String(item.sessionId)}
        renderItem={({ item }) => (
          <View style={styles.historyRow}>
            <View style={styles.historyDetails}>
              <Text style={styles.sessionDate}>{formatShortDate(item.sessionDate)}</Text>
              <Text style={[styles.paymentStatus, item.status === 'PAID' ? styles.paid : styles.unpaid]}>
                {item.status === 'PAID' ? 'Paid' : item.amountPaid > 0 ? 'Part paid' : 'Unpaid'}
              </Text>
            </View>
            <Text style={styles.amount}>
              {formatCurrency(item.status === 'PAID' ? item.amountPaid : Math.max(0, student.weeklyFee - item.amountPaid))}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No class sessions recorded yet.</Text>}
      />
      <EditStudentModal
        key={`${student.id}-${editKey}`}
        visible={editVisible}
        student={student}
        batches={availableBatches}
        onSave={saveStudent}
        onClose={() => setEditVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 14, padding: 20, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  identity: { flex: 1, gap: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  registration: { color: colors.gold, fontSize: 13, fontWeight: '800' },
  name: { color: colors.text, fontSize: 22, fontWeight: '700' },
  secondary: { color: colors.muted, fontSize: 14 },
  messageButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.successSurface },
  editButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: colors.gold, borderRadius: 12 },
  editText: { color: colors.navy, fontSize: 12, fontWeight: '700' },
  feeSummary: { minHeight: 74, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  summaryItem: { flex: 1, justifyContent: 'center', gap: 4 },
  fee: { color: colors.text, fontSize: 16, fontWeight: '700' },
  status: { fontSize: 14, fontWeight: '700' },
  activeStatus: { color: colors.success },
  inactiveStatus: { color: colors.danger },
  historyTitle: { marginTop: 4, color: colors.text, fontSize: 16, fontWeight: '700' },
  historyRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  historyDetails: { gap: 3 },
  sessionDate: { color: colors.text, fontSize: 14, fontWeight: '600' },
  paymentStatus: { fontSize: 12, fontWeight: '600' },
  paid: { color: colors.success },
  unpaid: { color: colors.danger },
  amount: { color: colors.text, fontSize: 14, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13 },
  empty: { paddingVertical: 28, color: colors.muted, textAlign: 'center' },
});