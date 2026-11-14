import { Tabs } from 'expo-router';
import { ChartNoAxesColumnIncreasing, Settings2, UsersRound, WalletCards } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: '#A8B0BD',
        headerShown: false,
        tabBarStyle: { height: 58 + insets.bottom, paddingTop: 7, paddingBottom: Math.max(insets.bottom, 8), borderTopWidth: 0, backgroundColor: colors.navy },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="collect"
        options={{
          title: 'Collect',
          tabBarIcon: ({ color }) => <WalletCards color={color} size={21} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <ChartNoAxesColumnIncreasing color={color} size={21} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          tabBarIcon: ({ color }) => <UsersRound color={color} size={21} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings2 color={color} size={21} strokeWidth={1.6} />,
        }}
      />
    </Tabs>
  );
}
