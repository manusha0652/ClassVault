import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ClassSession, Payment } from '../types';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { colors } from '../theme';

interface ConfirmPaymentSheetProps {
  visible: boolean;
  studentName: string;
  session: ClassSession | null;
  payment: Payment | null;
  defaultAmount: number;
  onConfirm: (amountPaid: number) => void;
  onRevert: () => void;
  onClose: () => void;
}

export function ConfirmPaymentSheet({
  visible,
  studentName,
  session,
  payment,
  defaultAmount,
  onConfirm,
  onRevert,
  onClose,
}: ConfirmPaymentSheetProps) {
  const isPaid = payment?.status === 'PAID';
  const amountDue = Math.max(0, defaultAmount - (payment?.amountPaid ?? 0));
  const [amount, setAmount] = useState(String(amountDue));
  const [validationMessage, setValidationMessage] = useState('');

  function confirm(): void {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > amountDue) {
      setValidationMessage(`Enter an amount up to ${formatCurrency(amountDue)}.`);
      return;
    }
    onConfirm(parsedAmount);
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{studentName}</Text>
          <Text style={styles.subtitle}>{session ? formatShortDate(session.sessionDate) : ''}</Text>
          {isPaid ? (
            <Text style={styles.paidAmount}>Paid {formatCurrency(payment.amountPaid)}</Text>
          ) : (
            <>
              {payment && payment.amountPaid > 0 && (
                <Text style={styles.paidAmount}>Previously collected {formatCurrency(payment.amountPaid)}</Text>
              )}
              <Text style={styles.fieldLabel}>Remaining {formatCurrency(amountDue)}</Text>
              <TextInput
                accessibilityLabel="Additional amount collected"
                keyboardType="decimal-pad"
                onChangeText={(value) => {
                  setAmount(value);
                  setValidationMessage('');
                }}
                selectTextOnFocus
                style={styles.input}
                value={amount}
              />
              <Pressable accessibilityRole="button" onPress={confirm} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Record amount</Text>
              </Pressable>
              {!!validationMessage && <Text accessibilityRole="alert" style={styles.validation}>{validationMessage}</Text>}
            </>
          )}
          {isPaid && (
            <Pressable accessibilityRole="button" onPress={onRevert} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Revert payment</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21, 26, 38, 0.45)' },
  sheet: { gap: 14, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.surface },
  grabber: { width: 36, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: colors.border },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 14 },
  paidAmount: { color: colors.success, fontSize: 16, fontWeight: '700' },
  fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  validation: { color: colors.danger, fontSize: 12 },
  input: { minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.text },
  primaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.gold },
  primaryText: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.danger, borderRadius: 13 },
  secondaryText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  closeButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});