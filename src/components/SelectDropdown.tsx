import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export interface DropdownOption {
  value: string;
  label: string;
}

interface SelectDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function SelectDropdown({
  label,
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: isOpen }}
        disabled={disabled}
        onPress={() => setIsOpen((open) => !open)}
        style={[styles.trigger, disabled && styles.disabled]}
      >
        <Text numberOfLines={1} style={[styles.value, !selectedOption && styles.placeholder]}>
          {selectedOption?.label ?? placeholder}
        </Text>
        {isOpen
          ? <ChevronUp color={colors.muted} size={18} />
          : <ChevronDown color={colors.muted} size={18} />}
      </Pressable>
      {isOpen && (
        <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === value }}
              key={option.value}
              onPress={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={[styles.option, option.value === value && styles.selectedOption]}
            >
              <Text style={[styles.optionLabel, option.value === value && styles.selectedOptionLabel]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
          {options.length === 0 && <Text style={styles.empty}>No options available.</Text>}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  trigger: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface },
  value: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  placeholder: { color: colors.muted },
  disabled: { opacity: 0.55 },
  options: { maxHeight: 190, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface },
  option: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  selectedOption: { backgroundColor: '#F5EFE8' },
  optionLabel: { color: colors.text, fontSize: 12, fontWeight: '500' },
  selectedOptionLabel: { color: colors.navy, fontWeight: '700' },
  empty: { padding: 12, color: colors.muted, fontSize: 12 },
});
