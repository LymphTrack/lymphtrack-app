import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform, useWindowDimensions } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function ModifyPasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const {width} = useWindowDimensions();

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      if (Platform.OS === "web") {
        window.alert("Error\n\nAll fields are required.");
      } else {
        Alert.alert("Error", "All fields are required.");
      }
      return;
    }

    if (newPassword === currentPassword) {
      if (Platform.OS === "web") {
        window.alert("Error\n\nNew password must be different from current password.");
      } else {
        Alert.alert("Error", "New password must be different from current password.");
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      if (Platform.OS === "web") {
        window.alert("Error\n\nNew passwords do not match.");
      } else {
        Alert.alert("Error", "New passwords do not match.");
      }
      return;
    }

    try {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        if (Platform.OS === "web") {
          window.alert("Error\n\nUnable to fetch user session.");
        } else {
          Alert.alert("Error", "Unable to fetch user session.");
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        if (Platform.OS === "web") {
          window.alert("Error\n\nCurrent password is incorrect.");
        } else {
          Alert.alert("Error", "Current password is incorrect.");
        }
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        if (Platform.OS === "web") {
          window.alert(`Error\n\n${updateError.message}`);
        } else {
          Alert.alert("Error", updateError.message);
        }
        return;
      }

      if (Platform.OS === "web") {
        window.alert("Success\n\nPassword updated successfully!");
      } else {
        Alert.alert("Success", "Password updated successfully!");
      }
      router.back();

    } catch (err) {
      console.error(err);
      if (Platform.OS === "web") {
        window.alert("Error\n\nUnexpected error occurred.");
      } else {
        Alert.alert("Error", "Unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        "Unsaved Changes\n\nIf you leave now, your modifications will not be saved. Do you want to continue?"
      );
      if (confirm) {
        router.push("../../(tabs)/settings");
      }
    } else {
      Alert.alert(
        "Unsaved Changes",
        "If you leave now, your modifications will not be saved. Do you want to continue?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => {
              router.push("../../(tabs)/settings");
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View
          style={{
            width: width >= 700 ? 700 : "100%",
             alignSelf: "center",
            flexDirection: "row",
            paddingHorizontal: width >= 700 ? 30 : 10,
            position: "relative",
          }}
        >
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text
            pointerEvents="none"
            style={[
              styles.headerTitle,
              { 
                position: "absolute",
                left: 0,
                right: 0,
                textAlign: "center",
              },
            ]}
          >
          Change Password</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.form, width >= 700 && {width : 700, alignSelf : "center"}]}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter current password"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && { backgroundColor: "#9CA3AF" }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : "Update Password"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 20,
    paddingTop : Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#1F2937" },
  form: { padding: 24 },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  saveButton: {
  backgroundColor: "#c9def9ff",
  marginTop: 16,
  padding: 14,
  borderRadius: 12,
  alignItems: "center",
  },
  saveButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
  },
});
