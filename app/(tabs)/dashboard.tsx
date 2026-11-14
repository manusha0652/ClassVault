import { RefreshCw, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBatchIncomeSummary, getDashboardMetrics, type IncomePeriod } from '@/src/db/queries';
import { useClassStore } from '@/src/store/useClassStore';
import type { DashboardMetrics } from '@/src/types';
import { formatCurrency } from '@/src/utils/formatters';
import { colors } from '@/src/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const locations = useClassStore((state) => state.locations);
  const dataVersion = useClassStore((state) => state.dataVersion);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [batchIncome, setBatchIncome] = useState<Awaited<ReturnType<typeof getBatchIncomeSummary>>>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [period, setPeriod] = useState<IncomePeriod>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const maxBatchIncome = Math.max(1, ...batchIncome.map((item) => item.amount));
  const totalDue = metrics?.pendingAmount ?? 0;
  const collected = metrics?.collected ?? 0;
  const collectedShare = collected + totalDue > 0 ? (collected / (collected + totalDue)) * 100 : 0;

  useEffect(() => {
    let active = true;
    void Promise.all([
      getDashboardMetrics(selectedLocationId, period),
      getBatchIncomeSummary(selectedLocationId, period),
    ])
      .then(([nextMetrics, nextBatchIncome]) => {
        if (!active) return;
        setMetrics(nextMetrics);
        setBatchIncome(nextBatchIncome);
        setErrorMessage('');
      })
      .catch(() => {
        if (active) setErrorMessage('Could not load income totals.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [selectedLocationId, period, refreshKey, dataVersion]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>FINANCIAL OVERVIEW</Text>
          <Text style={styles.title}>Your dashboard</Text>
        </View>
        <Pressable
          accessibilityLabel="Refresh dashboard"
          accessibilityRole="button"
          onPress={() => { setIsLoading(true); setRefreshKey((key) => key + 1); }}
          style={styles.refreshButton}
        >
          <RefreshCw color={colors.navy} size={19} strokeWidth={1.7} />
        </Pressable>
      </View>

      <View style={styles.filterBlock}>
        <Text style={styles.filterLabel}>LOCATION</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable onPress={() => { setIsLoading(true); setSelectedLocationId(null); }} style={[styles.locationPill, selectedLocationId === null && styles.selectedLocation]}>
            <Text style={[styles.locationPillText, selectedLocationId === null && styles.selectedLocationText]}>All locations</Text>
          </Pressable>
          {locations.map((location) => (
            <Pressable key={location.id} onPress={() => { setIsLoading(true); setSelectedLocationId(location.id); }} style={[styles.locationPill, selectedLocationId === location.id && styles.selectedLocation]}>
              <Text style={[styles.locationPillText, selectedLocationId === location.id && styles.selectedLocationText]}>{location.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.periodRow}>
        {([
          ['week', 'This week'],
          ['month', 'This month'],
          ['year', 'This year'],
        ] as const).map(([value, label]) => (
          <Pressable key={value} onPress={() => { setIsLoading(true); setPeriod(value); }} style={[styles.periodPill, period === value && styles.selectedPeriod]}>
            <Text style={[styles.periodText, period === value && styles.selectedPeriodText]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}

      <View style={styles.collectedCard}>
        <View style={styles.metricHeading}>
          <Text style={styles.heroLabel}>TOTAL COLLECTED</Text>
          <View style={styles.heroIcon}><TrendingUp color={colors.gold} size={17} strokeWidth={1.8} /></View>
        </View>
        <Text style={styles.heroValue}>{isLoading ? '…' : formatCurrency(collected)}</Text>
        <Text style={styles.heroCaption}>{period === 'week' ? 'Collected since Monday' : period === 'month' ? 'Collected this month' : 'Collected this year'}</Text>
      </View>

      <View style={styles.kpiRow}>
        <Pressable
          accessibilityHint="Opens the student list filtered to students with unpaid fees"
          accessibilityLabel="View pending arrears students"
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/students', params: { filter: 'arrears' } })}
          style={styles.kpiCard}
        >
          <Text style={styles.kpiLabel}>Pending arrears</Text>
          <Text style={styles.pendingAmount}>{isLoading ? '…' : formatCurrency(totalDue)}</Text>
          <Text style={styles.kpiCaption}>{isLoading ? ' ' : `${metrics?.pendingPayments ?? 0} unpaid fees · View students`}</Text>
        </Pressable>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Active students</Text>
          <Text style={styles.kpiValue}>{isLoading ? '…' : metrics?.activeStudents ?? 0}</Text>
          <Text style={styles.kpiCaption}>Across selected classes</Text>
        </View>
      </View>

      <View style={styles.breakdownCard}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Collected vs pending</Text>
          <Text style={styles.totalLabel}>{formatCurrency(collected + totalDue)}</Text>
        </View>
        <View accessibilityLabel={`${Math.round(collectedShare)} percent collected`} style={styles.barTrack}>
          <View style={[styles.collectedBar, { width: `${collectedShare}%` }]} />
          <View style={[styles.pendingBar, { width: `${100 - collectedShare}%` }]} />
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}><View style={styles.collectedDot} /><Text style={styles.legendText}>Collected</Text></View>
          <View style={styles.legendItem}><View style={styles.pendingDot} /><Text style={styles.legendText}>Pending arrears</Text></View>
        </View>
      </View>

      <View style={styles.incomeSection}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Class-wise revenue</Text>
          <Text style={styles.smallLabel}>{period === 'week' ? 'WEEK' : period === 'month' ? 'MONTH' : 'YEAR'}</Text>
        </View>
        {batchIncome.length === 0 && !isLoading ? (
          <Text style={styles.empty}>No class payments in this period.</Text>
        ) : (
          batchIncome.map((item) => (
            <View key={item.batchId} style={styles.incomeRow}>
              <View style={styles.incomeLabels}>
                <Text style={styles.batchName}>{item.batchName}</Text>
                {selectedLocationId === null && <Text style={styles.locationName}>{item.locationName}</Text>}
                <Text style={styles.incomeAmount}>{formatCurrency(item.amount)}</Text>
              </View>
              <View style={styles.revenueTrack}>
                <View style={[styles.revenueFill, { width: `${(item.amount / maxBatchIncome) * 100}%` }]} />
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: 16, padding: 18, paddingBottom: 34 },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.gold, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  title: { marginTop: 4, color: colors.text, fontSize: 20, fontWeight: '700' },
  refreshButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface },
  filterBlock: { gap: 7 },
  filterLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  filterRow: { gap: 7 },
  locationPill: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 12, backgroundColor: '#EFF0F3' },
  selectedLocation: { backgroundColor: colors.navy },
  locationPillText: { color: colors.text, fontSize: 11, fontWeight: '600' },
  selectedLocationText: { color: colors.surface },
  periodRow: { flexDirection: 'row', gap: 7 },
  periodPill: { flex: 1, minHeight: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.surface },
  selectedPeriod: { borderColor: colors.gold, backgroundColor: '#F5EFE8' },
  periodText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  selectedPeriodText: { color: colors.navy },
  collectedCard: { gap: 8, padding: 17, borderRadius: 18, backgroundColor: colors.navy },
  metricHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: '#C8CDD6', fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  heroIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#303747' },
  heroValue: { color: colors.gold, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  heroCaption: { color: '#A8B0BD', fontSize: 11 },
  kpiRow: { flexDirection: 'row', gap: 9 },
  kpiCard: { flex: 1, minHeight: 93, justifyContent: 'space-between', padding: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface },
  kpiLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  pendingAmount: { color: colors.danger, fontSize: 18, fontWeight: '700' },
  kpiValue: { color: colors.text, fontSize: 20, fontWeight: '700' },
  kpiCaption: { color: colors.muted, fontSize: 10 },
  breakdownCard: { gap: 13, padding: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  totalLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  barTrack: { height: 9, flexDirection: 'row', overflow: 'hidden', borderRadius: 5, backgroundColor: '#FEE2E2' },
  collectedBar: { height: 9, backgroundColor: colors.gold },
  pendingBar: { height: 9, backgroundColor: '#FCA5A5' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  collectedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
  pendingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FCA5A5' },
  legendText: { color: colors.muted, fontSize: 10 },
  incomeSection: { gap: 12, paddingTop: 2 },
  smallLabel: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  incomeRow: { gap: 8, paddingVertical: 9 },
  incomeLabels: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  batchName: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '600' },
  locationName: { color: colors.muted, fontSize: 10 },
  incomeAmount: { color: colors.text, fontSize: 11, fontWeight: '700' },
  revenueTrack: { height: 6, overflow: 'hidden', borderRadius: 4, backgroundColor: '#ECEEF1' },
  revenueFill: { height: 6, borderRadius: 4, backgroundColor: colors.gold },
  empty: { paddingVertical: 20, color: colors.muted, fontSize: 12 },
  error: { color: colors.danger, fontSize: 12 },
});
