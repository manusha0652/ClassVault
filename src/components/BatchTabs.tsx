import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Batch } from '../types';
import { colors } from '../theme';

interface BatchTabsProps {
  batches: Batch[];
  activeBatchId: number | null;
  studentCounts?: Record<number, number>;
  onSelect: (batchId: number) => void;
}

export function BatchTabs({ batches, activeBatchId, studentCounts = {}, onSelect }: BatchTabsProps) {
  return (
    <View style={styles.row}>
      {batches.map((batch) => {
        const isActive = batch.id === activeBatchId;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={batch.id}
            onPress={() => onSelect(batch.id)}
            style={[styles.tab, isActive && styles.activeTab]}
          >
            <Text style={[styles.name, isActive && styles.activeText]}>{batch.name}</Text>
            <Text style={[styles.count, isActive && styles.activeText]}>{studentCounts[batch.id] ?? 0}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  tab: { width: '31%', minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, paddingHorizontal: 10, borderRadius: 13, backgroundColor: '#F0F1F4' },
  activeTab: { backgroundColor: colors.navy },
  name: { flexShrink: 1, color: colors.text, fontSize: 12, fontWeight: '600' },
  count: { minWidth: 16, color: colors.muted, fontSize: 10, textAlign: 'center' },
  activeText: { color: '#FFFFFF' },
});