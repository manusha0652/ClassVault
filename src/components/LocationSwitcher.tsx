import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Location } from '../types';
import { colors } from '../theme';

interface LocationSwitcherProps {
  locations: Location[];
  activeLocationId: number | null;
  onSelect: (locationId: number) => void;
}

export function LocationSwitcher({ locations, activeLocationId, onSelect }: LocationSwitcherProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {locations.map((location) => {
        const isActive = location.id === activeLocationId;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={location.id}
            onPress={() => onSelect(location.id)}
            style={[styles.option, isActive && styles.activeOption]}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>{location.name}</Text>
          </Pressable>
        );
      })}
      {locations.length === 0 && <View style={styles.empty} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 8 },
  option: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 13, backgroundColor: '#F0F1F4' },
  activeOption: { backgroundColor: colors.navy },
  label: { color: colors.text, fontSize: 13, fontWeight: '600' },
  activeLabel: { color: '#FFFFFF' },
  empty: { height: 40 },
});