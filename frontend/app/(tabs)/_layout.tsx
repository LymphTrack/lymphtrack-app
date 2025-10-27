import { Tabs } from 'expo-router';
import { Users, Settings, BarChart3 } from 'lucide-react-native';
import { Platform} from 'react-native';
import {COLORS} from '@/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.subtitle,
        tabBarStyle: {
          backgroundColor: COLORS.tabsBackground,
          borderTopColor: COLORS.grayLight,
          paddingBottom: 8,
          paddingTop: Platform.OS === 'web' ? 8 : 12,
          height: Platform.OS === 'web' ? 70 : 90,
        },
      }}
    >
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          tabBarIcon: ({ size, color }) => (
            <Users size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="outcomes"
        options={{
          title: 'Outcomes',
          tabBarIcon: ({ size, color }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
