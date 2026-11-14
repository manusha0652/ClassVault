import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MessageCircle, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RegisterStudentModal } from '@/src/components/RegisterStudentModal';
import { SelectDropdown } from '@/src/components/SelectDropdown';
import { createStudent, getNextRegistrationNumber } from '@/src/db/queries';
import { useClassStore } from '@/src/store/useClassStore';
import { formatRegistrationNumber } from '@/src/utils/formatters';
import { colors } from '@/src/theme';

export default function StudentsScreen() {
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const locations = useClassStore((state) => state.locations);
  const allBatches = useClassStore((state) => state.allBatches);
  const directoryStudents = useClassStore((state) => state.directoryStudents);
  const activeLocationId = useClassStore((state) => state.activeLocationId);
  const activeBatchId = useClassStore((state) => state.activeBatchId);
  const loadInitialData = useClassStore((state) => state.loadInitialData);
  const selectBatch = useClassStore((state) => state.selectBatch);
  const reloadDirectory = useClassStore((state) => state.reloadDirectory);
  const [query, setQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [nextRegNumber, setNextRegNumber] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const arrearsOnly = filter === 'arrears';
  const initialLocationId = selectedLocationId ?? activeLocationId;
  const initialBatchId = selectedBatchId ?? (
    selectedLocationId === null || selectedLocationId === activeLocationId
      ? activeBatchId
      : null
  );
  const locationOptions = [
    { value: 'all', label: 'All locations' },
    ...locations.map((location) => ({ value: String(location.id), label: location.name })),
  ];
  const classOptions = [
    { value: 'all', label: 'All classes / grades' },
    ...allBatches
      .filter((batch) => selectedLocationId === null || batch.locationId === selectedLocationId)
      .map((batch) => ({
        value: String(batch.id),
        label: selectedLocationId === null ? `${batch.name} · ${batch.locationName}` : batch.name,
      })),
  ];
  const filteredStudents = directoryStudents.filter((student) => {
    if (!includeInactive && !student.isActive) return false;
    if (arrearsOnly && student.arrearsCount === 0) return false;
    if (selectedLocationId !== null && student.locationId !== selectedLocationId) return false;
    if (selectedBatchId !== null && student.batchId !== selectedBatchId) return false;
    return `${student.regNumber} ${formatRegistrationNumber(student.regNumber)} ${student.fullName} ${student.phone ?? ''}`
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });

  useEffect(() => {
    void Promise.all([loadInitialData(), getNextRegistrationNumber()])
      .then(([, next]) => setNextRegNumber(next))
      .catch(() => setErrorMessage('Could not load student records.'));
  }, [loadInitialData]);

  async function registerStudent(input: Parameters<typeof createStudent>[0]): Promise<void> {
    const student = await createStudent(input);
    setNextRegNumber(student.regNumber + 1);
    await reloadDirectory();
    if (activeBatchId) await selectBatch(activeBatchId);
  }

  async function messageStudent(phone: string): Promise<void> {
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('0') ? `94${digits.slice(1)}` : digits;
    if (normalized.length < 10) {
      setErrorMessage('This phone number is not valid for WhatsApp.');
      return;
    }
    try {
      await Linking.openURL(`https://wa.me/${normalized}`);
      setErrorMessage('');
    } catch {
      setErrorMessage('Could not open WhatsApp for this student.');
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>YOUR CLASS ROSTER</Text>
          <Text style={styles.title}>{arrearsOnly ? 'Pending arrears' : 'Students'}</Text>
        </View>
        <Pressable accessibilityRole="button" disabled={!locations.length || !allBatches.length} onPress={() => setRegisterVisible(true)} style={[styles.addButton, (!locations.length || !allBatches.length) && styles.disabled]}>
          <Text style={styles.addButtonText}>+ Add student</Text>
        </Pressable>
      </View>
      <View style={styles.filterActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setSelectedLocationId(null);
            setSelectedBatchId(null);
            setQuery('');
            router.setParams({ filter: undefined });
          }}
          style={styles.allStudentsButton}
        >
          <Text style={styles.allStudentsText}>All students</Text>
        </Pressable>
        {arrearsOnly && <Text style={styles.filterHint}>Students with unpaid class fees</Text>}
      </View>
      <View style={styles.filters}>
        <SelectDropdown
          label="LOCATION"
          value={selectedLocationId === null ? 'all' : String(selectedLocationId)}
          options={locationOptions}
          placeholder="Choose location"
          onChange={(value) => {
            setSelectedLocationId(value === 'all' ? null : Number(value));
            setSelectedBatchId(null);
          }}
        />
        <SelectDropdown
          label="CLASS / GRADE"
          value={selectedBatchId === null ? 'all' : String(selectedBatchId)}
          options={classOptions}
          placeholder="Choose class or grade"
          onChange={(value) => {
            if (value === 'all') {
              setSelectedBatchId(null);
              return;
            }
            const batch = allBatches.find((item) => item.id === Number(value));
            if (!batch) return;
            setSelectedBatchId(batch.id);
            setSelectedLocationId(batch.locationId);
          }}
        />
      </View>
      <View style={styles.searchWrap}>
        <Search color={colors.muted} size={18} strokeWidth={1.7} />
        <TextInput
          accessibilityLabel="Search all students"
          onChangeText={setQuery}
          placeholder="Search name, reg. no. or phone"
          placeholderTextColor={colors.muted}
          style={styles.search}
          value={query}
        />
      </View>
      <View style={styles.inactiveRow}>
        <Text style={styles.inactiveLabel}>Show inactive students</Text>
        <Switch value={includeInactive} onValueChange={setIncludeInactive} trackColor={{ true: colors.gold }} />
      </View>
      {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
      <Text style={styles.resultCount}>{filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}</Text>
      <FlashList
        data={filteredStudents}
        keyExtractor={(student) => String(student.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/student/[id]', params: { id: String(item.id) } })}
              style={styles.studentButton}
            >
              <Text style={styles.registration}>{formatRegistrationNumber(item.regNumber)}</Text>
              <View style={styles.details}>
                <Text numberOfLines={1} style={styles.name}>{item.fullName}</Text>
                <Text numberOfLines={1} style={styles.subtitle}>{item.batchName} · {item.locationName}{item.phone ? ` · ${item.phone}` : ''}</Text>
              </View>
              {item.arrearsCount > 0 && <Text style={styles.arrearsTag}>{item.arrearsCount} due</Text>}
              {!item.isActive && <Text style={styles.inactiveTag}>Inactive</Text>}
            </Pressable>
            {!!item.phone && (
              <Pressable accessibilityLabel={`Message ${item.fullName} on WhatsApp`} accessibilityRole="button" onPress={() => void messageStudent(item.phone!)} style={styles.messageButton}>
                <MessageCircle color={colors.success} size={19} strokeWidth={1.7} />
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{arrearsOnly ? 'No students have pending arrears.' : 'No students match these filters.'}</Text>}
        keyboardShouldPersistTaps="handled"
      />
      <RegisterStudentModal
        key={`${registerVisible}-${initialLocationId ?? 0}-${initialBatchId ?? 0}`}
        visible={registerVisible}
        locations={locations}
        batches={allBatches}
        initialLocationId={initialLocationId}
        initialBatchId={initialBatchId}
        nextRegNumber={nextRegNumber}
        onSubmit={registerStudent}
        onClose={() => setRegisterVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, backgroundColor: colors.background },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.gold, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  title: { marginTop: 3, color: colors.text, fontSize: 21, fontWeight: '700' },
  addButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 13, backgroundColor: colors.gold },
  addButtonText: { color: colors.navy, fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  filterActions: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  allStudentsButton: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.navy },
  allStudentsText: { color: colors.surface, fontSize: 11, fontWeight: '700' },
  filterHint: { flex: 1, color: colors.muted, fontSize: 10, textAlign: 'right' },
  filters: { gap: 9 },
  searchWrap: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 8, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface },
  search: { flex: 1, minHeight: 44, color: colors.text, fontSize: 13 },
  inactiveRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surface },
  inactiveLabel: { color: colors.muted, fontSize: 12 },
  resultCount: { marginTop: 8, marginBottom: 7, color: colors.muted, fontSize: 11, fontWeight: '600' },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface },
  studentButton: { flex: 1, minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10 },
  registration: { width: 58, color: colors.gold, fontSize: 11, fontWeight: '800' },
  details: { flex: 1, gap: 3 },
  name: { color: colors.text, fontSize: 13, fontWeight: '600' },
  subtitle: { color: colors.muted, fontSize: 10 },
  arrearsTag: { color: colors.danger, fontSize: 10, fontWeight: '700' },
  inactiveTag: { color: colors.danger, fontSize: 10, fontWeight: '700' },
  messageButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.successSurface },
  error: { paddingVertical: 6, color: colors.danger, fontSize: 12 },
  empty: { padding: 24, color: colors.muted, textAlign: 'center' },
});