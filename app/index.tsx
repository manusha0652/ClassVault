import { router } from 'expo-router';
import { ArrowRight, GraduationCap, ShieldCheck, Wallet } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/src/theme';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.logo}><GraduationCap color={colors.gold} size={27} strokeWidth={1.6} /></View>
        <Text style={styles.brandName}>ClassVault</Text>
      </View>
      <View style={styles.hero}>
        <View style={styles.illustration}>
          <View style={styles.wallet}>
            <Wallet color={colors.navy} size={68} strokeWidth={1.35} />
            <View style={styles.shield}><ShieldCheck color={colors.surface} size={24} strokeWidth={1.7} /></View>
          </View>
          <View style={styles.sparkOne} />
          <View style={styles.sparkTwo} />
        </View>
        <Text style={styles.title}>Your classes.{'\n'}Your finances.{'\n'}All in one place.</Text>
        <Text style={styles.description}>A private, simple way to track tuition fees and keep every student account in order.</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/setup')} style={styles.button}>
        <Text style={styles.buttonText}>Get started</Text>
        <ArrowRight color={colors.navy} size={19} strokeWidth={1.8} />
      </Pressable>
      <Text style={styles.footer}>PRIVATE BY DESIGN · WORKS OFFLINE</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'space-between', padding: 26, backgroundColor: colors.navy },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 16 },
  logo: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#222A39' },
  brandName: { color: colors.surface, fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  hero: { alignItems: 'center', paddingHorizontal: 4 },
  illustration: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: 34, borderRadius: 56, backgroundColor: '#202737' },
  wallet: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center', borderRadius: 40, backgroundColor: '#F3E9DD' },
  shield: { position: 'absolute', right: 12, bottom: 10, width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.navy, borderRadius: 22, backgroundColor: colors.gold },
  sparkOne: { position: 'absolute', top: 29, right: 25, width: 8, height: 8, borderRadius: 5, backgroundColor: colors.gold },
  sparkTwo: { position: 'absolute', left: 22, bottom: 31, width: 6, height: 6, borderRadius: 3, backgroundColor: '#8792A2' },
  title: { color: colors.surface, fontSize: 33, fontWeight: '700', lineHeight: 40, textAlign: 'center', letterSpacing: -0.5 },
  description: { maxWidth: 310, marginTop: 16, color: '#A8B0BD', fontSize: 15, lineHeight: 23, textAlign: 'center' },
  button: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 17, backgroundColor: colors.gold },
  buttonText: { color: colors.navy, fontSize: 16, fontWeight: '700' },
  footer: { paddingBottom: 8, color: '#7F8999', fontSize: 10, fontWeight: '700', textAlign: 'center', letterSpacing: 1.4 },
});
