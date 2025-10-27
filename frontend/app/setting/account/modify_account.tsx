import { useState, useEffect } from "react";
import { useWindowDimensions, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter} from "expo-router";
import { supabase } from "@/lib/supabase";
import {API_URL} from "@/constants/api"
import { LoadingScreen } from "@/components/loadingScreen";
import { showAlert, confirmAction } from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";

export default function ModifyAccountScreen() {
  const router = useRouter();
  const {width} = useWindowDimensions();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [institution, setInstitution] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const res = await fetch(`${API_URL}/users/${user.id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        showAlert("Error", "Failed to load user profile");
        return;
      }

      const profile = await res.json();

      setName(profile.name || "");
      setEmail(profile.email || user.email || "");
      setRole(profile.role || "");
      setInstitution(profile.institution || "");

    } catch (error) {
      showAlert("Error", "Unexpected error occurred while loading profile");
      
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (email && email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) {
          showAlert("Error", authError.message);
          return;
        }
      }

      const res = await fetch(`${API_URL}/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          institution,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        showAlert("Error", errorData.detail || "Failed to update user");
        return;
      }
      showAlert("Success", "Account updated successfully!");
      router.back();

    } catch (err) {
      setSaving(false);
      showAlert("Error", "Unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    const confirmed = await confirmAction(
      "Unsaved Changes",
      "If you leave now, your modifications will not be saved. Do you want to continue?",
      "Leave",
      "Stay"
    );
    if (confirmed) {
      router.push("../../(tabs)/settings");
    }
  };


  if (loading) return <LoadingScreen text="Loading ..." />;
  if (saving) return <LoadingScreen text="Saving changes ..." />;

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.secondaryHeader}>
        <View
          style={{
            width: width >= 700 ? 700 : "100%",
            alignSelf: "center",
            paddingHorizontal: width >= 700 ? 30 : 10,
          }}
        >
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text
            pointerEvents="none"
            style={commonStyles.secondaryHeaderTitle}
          >
            Modify Account
          </Text>
        </View>
      </View>
        
      <ScrollView >
        <View style={[styles.form , width >= 600 && {width : 600 , alignSelf : "center"}]}>
            <Text style={commonStyles.inputTitle}>Full Name</Text>
            <TextInput
              style={commonStyles.input}
              placeholder="Enter name"
              placeholderTextColor={COLORS.inputText}
              value={name}
              onChangeText={setName}
            />

            <Text style={commonStyles.inputTitle}>Email</Text>
            <TextInput
              style={commonStyles.input}
              placeholder="Enter email"
              placeholderTextColor={COLORS.inputText}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={commonStyles.inputTitle}>Role</Text>
            <TextInput
              style={commonStyles.input}
              placeholder="Doctor, Researcher, Student..."
              placeholderTextColor={COLORS.inputText}
              value={role}
              onChangeText={setRole}
            />

            <Text style={commonStyles.inputTitle}>Institution</Text>
            <TextInput
              style={commonStyles.input}
              placeholder="University / Hospital"
              placeholderTextColor={COLORS.inputText}
              value={institution}
              onChangeText={setInstitution}
            />

          <TouchableOpacity
            style={commonStyles.button}
            onPress={handleSave}
          >
            <Text style={commonStyles.buttonText}>Save Changes</Text>
          </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  form: { 
    padding: 24 
  },
});
