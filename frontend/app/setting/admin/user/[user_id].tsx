import { useState, useEffect } from "react";
import {View,Text,TextInput,TouchableOpacity,StyleSheet,ScrollView,useWindowDimensions,KeyboardAvoidingView,Platform,} from "react-native";
import { ArrowLeft, Save, Trash, User,Building,Briefcase, Mail  } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { API_URL } from "@/constants/api";
import { LoadingScreen } from "@/components/loadingScreen";
import { showAlert, confirmAction } from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { SegmentedControl } from "@/components/segmentedControl";
import { InputField } from "@/components/inputField";

export default function ModifyUserScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    institution: "",
    user_type: "user" as "user" | "admin",
  });

  useEffect(() => {
    if (user_id) {
      loadUser();
    }
  }, [user_id]);

  const loadUser = async () => {
    try {
      const res = await fetch(`${API_URL}/users/${user_id}`);
      if (!res.ok) throw new Error("Failed to load user data");
      const data = await res.json();

      setFormData({
        name: data.name || "",
        email: data.email || "",
        role: data.role || "",
        institution: data.institution || "",
        user_type: data.user_type || "user",
      });
    } catch (error) {
      console.error("Error loading user:", error);
      showAlert("Error", "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/users/${user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update user");
      }

      showAlert("Success", "User updated successfully!");
      router.replace("../admin");
    } catch (err) {
      console.error("Error updating user:", err);
      showAlert("Error", "Unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    const confirmed = await confirmAction(
      "Confirm deletion",
      "Are you sure you want to delete this user?",
      "Delete",
      "Cancel"
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/users/${user_id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to delete user");
      }

      showAlert("Success", "User deleted successfully!");
      router.replace("../admin");
    } catch (err) {
      console.error("Error deleting user:", err);
      showAlert("Error", "Unexpected error occurred");
    } finally {
      setDeleting(false);
    }
  };

  const handleBack = async () => {
    const confirmed = await confirmAction(
      "Unsaved Changes",
      "If you leave now, your modifications will not be saved. Do you want to continue?",
      "Leave",
      "Stay"
    );
    if (confirmed) router.push("../admin");
  };

  if (loading) return <LoadingScreen text="Loading user..." />;
  if (saving) return <LoadingScreen text="Saving changes..." />;
  if (deleting) return <LoadingScreen text="Deleting user..." />;


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
            Modify User
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          
        >
          <View style={[styles.form, width >= 600 && { width: 600, alignSelf: "center" }]}>
            <InputField
              label="Full Name"
              icon={<User size={18} color={COLORS.text} style={styles.inputIcon} />}
              placeholder="Enter full name ..."
              value={formData.name}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
            />

            <InputField
              label="Email"
              required
              icon={<Mail size={18} color={COLORS.text} style={styles.inputIcon} />}
              placeholder="Enter email ..."
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
            />

            <InputField
              label="Role"
              optional
              icon={<Briefcase size={18} color={COLORS.text} style={styles.inputIcon} />}
              placeholder="Enter role (ex: Doctor) ..."
              value={formData.role}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, role: text }))}
            />

            <InputField
              label="Institution"
              optional
              icon={<Building size={18} color={COLORS.text} style={styles.inputIcon} />}
              placeholder="Enter institution ..."
              value={formData.institution}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, institution: text }))}
            />

            <SegmentedControl
              options={["user", "admin"]}
              value={formData.user_type}
              onValueChange={(val) =>
                setFormData((prev) => ({ ...prev, user_type: val as "user" | "admin" }))
              }
            />

            <TouchableOpacity
              style={commonStyles.button}
              onPress={handleSave}
              disabled={saving}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Save size={18} color={COLORS.butonText} style={{ marginRight: 8 }} />
                <Text style={commonStyles.buttonText}>Save Changes</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[commonStyles.button, { backgroundColor: COLORS.lightRed, marginTop: 12 }]}
              onPress={deleteUser}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Trash size={18} color={COLORS.darkRed} style={{ marginRight: 8 }} />
                <Text style={[commonStyles.buttonText, { color: COLORS.darkRed }]}>Delete</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { padding: 24 },
  inputIcon: { marginLeft: 4, marginBottom: -2 },
});
