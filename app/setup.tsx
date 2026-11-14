import { router } from 'expo-router';
import { ArrowRight, GraduationCap } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { setAppSetting } from '@/src/db/queries';
import { useSecurity } from '@/src/security/SecurityContext';
import { colors } from '@/src/theme';

export default function TeacherSetupScreen() {
  const { refresh } = useSecurity();
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function continueSetup(): Promise<void> {
    const teacherName = name.trim();
    if (!teacherName || saving) return;
    setSaving(true);
    setErrorMessage('');
    try {
      await setAppSetting('teacher_name', teacherName);
      await refresh();
      router.replace('/collect');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Your profile could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.logo}><GraduationCap color={colors.gold} size={25} strokeWidth={1.6} /></View>
        <Text style={styles.step}>YOUR TEACHER PROFILE</Text>
        <Text style={styles.title}>What’s your name, teacher?</Text>
        <Text style={styles.subtitle}>We’ll use it to make your ClassVault feel like yours. Your name stays on this device.</Text>
        <TextInput
          accessibilityLabel="Teacher name"
          autoCapitalize="words"
          autoComplete="name"
          autoFocus
          onChangeText={setName}
          onSubmitEditing={() => void continueSetup()}
          placeholder="Your name"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          style={styles.input}
          value={name}
        />
        {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
        <Pressable accessibilityRole="button" disabled={!name.trim() || saving} onPress={() => void continueSetup()} style={[styles.button, (!name.trim() || saving) && styles.disabled]}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Continue'}</Text>
          <ArrowRight color={colors.navy} size={19} strokeWidth={1.8} />
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', padding: 26 },
  logo: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 36, borderRadius: 16, backgroundColor: colors.navy },
  step: { color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { marginTop: 12, color: colors.text, fontSize: 30, fontWeight: '700', lineHeight: 36, letterSpacing: -0.5 },
  subtitle: { marginTop: 12, color: colors.muted, fontSize: 15, lineHeight: 22 },
  input: { minHeight: 56, marginTop: 32, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface, color: colors.text, fontSize: 16 },
  button: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, borderRadius: 15, backgroundColor: colors.gold },
  buttonText: { color: colors.navy, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  error: { marginTop: 10, color: colors.danger, fontSize: 13 },
});
