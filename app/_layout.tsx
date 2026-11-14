import { DefaultTheme, Stack, ThemeProvider, router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';
import { SecurityProvider, useSecurity } from '@/src/security/SecurityContext';
import { colors } from '@/src/theme';

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from 'expo-router';

export default function RootLayout() {
  return (
    <SecurityProvider>
      <RootLayoutNav />
    </SecurityProvider>
  );
}

function RootLayoutNav() {
  const { ready, error, teacherName, lockEnabled, unlocked, refresh } = useSecurity();
  const pathname = usePathname();
  const route = pathname.split('/').filter(Boolean)[0];
  const isRoot = pathname === '/';

  useEffect(() => {
    if (!ready || error) return;
    if (!teacherName) {
      if (!isRoot && route !== 'setup') router.replace('/');
      return;
    }
    if (lockEnabled && !unlocked && route !== 'lock') {
      router.replace('/lock');
      return;
    }
    if (route === 'lock' && unlocked) {
      router.replace('/collect');
      return;
    }
    if (isRoot || route === 'setup') {
      router.replace('/collect');
    }
  }, [ready, error, teacherName, lockEnabled, unlocked, route, isRoot]);

  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={styles.root}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="setup" options={{ headerShown: false }} />
          <Stack.Screen name="lock" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="student/[id]" options={{ title: 'Student profile', headerTintColor: colors.navy, headerStyle: { backgroundColor: colors.background } }} />
        </Stack>
        {(!ready || error || (teacherName && lockEnabled && !unlocked && route !== 'lock')) && (
          <View
            accessibilityElementsHidden={!error}
            importantForAccessibility={error ? 'auto' : 'no-hide-descendants'}
            pointerEvents={error ? 'auto' : 'none'}
            style={styles.gate}
          >
            <Text style={styles.gateTitle}>{error ? 'ClassVault could not open' : 'Securing your wallet'}</Text>
            <Text style={styles.gateMessage}>{error ?? 'Please wait while your app lock is checked.'}</Text>
            {!!error && (
              <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.retryButton}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gate: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.navy },
  gateTitle: { color: colors.surface, fontSize: 20, fontWeight: '700' },
  gateMessage: { marginTop: 10, color: '#D1D5DB', fontSize: 14, textAlign: 'center' },
  retryButton: { minHeight: 40, justifyContent: 'center', marginTop: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.gold },
  retryText: { color: colors.navy, fontSize: 13, fontWeight: '700' },
});
