import { Tabs } from 'expo-router';
import { Users, Settings, BarChart3, Shield } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { API_URL } from '@/constants/api';
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserProfile {
  id: string;
  user_type?: string;
}

export default function TabLayout() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const userId = await AsyncStorage.getItem("userId");
        if (!userId) {
          console.error("No userId found in storage");
          return;
        }

        const res = await fetch(`${API_URL}/users/${userId}`);
        if (!res.ok) {
          console.error("Error fetching user profile:", res.statusText);
          return;
        }

        const data = await res.json();
        setUserProfile(data);

        if (data?.user_type === "admin") {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
      }
    }

    fetchUserRole();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6a90db',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 12,
          height: 90,
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

      {isAdmin && (
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarIcon: ({ size, color }) => (
              <Shield size={size} color={color} />
            ),
          }}
        />
      )}
    </Tabs>
  );
}
