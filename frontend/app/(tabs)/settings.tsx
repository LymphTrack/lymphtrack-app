import { useState, useCallback} from 'react';
import { useWindowDimensions ,View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter} from 'expo-router';
import { User, Shield, LogOut, ChevronRight, Mail, Briefcase, Building, Lock , ShieldCheck, ScrollText, } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "@/constants/api";
import { LoadingScreen } from "@/components/loadingScreen";
import { COLORS } from '@/constants/colors';
import { commonStyles } from '@/constants/styles';
import { confirmAction } from '@/utils/alertUtils';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  institution: string;
  user_type : string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const {width} = useWindowDimensions();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error getting user:", userError);
        return;
      }

    const res = await fetch(`${API_URL}/users/${user.id}`);
      if (!res.ok) {
        console.error("Error fetching user profile:", res.statusText);
        return;
      }
      const profile = await res.json();

      setUserProfile({
        id: profile.id,
        email: profile.email || user.email, 
        name: profile.name || "Unknown Doctor",
        role: profile.role || "Unknown role",
        institution: profile.institution || "Unknown Institution",
        user_type: profile.user_type,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const confirmed = await confirmAction(
      "Sign Out",
      "Are you sure you want to sign out?",
      "Sign Out",
      "Cancel"
    );

    if (confirmed) {
      await supabase.auth.signOut();
      router.replace("/(auth)/login");
    }
  };

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    showChevron = true 
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Icon size={20} color={COLORS.butonText} />
        </View>
        <View>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showChevron && <ChevronRight size={20} color={COLORS.grayDark} />}
    </TouchableOpacity>
  );

  if (loading) return <LoadingScreen text="Loading data..." />;

  return (
    <View style={commonStyles.container}>
      <View style={[commonStyles.header, width >=700 && {justifyContent: "center"}]}>
        <Text style={[commonStyles.headerTitle, width >= 700 && {width : 700}]}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[commonStyles.form , width >=700 && { width : 700, alignSelf: "center"}]}>
          <View style={[commonStyles.card, {flexDirection: 'row',alignItems: 'center',}]}>
            <View style={styles.avatarContainer}>
              <User size={32} color={COLORS.white} />
            </View>
            <View>
              <Text style={commonStyles.title}>{userProfile?.name}</Text>
              <Text style={commonStyles.subtitle}>{userProfile?.email}</Text>
              <Text style={commonStyles.buttonText}>{userProfile?.role} at {userProfile?.institution}</Text>
            </View>
          </View>

          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>Account</Text>

            <View style={styles.item}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <User size={20} color={COLORS.butonText} />
                </View>
                <View>
                  <Text style={styles.settingTitle}>Name</Text>
                  <Text style={styles.settingSubtitle}>{userProfile?.name}</Text>
                </View>
              </View>
            </View>

            <View style={styles.item}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Mail size={20} color={COLORS.butonText} />
                </View>
                <View>
                  <Text style={styles.settingTitle}>Email</Text>
                  <Text style={styles.settingSubtitle}>{userProfile?.email}</Text>
                </View>
              </View>
            </View>

            <View style={styles.item}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Briefcase size={20} color={COLORS.butonText} />
                </View>
                <View>
                  <Text style={styles.settingTitle}>Role</Text>
                  <Text style={styles.settingSubtitle}>{userProfile?.role}</Text>
                </View>
              </View>
            </View>
            <View style={styles.item}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Building size={20} color={COLORS.butonText} />
                </View>
                <View>
                  <Text style={styles.settingTitle}>Institution</Text>
                  <Text style={styles.settingSubtitle}>{userProfile?.institution}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[commonStyles.button, {width : "100%"}]}
              onPress={() => router.push("../setting/account/modify_account")}
            >
              <Text style={commonStyles.buttonText}>Modify Account</Text>
            </TouchableOpacity>
          </View>

          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>Security & Privacy</Text>

            <SettingItem
              icon={Lock}
              title="Change Password"
              subtitle="Update your login credentials"
              onPress={() => router.push("../setting/security/modify_password")}
            />

            <SettingItem
              icon={ShieldCheck}
              title="Privacy Policy"
              subtitle="How we protect your data"
              onPress={() => router.push("../setting/security/privacy_policy")}
            />

            <SettingItem
              icon={ScrollText}
              title="Terms of Use"
              subtitle="Read our usage guidelines"
              onPress={() => router.push("../setting/security/terms_of_use")}
            />
          </View>

        
          {userProfile?.user_type === "admin" && (
            <View style={commonStyles.card}>
              <Text style={styles.sectionTitle}>Administrator</Text>
              <SettingItem
                icon={Shield}
                title="User Management"
                subtitle="Update or create User"
                onPress={() => router.push("../setting/admin/admin")}
              />
            </View>
          )}

          <View style={commonStyles.card}>
            <Text style={styles.sectionTitle}>About</Text>
    
            <View style={styles.item}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            
            <View style={styles.item}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>2025.08.28</Text>
            </View>
          </View>

          <TouchableOpacity style={[commonStyles.card, {flexDirection: 'row',justifyContent: "center", marginBottom:20}]} onPress={handleSignOut}>
            <LogOut size={20} color={COLORS.butonText} />
            <Text style={[commonStyles.buttonText, {marginLeft:5}]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: COLORS.subtitle,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.subtitle,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
});