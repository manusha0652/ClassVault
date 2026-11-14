import { useMappingHelper } from '@shopify/flash-list';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ClassSession, Payment, Student } from '../types';
import { formatRegistrationNumber } from '../utils/formatters';
import { DateBox } from './DateBox';
import { colors } from '../theme';

interface StudentFeeCardProps {
  student: Student;
  sessions: ClassSession[];
  payments: Payment[];
  arrearsCount?: number;
  onSessionPress: (session: ClassSession, payment: Payment | undefined) => void;
}

export function StudentFeeCard({ student, sessions, payments, arrearsCount, onSessionPress }: StudentFeeCardProps) {
  const { getMappingKey } = useMappingHelper();
  const studentPayments = payments.filter((payment) => payment.studentId === student.id);
  const currentMonthUnpaidCount = sessions.filter((session) =>
    !studentPayments.some((payment) => payment.sessionId === session.id && payment.status === 'PAID'),
  ).length;
  const unpaidCount = arrearsCount ?? currentMonthUnpaidCount;

  return (
    <View style={styles.card}>
      <View style={styles.details}>
        <View style={styles.nameBlock}>
          <Text style={styles.registration}>{formatRegistrationNumber(student.regNumber)}</Text>
          <Text numberOfLines={1} style={styles.name}>{student.fullName}</Text>
          {!!student.phone && <Text style={styles.phone}>{student.phone}</Text>}
        </View>
        {unpaidCount > 0 && <Text style={styles.arrears}>{unpaidCount} due</Text>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessions}>
        {sessions.map((session, index) => {
          const payment = studentPayments.find((item) => item.sessionId === session.id);
          return (
            <DateBox
              key={getMappingKey(index, session.id)}
              label={session.sessionDate.slice(5)}
              status={payment?.status ?? 'UNPAID'}
              onPress={() => onSessionPress(session, payment)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: colors.surface },
  details: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nameBlock: { flex: 1, gap: 2 },
  registration: { color: colors.gold, fontSize: 11, fontWeight: '800' },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  phone: { color: colors.muted, fontSize: 12 },
  arrears: { overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: colors.dangerSurface, color: colors.danger, fontSize: 11, fontWeight: '700' },
  sessions: { gap: 8, paddingTop: 12 },
});