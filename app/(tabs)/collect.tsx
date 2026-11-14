import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BatchTabs } from '@/src/components/BatchTabs';
import { ConfirmPaymentSheet } from '@/src/components/ConfirmPaymentSheet';
import { LocationSwitcher } from '@/src/components/LocationSwitcher';
import { RegisterStudentModal } from '@/src/components/RegisterStudentModal';
import { StudentFeeCard } from '@/src/components/StudentFeeCard';
import {
    createSession,
    createStudent,
    getNextRegistrationNumber,
    recordPaymentAmount,
    revertPayment,
} from '@/src/db/queries';
import { useClassStore } from '@/src/store/useClassStore';
import type { ClassSession, Payment, Student } from '@/src/types';
import { formatRegistrationNumber } from '@/src/utils/formatters';
import { colors } from '@/src/theme';

interface SelectedPayment {
  student: Student;
  session: ClassSession;
  payment: Payment | undefined;
}

function localDateString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CollectScreen() {
  const locations = useClassStore((state) => state.locations);
  const batches = useClassStore((state) => state.batches);
  const allBatches = useClassStore((state) => state.allBatches);
  const students = useClassStore((state) => state.students);
  const sessions = useClassStore((state) => state.sessions);
  const payments = useClassStore((state) => state.payments);
  const arrearsByStudentId = useClassStore((state) => state.arrearsByStudentId);
  const activeLocationId = useClassStore((state) => state.activeLocationId);
  const activeBatchId = useClassStore((state) => state.activeBatchId);
  const searchQuery = useClassStore((state) => state.searchQuery);
  const isLoading = useClassStore((state) => state.isLoading);
  const loadInitialData = useClassStore((state) => state.loadInitialData);
  const selectLocation = useClassStore((state) => state.selectLocation);
  const selectBatch = useClassStore((state) => state.selectBatch);
  const setSearchQuery = useClassStore((state) => state.setSearchQuery);
  const reloadDirectory = useClassStore((state) => state.reloadDirectory);
  const applyOptimisticPayment = useClassStore((state) => state.applyOptimisticPayment);
  const [selectedPayment, setSelectedPayment] = useState<SelectedPayment | null>(null);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [nextRegNumber, setNextRegNumber] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const activeBatch = batches.find((batch) => batch.id === activeBatchId);
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredStudents = students.filter((student) =>
    `${student.regNumber} ${formatRegistrationNumber(student.regNumber)} ${student.fullName} ${student.phone ?? ''}`
      .toLocaleLowerCase()
      .includes(normalizedQuery),
  );

  useEffect(() => {
    void Promise.all([loadInitialData(), getNextRegistrationNumber()])
      .then(([, nextNumber]) => setNextRegNumber(nextNumber))
      .catch(() => setErrorMessage('Could not load class data.'));
  }, [loadInitialData]);

  async function startTodaySession(): Promise<void> {
    if (!activeBatchId) return;
    try {
      await createSession(activeBatchId, localDateString());
      await selectBatch(activeBatchId);
      setErrorMessage('');
    } catch {
      setErrorMessage('Could not start this class session.');
    }
  }

  async function confirmPayment(amountPaid: number): Promise<void> {
    if (!selectedPayment) return;
    const totalPaid = Math.min(
      selectedPayment.student.weeklyFee,
      (selectedPayment.payment?.amountPaid ?? 0) + amountPaid,
    );
    const status = totalPaid >= selectedPayment.student.weeklyFee ? 'PAID' : 'UNPAID';
    applyOptimisticPayment(selectedPayment.student.id, selectedPayment.session.id, status, totalPaid);
    try {
      await recordPaymentAmount(
        selectedPayment.student.id,
        selectedPayment.session.id,
        totalPaid,
        selectedPayment.student.weeklyFee,
      );
      await selectBatch(selectedPayment.student.batchId);
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSelectedPayment(null);
      setErrorMessage('');
    } catch {
      try {
        await Promise.all([
          selectBatch(selectedPayment.student.batchId),
          reloadDirectory(),
        ]);
        setErrorMessage('Could not save the payment.');
      } catch {
        setErrorMessage('Could not save the payment or refresh the arrears list.');
      }
    }
  }

  async function undoPayment(): Promise<void> {
    if (!selectedPayment) return;
    applyOptimisticPayment(selectedPayment.student.id, selectedPayment.session.id, 'UNPAID', 0);
    try {
      await revertPayment(selectedPayment.student.id, selectedPayment.session.id);
      await selectBatch(selectedPayment.student.batchId);
      setSelectedPayment(null);
      setErrorMessage('');
    } catch {
      try {
        await Promise.all([
          selectBatch(selectedPayment.student.batchId),
          reloadDirectory(),
        ]);
        setErrorMessage('Could not revert the payment.');
      } catch {
        setErrorMessage('Could not revert the payment or refresh the arrears list.');
      }
    }
  }

  async function registerStudent(input: Parameters<typeof createStudent>[0]): Promise<void> {
    const student = await createStudent(input);
    setNextRegNumber(student.regNumber + 1);
    await reloadDirectory();
    if (activeBatchId) await selectBatch(activeBatchId);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.toolbar}>
        <View>
          <Text style={styles.eyebrow}>FEE COLLECTION</Text>
          <Text style={styles.title}>Collect fees</Text>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={!activeBatchId} onPress={() => setRegisterVisible(true)} style={[styles.addButton, !activeBatchId && styles.disabled]}>
            <Text style={styles.addButtonText}>+ Add student</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>LOCATION</Text>
        <LocationSwitcher
          locations={locations}
          activeLocationId={activeLocationId}
          onSelect={(id) => void selectLocation(id).catch(() => setErrorMessage('Could not load this location.'))}
        />
      </View>
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>CLASS / GRADE</Text>
        <BatchTabs
          batches={batches}
          activeBatchId={activeBatchId}
          studentCounts={Object.fromEntries(batches.map((batch) => [batch.id, batch.studentCount]))}
          onSelect={(id) => void selectBatch(id).catch(() => setErrorMessage('Could not load this batch.'))}
        />
      </View>
      <View style={styles.sessionCard}>
        <View>
          <Text style={styles.sessionCount}>Today’s class</Text>
          <Text style={styles.sessionHint}>{sessions.length} classes this month · Tap a date to record a fee</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => void startTodaySession()} style={styles.startButton}>
          <Text style={styles.startButtonText}>Start class</Text>
        </Pressable>
      </View>
      <View style={styles.searchWrap}>
        <Search color={colors.muted} size={18} strokeWidth={1.7} />
        <TextInput
          accessibilityLabel="Search students"
          onChangeText={setSearchQuery}
          placeholder="Search by name or registration"
          placeholderTextColor={colors.muted}
          style={styles.search}
          value={searchQuery}
        />
      </View>
      <Text style={styles.paymentHint}>Green: paid  ·  Red: due</Text>
      {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
      <FlashList
        data={filteredStudents}
        keyExtractor={(student) => String(student.id)}
        renderItem={({ item }) => (
          <StudentFeeCard
            student={item}
            sessions={sessions}
            payments={payments}
            arrearsCount={arrearsByStudentId[item.id] ?? 0}
            onSessionPress={(session, payment) => setSelectedPayment({ student: item, session, payment })}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{isLoading ? 'Loading students…' : activeBatch ? `No students in ${activeBatch.name} yet.` : 'Add a class batch to get started.'}</Text>
        }
        keyboardShouldPersistTaps="handled"
        drawDistance={480}
      />
      <ConfirmPaymentSheet
        key={selectedPayment ? `${selectedPayment.student.id}-${selectedPayment.session.id}-${selectedPayment.payment?.amountPaid ?? 0}` : 'closed'}
        visible={selectedPayment !== null}
        studentName={selectedPayment?.student.fullName ?? ''}
        session={selectedPayment?.session ?? null}
        payment={selectedPayment?.payment ?? null}
        defaultAmount={selectedPayment?.student.weeklyFee ?? 0}
        onConfirm={(amountPaid) => void confirmPayment(amountPaid)}
        onRevert={() => void undoPayment()}
        onClose={() => setSelectedPayment(null)}
      />
      <RegisterStudentModal
        key={`${registerVisible}-${activeLocationId ?? 0}-${activeBatchId ?? 0}`}
        visible={registerVisible}
        locations={locations}
        batches={allBatches}
        initialLocationId={activeLocationId}
        initialBatchId={activeBatchId}
        nextRegNumber={nextRegNumber}
        onSubmit={registerStudent}
        onClose={() => setRegisterVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, backgroundColor: colors.background },
  toolbar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.gold, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  title: { marginTop: 3, color: colors.text, fontSize: 21, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  addButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 13, backgroundColor: colors.gold },
  disabled: { opacity: 0.45 },
  addButtonText: { color: colors.navy, fontSize: 12, fontWeight: '800' },
  filterSection: { gap: 1 },
  filterLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  sessionCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.navy },
  sessionCount: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  sessionHint: { maxWidth: 210, marginTop: 4, color: '#A8B0BD', fontSize: 10, lineHeight: 14 },
  startButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 11, backgroundColor: colors.gold },
  startButtonText: { color: colors.navy, fontSize: 11, fontWeight: '800' },
  searchWrap: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 8, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface },
  search: { flex: 1, minHeight: 44, color: colors.text, fontSize: 13 },
  paymentHint: { marginTop: -4, marginBottom: 4, color: colors.muted, fontSize: 10 },
  error: { paddingVertical: 6, color: colors.danger, fontSize: 13 },
  empty: { paddingVertical: 36, color: colors.muted, fontSize: 14, textAlign: 'center' },
});
