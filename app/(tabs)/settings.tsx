import { Cloud, FileSpreadsheet, HardDriveDownload, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddLocationModal } from '@/src/components/AddLocationModal';
import { LocationSwitcher } from '@/src/components/LocationSwitcher';
import {
  addLocation,
  createBatch,
  deleteBatch,
  getPaymentExportRows,
  renameLocation,
  setAppSetting,
  updateBatchDefaultFee,
} from '@/src/db/queries';
import { clearAppPin, saveAppPin } from '@/src/security/pin';
import { useSecurity } from '@/src/security/SecurityContext';
import { useClassStore } from '@/src/store/useClassStore';
import { colors } from '@/src/theme';
import { buildPaymentsCsv, shareDatabaseBackup, sharePaymentsCsv } from '@/src/utils/exportCsv';

export default function SettingsScreen() {
  const locations = useClassStore((state) => state.locations);
  const batches = useClassStore((state) => state.batches);
  const activeLocationId = useClassStore((state) => state.activeLocationId);
  const loadInitialData = useClassStore((state) => state.loadInitialData);
  const selectLocation = useClassStore((state) => state.selectLocation);
  const { lockEnabled, refresh, setUnlocked } = useSecurity();
  const [renamedLocation, setRenamedLocation] = useState('');
  const [batchName, setBatchName] = useState('');
  const [batchFee, setBatchFee] = useState('');
  const [feeDrafts, setFeeDrafts] = useState<Record<number, string>>({});
  const [busyAction, setBusyAction] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [addLocationVisible, setAddLocationVisible] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<number | null>(null);
  const activeLocation = locations.find((location) => location.id === activeLocationId);
  const deletingBatch = batches.find((batch) => batch.id === batchToDelete);

  useEffect(() => {
    void loadInitialData().catch(() => setErrorMessage('Could not load settings.'));
  }, [loadInitialData]);

  async function runAction(action: string, operation: () => Promise<void>): Promise<void> {
    setBusyAction(action);
    setErrorMessage('');
    setNotice('');
    try {
      await operation();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The change could not be saved.');
    } finally {
      setBusyAction('');
    }
  }

  async function saveLocation(name: string, defaultFees: number[]): Promise<void> {
    await addLocation(name, defaultFees);
    setAddLocationVisible(false);
    setNotice('Location and starter classes have been added.');
    try {
      await loadInitialData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Location was added, but settings could not be refreshed.');
    }
  }

  function saveLocationName(): void {
    if (!activeLocationId || !renamedLocation.trim()) return;
    void runAction('rename-location', async () => {
      await renameLocation(activeLocationId, renamedLocation);
      setRenamedLocation('');
      await loadInitialData();
      setNotice('Location name updated.');
    });
  }

  function saveBatch(): void {
    const fee = Number(batchFee);
    if (!activeLocationId || !batchName.trim() || !batchFee.trim() || !Number.isFinite(fee) || fee < 0) return;
    void runAction('batch', async () => {
      await createBatch(activeLocationId, batchName, fee);
      setBatchName('');
      setBatchFee('');
      await loadInitialData();
      setNotice('Batch added.');
    });
  }

  function saveFee(batchId: number): void {
    const fee = Number(feeDrafts[batchId]);
    if (!Number.isFinite(fee) || fee < 0) return;
    void runAction(`fee-${batchId}`, async () => {
      await updateBatchDefaultFee(batchId, fee);
      setFeeDrafts((drafts) => ({ ...drafts, [batchId]: String(fee) }));
      await loadInitialData();
      setNotice('Default fee updated.');
    });
  }

  function confirmDeleteBatch(): void {
    if (batchToDelete === null) return;
    const batchId = batchToDelete;
    const batchNameToDelete = batches.find((batch) => batch.id === batchId)?.name ?? 'Class';
    void runAction('delete-batch', async () => {
      await deleteBatch(batchId);
      setBatchToDelete(null);
      await loadInitialData();
      setNotice(`${batchNameToDelete} and its student and payment records were deleted.`);
    });
  }

  function exportCsv(): void {
    void runAction('csv', async () => {
      const rows = await getPaymentExportRows();
      await sharePaymentsCsv(buildPaymentsCsv(rows));
      setNotice('Payment export is ready.');
    });
  }

  function exportBackup(): void {
    void runAction('backup', async () => {
      await shareDatabaseBackup();
      setNotice('Database backup is ready.');
    });
  }

  function toggleAppLock(enabled: boolean): void {
    if (enabled) {
      setPin('');
      setConfirmPin('');
      setPinModalVisible(true);
      return;
    }
    void runAction('lock', async () => {
      await setAppSetting('app_lock_enabled', 'false');
      await clearAppPin();
      await refresh();
      setUnlocked(true);
      setNotice('App lock disabled.');
    });
  }

  function enableAppLock(): void {
    if (!/^\d{4}$/.test(pin) || pin !== confirmPin) {
      setErrorMessage(pin !== confirmPin ? 'The PINs do not match.' : 'Enter a four-digit PIN.');
      return;
    }
    void runAction('lock', async () => {
      await saveAppPin(pin);
      await setAppSetting('app_lock_enabled', 'true');
      await refresh();
      setUnlocked(true);
      setPinModalVisible(false);
      setPin('');
      setConfirmPin('');
      setNotice('App lock enabled. You will need your PIN or biometrics when you reopen ClassVault.');
    });
  }

  return (
    <>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.eyebrow}>PREFERENCES</Text>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teaching locations</Text>
          <LocationSwitcher
            locations={locations}
            activeLocationId={activeLocationId}
            onSelect={(id) => void selectLocation(id).catch(() => setErrorMessage('Could not load this location.'))}
          />
          {activeLocation && (
            <View style={styles.inlineForm}>
              <TextInput autoCapitalize="words" onChangeText={setRenamedLocation} placeholder={`Rename ${activeLocation.name}`} placeholderTextColor={colors.muted} style={styles.input} value={renamedLocation} />
              <Pressable accessibilityRole="button" disabled={!renamedLocation.trim() || busyAction === 'rename-location'} onPress={saveLocationName} style={styles.outlineButton}>
                <Text style={styles.outlineButtonText}>Rename</Text>
              </Pressable>
            </View>
          )}
          <Pressable accessibilityRole="button" onPress={() => setAddLocationVisible(true)} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>Add location & set starting fees</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Class fees</Text>
          {batches.map((batch) => (
            <View key={batch.id} style={styles.feeRow}>
              <Text style={styles.batchName}>{batch.name}</Text>
              <View style={styles.feeEditor}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  accessibilityLabel={`${batch.name} default weekly fee`}
                  keyboardType="decimal-pad"
                  onChangeText={(value) => setFeeDrafts((drafts) => ({ ...drafts, [batch.id]: value }))}
                  style={styles.feeInput}
                  value={feeDrafts[batch.id] ?? String(batch.defaultFee)}
                />
                <Pressable accessibilityLabel={`Save ${batch.name} fee`} accessibilityRole="button" disabled={busyAction === `fee-${batch.id}`} onPress={() => saveFee(batch.id)} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </Pressable>
              </View>
              <Pressable
                accessibilityLabel={`Delete ${batch.name} and its records`}
                accessibilityRole="button"
                disabled={busyAction === 'delete-batch'}
                onPress={() => { setErrorMessage(''); setBatchToDelete(batch.id); }}
                style={styles.deleteButton}
              >
                <Trash2 color={colors.danger} size={17} strokeWidth={1.8} />
              </Pressable>
            </View>
          ))}
          {batches.length === 0 && <Text style={styles.mutedText}>Select a location to manage its batches.</Text>}
          <View style={styles.newBatchForm}>
            <TextInput autoCapitalize="words" onChangeText={setBatchName} placeholder="New O/L grade or class" placeholderTextColor={colors.muted} style={styles.input} value={batchName} />
            <TextInput accessibilityLabel="Initial weekly class fee" keyboardType="decimal-pad" onChangeText={setBatchFee} placeholder="Starting weekly fee (Rs.)" placeholderTextColor={colors.muted} style={styles.input} value={batchFee} />
            <Pressable accessibilityRole="button" disabled={!activeLocationId || !batchName.trim() || !batchFee.trim() || !Number.isFinite(Number(batchFee)) || Number(batchFee) < 0 || busyAction === 'batch'} onPress={saveBatch} style={[styles.addButton, (!activeLocationId || !batchName.trim() || !batchFee.trim() || !Number.isFinite(Number(batchFee)) || Number(batchFee) < 0 || busyAction === 'batch') && styles.disabled]}>
              <Text style={styles.addButtonText}>Add class</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & security</Text>
          <View style={styles.securityCard}>
            <View style={styles.securityIcon}><ShieldCheck color={colors.gold} size={21} strokeWidth={1.6} /></View>
            <View style={styles.securityCopy}>
              <Text style={styles.securityTitle}>App Lock</Text>
              <Text style={styles.securityDescription}>Require your PIN or device biometrics to view your wallet.</Text>
            </View>
            {Platform.OS !== 'web' ? (
              <Switch
                accessibilityLabel="App Lock (Biometric / PIN)"
                value={lockEnabled}
                onValueChange={toggleAppLock}
                disabled={busyAction === 'lock'}
                trackColor={{ true: colors.gold }}
                thumbColor={colors.surface}
              />
            ) : <Text style={styles.mutedText}>Mobile only</Text>}
          </View>
          {lockEnabled && Platform.OS !== 'web' && (
            <Pressable accessibilityRole="button" onPress={() => { setPin(''); setConfirmPin(''); setPinModalVisible(true); }} style={styles.changePinButton}>
              <LockKeyhole color={colors.navy} size={17} strokeWidth={1.7} />
              <Text style={styles.changePinText}>Change PIN</Text>
            </Pressable>
          )}
          <View style={styles.cloudCard}>
            <Cloud color={colors.muted} size={20} strokeWidth={1.6} />
            <View style={styles.securityCopy}>
              <Text style={styles.cloudTitle}>Cloud backup</Text>
              <Text style={styles.securityDescription}>Your records are stored locally. Cloud sync is not connected yet.</Text>
            </View>
            <Text style={styles.comingSoon}>SOON</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup & export</Text>
          <Pressable accessibilityRole="button" disabled={busyAction !== ''} onPress={exportCsv} style={styles.exportButton}>
            <FileSpreadsheet color={colors.gold} size={19} strokeWidth={1.6} />
            <Text style={styles.exportText}>{busyAction === 'csv' ? 'Preparing CSV…' : 'Export payments CSV'}</Text>
          </Pressable>
          {Platform.OS !== 'web' && (
            <Pressable accessibilityRole="button" disabled={busyAction !== ''} onPress={exportBackup} style={styles.exportButton}>
              <HardDriveDownload color={colors.gold} size={19} strokeWidth={1.6} />
              <Text style={styles.exportText}>{busyAction === 'backup' ? 'Preparing backup…' : 'Share SQLite backup'}</Text>
            </Pressable>
          )}
        </View>

        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
      </ScrollView>
      </SafeAreaView>

      <AddLocationModal
        visible={addLocationVisible}
        onSubmit={saveLocation}
        onClose={() => setAddLocationVisible(false)}
      />

      <Modal animationType="slide" transparent visible={pinModalVisible} onRequestClose={() => setPinModalVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.pinSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.pinTitle}>{lockEnabled ? 'Change your PIN' : 'Set up App Lock'}</Text>
            <Text style={styles.pinDescription}>Create a four-digit PIN. Biometrics can be used as a faster way to unlock.</Text>
            <TextInput
              accessibilityLabel="New four-digit app PIN"
              autoComplete="off"
              keyboardType="number-pad"
              maxLength={4}
              onChangeText={setPin}
              placeholder="4-digit PIN"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
              value={pin}
            />
            <TextInput
              accessibilityLabel="Confirm four-digit app PIN"
              autoComplete="off"
              keyboardType="number-pad"
              maxLength={4}
              onChangeText={setConfirmPin}
              placeholder="Confirm PIN"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
              value={confirmPin}
            />
            {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
            <Pressable accessibilityRole="button" disabled={busyAction === 'lock'} onPress={enableAppLock} style={[styles.addButton, styles.pinSaveButton]}>
              <Text style={styles.addButtonText}>{busyAction === 'lock' ? 'Saving…' : 'Save PIN & enable'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setPinModalVisible(false); setErrorMessage(''); }} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={batchToDelete !== null}
        onRequestClose={() => setBatchToDelete(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.deleteSheet}>
            <Text style={styles.pinTitle}>Delete {deletingBatch?.name ?? 'class'}?</Text>
            <Text style={styles.pinDescription}>
              This permanently deletes the class, its students, class sessions, and payment history. This cannot be undone.
            </Text>
            {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
            <Pressable accessibilityRole="button" disabled={busyAction === 'delete-batch'} onPress={confirmDeleteBatch} style={[styles.deleteConfirmButton, busyAction === 'delete-batch' && styles.disabled]}>
              <Text style={styles.deleteConfirmText}>{busyAction === 'delete-batch' ? 'Deleting…' : 'Delete class and records'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busyAction === 'delete-batch'} onPress={() => setBatchToDelete(null)} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Keep class</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: 20, padding: 18, paddingBottom: 36 },
  eyebrow: { color: colors.gold, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  title: { marginTop: 4, color: colors.text, fontSize: 21, fontWeight: '700' },
  section: { gap: 11 },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  inlineForm: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 45, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, color: colors.text, fontSize: 13 },
  addButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 12, backgroundColor: colors.gold },
  addButtonText: { color: colors.navy, fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  outlineButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: colors.gold, borderRadius: 12, backgroundColor: colors.surface },
  outlineButtonText: { color: colors.navy, fontSize: 12, fontWeight: '700' },
  feeRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  batchName: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  feeEditor: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  currencyPrefix: { color: colors.muted, fontSize: 11 },
  feeInput: { width: 76, minHeight: 38, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.surface, color: colors.text, textAlign: 'right', fontSize: 12 },
  saveButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 8 },
  saveButtonText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  deleteButton: { width: 34, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: colors.dangerSurface },
  newBatchForm: { gap: 8, paddingTop: 8 },
  securityCard: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface },
  securityIcon: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#F5EFE8' },
  securityCopy: { flex: 1, gap: 4 },
  securityTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  securityDescription: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  changePinButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface },
  changePinText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  cloudCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface },
  cloudTitle: { color: colors.text, fontSize: 12, fontWeight: '700' },
  comingSoon: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  exportButton: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surface },
  exportText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  mutedText: { color: colors.muted, fontSize: 11 },
  notice: { color: colors.success, fontSize: 12, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 12 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21, 26, 38, 0.55)' },
  pinSheet: { gap: 12, padding: 22, paddingBottom: 30, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.background },
  deleteSheet: { gap: 14, margin: 20, padding: 22, borderRadius: 20, backgroundColor: colors.surface },
  deleteConfirmButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.danger },
  deleteConfirmText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
  sheetHandle: { width: 35, height: 4, alignSelf: 'center', marginBottom: 4, borderRadius: 3, backgroundColor: colors.border },
  pinTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  pinDescription: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  pinSaveButton: { marginTop: 4 },
  cancelButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});
