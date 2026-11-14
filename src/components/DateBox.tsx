import { Pressable, StyleSheet, Text } from 'react-native';

import type { PaymentStatus } from '../types';
import { colors } from '../theme';

interface DateBoxProps {
  label: string;
  status: PaymentStatus;
  onPress: () => void;
}

export function DateBox({ label, status, onPress }: DateBoxProps) {
  const isPaid = status === 'PAID';

  return (
    <Pressable
      accessibilityLabel={`${label}, ${isPaid ? 'paid' : 'unpaid'}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.box, isPaid ? styles.paid : styles.unpaid]}
    >
      <Text style={[styles.label, isPaid ? styles.paidText : styles.unpaidText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { width: 62, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  paid: { backgroundColor: colors.successSurface },
  unpaid: { backgroundColor: colors.dangerSurface },
  label: { fontSize: 12, fontWeight: '700' },
  paidText: { color: colors.success },
  unpaidText: { color: colors.danger },
});