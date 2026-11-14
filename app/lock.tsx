import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { Delete, Fingerprint, GraduationCap, LockKeyhole } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { checkAppPin } from '@/src/security/pin';
import { useSecurity } from '@/src/security/SecurityContext';
import { colors } from '@/src/theme';

export default function LockScreen() {
  const { setUnlocked, teacherName } = useSecurity();
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const biometricPrompted = useRef(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkBiometrics(): Promise<void> {
      if (Platform.OS === 'web') return;
      try {
        const [hardware, enrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        if (active) setBiometricAvailable(hardware && enrolled);
      } catch {
        if (active) setBiometricAvailable(false);
      }
    }
    void checkBiometrics();
    return () => { active = false; };
  }, []);

  const authenticateBiometric = useCallback(async (): Promise<void> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock your ClassVault',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: true,
        biometricsSecurityLevel: 'strong',
      });
      if (result.success) {
        setUnlocked(true);
        router.replace('/collect');
      } else if (result.error !== 'user_cancel' && result.error !== 'user_fallback') {
        setErrorMessage('Biometric check was not completed. Enter your PIN to continue.');
      }
    } catch {
      setErrorMessage('Biometric authentication is unavailable. Enter your PIN to continue.');
    }
  }, [setUnlocked]);

  useEffect(() => {
    if (!biometricAvailable || biometricPrompted.current) return;
    biometricPrompted.current = true;
    void authenticateBiometric();
  }, [biometricAvailable, authenticateBiometric]);

  async function verifyPin(value: string): Promise<void> {
    if (checking) return;
    setChecking(true);
    setErrorMessage('');
    try {
      if (await checkAppPin(value)) {
        setUnlocked(true);
        router.replace('/collect');
      } else {
        setPin('');
        setErrorMessage('That PIN did not match. Try again.');
      }
    } catch (error) {
      setPin('');
      setErrorMessage(error instanceof Error ? error.message : 'Could not verify your PIN.');
    } finally {
      setChecking(false);
    }
  }

  function pressDigit(digit: string): void {
    if (checking || pin.length >= 4) return;
    const nextPin = `${pin}${digit}`;
    setPin(nextPin);
    if (nextPin.length === 4) void verifyPin(nextPin);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.brand}><View style={styles.brandIcon}><GraduationCap color={colors.gold} size={22} strokeWidth={1.6} /></View><Text style={styles.brandName}>ClassVault</Text></View>
      <View style={styles.lockIcon}><LockKeyhole color={colors.gold} size={29} strokeWidth={1.5} /></View>
      <Text style={styles.greeting}>Welcome back{teacherName ? `, ${teacherName}` : ''}</Text>
      <Text style={styles.subtitle}>Enter your PIN to unlock your wallet</Text>
      <View accessibilityLabel={`${pin.length} of 4 PIN digits entered`} style={styles.dots}>
        {[0, 1, 2, 3].map((index) => <View key={index} style={[styles.dot, index < pin.length && styles.filledDot]} />)}
      </View>
      {!!errorMessage && <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text>}
      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((digit, index) => (
          digit === '' ? <View key={`empty-${index}`} style={styles.key} /> : (
            <Pressable
              accessibilityLabel={digit === 'delete' ? 'Delete last digit' : `Digit ${digit}`}
              accessibilityRole="button"
              key={digit}
              onPress={() => digit === 'delete' ? setPin((current) => current.slice(0, -1)) : pressDigit(digit)}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            >
              {digit === 'delete' ? <Delete color={colors.surface} size={21} strokeWidth={1.6} /> : <Text style={styles.digit}>{digit}</Text>}
            </Pressable>
          )
        ))}
      </View>
      {biometricAvailable && (
        <Pressable accessibilityRole="button" onPress={() => void authenticateBiometric()} style={styles.biometricButton}>
          <Fingerprint color={colors.gold} size={20} strokeWidth={1.6} />
          <Text style={styles.biometricText}>Use biometrics</Text>
        </Pressable>
      )}
      <Text style={styles.footer}>Your class and payment data is protected on this device.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 20, backgroundColor: colors.navy },
  brand: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#2A3040' },
  brandName: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  lockIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginTop: 32, borderWidth: 1, borderColor: '#414758', borderRadius: 22, backgroundColor: '#252C3B' },
  greeting: { marginTop: 18, color: colors.surface, fontSize: 23, fontWeight: '700', textAlign: 'center' },
  subtitle: { marginTop: 7, color: '#A8B0BD', fontSize: 13 },
  dots: { flexDirection: 'row', gap: 18, marginTop: 25, marginBottom: 12 },
  dot: { width: 12, height: 12, borderWidth: 1.5, borderColor: '#778091', borderRadius: 7 },
  filledDot: { borderColor: colors.gold, backgroundColor: colors.gold },
  error: { minHeight: 18, marginTop: 4, color: '#FCA5A5', fontSize: 12, textAlign: 'center' },
  keypad: { width: '100%', maxWidth: 300, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 20 },
  key: { width: '29%', aspectRatio: 1.42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#343B4B', borderRadius: 17, backgroundColor: '#222938' },
  keyPressed: { borderColor: colors.gold, backgroundColor: '#303544' },
  digit: { color: colors.surface, fontSize: 24, fontWeight: '500' },
  biometricButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, padding: 10 },
  biometricText: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  footer: { marginTop: 'auto', paddingVertical: 22, color: '#7F8999', fontSize: 11, textAlign: 'center' },
});
