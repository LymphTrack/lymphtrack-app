import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { LoadingScreen } from "@/components/loadingScreen";
import { showAlert, confirmAction } from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";

export default function ModifyPasswordScreen() {
  const router = useRouter();
  const {width} = useWindowDimensions();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert("Error", "All fields are required.");
      return;
    }
    if (newPassword === currentPassword) {
      showAlert("Error", "New password must be different from current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert("Error", "New passwords do not match.");
      return;
    }
    try {
      setSaving(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        showAlert("Error", "Unable to fetch user session.");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (signInError) {
        showAlert("Error", "Current password is incorrect.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        showAlert("Error", `${updateError.message}`);
        return;
      }
      showAlert("Success", "Password updated successfully!");
      router.back();

    } catch (err) {
      console.error(err);
      showAlert("Error", "Unexpected error occurred.");
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

  if (saving) return <LoadingScreen text="Updating password..." />;

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
          Change Password</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.form , width >= 700 && {width : 700 , alignSelf : "center"}]}>
        <Text style={commonStyles.inputTitle}>Current Password</Text>
          <TextInput
            style={commonStyles.input}
            placeholder="Enter current password"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />

          <Text style={commonStyles.inputTitle}>New Password</Text>
          <TextInput
            style={commonStyles.input}
            placeholder="Enter new password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <Text style={commonStyles.inputTitle}>Confirm New Password</Text>
          <TextInput
            style={commonStyles.input}
            placeholder="Re-enter new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

        <TouchableOpacity
          style={commonStyles.button}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={commonStyles.buttonText}>Update Password</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { 
    padding: 24 
  },
});
