import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ArrowLeft, Save, Trash } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { API_URL } from "@/constants/api";

export default function ModifyUserScreen() {
  const { user_id } = useLocalSearchParams<{ user_id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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
      if (Platform.OS === "web") {
        window.alert("Error\n\nFailed to load user data");
      } else {
        Alert.alert("Error", "Failed to load user data");
      }
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

      if (Platform.OS === "web") {
        window.alert("Success\n\nUser updated successfully!");
      } else {
        Alert.alert("Success", "User updated successfully!");
      }
      router.push(`../${user_id}`);
    } catch (err) {
      console.error("Error updating user:", err);
      if (Platform.OS === "web") {
        window.alert("Error\n\nUnexpected error occurred");
      } else {
        Alert.alert("Error", "Unexpected error occurred");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        "Confirm deletion\n\nAre you sure you want to delete this user?"
      );
      if (!confirm) return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/users/${user_id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to delete user");
      }

      if (Platform.OS === "web") {
        window.alert("Success\n\nUser deleted successfully!");
      } else {
        Alert.alert("Success", "User deleted successfully!");
      }
      router.replace("../admin");
    } catch (err) {
      console.error("Error deleting user:", err);
      if (Platform.OS === "web") {
        window.alert("Error\n\nUnexpected error occurred");
      } else {
        Alert.alert("Error", "Unexpected error occurred");
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleBack = () => {
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        "Unsaved Changes\n\nIf you leave now, your modifications will not be saved. Continue?"
      );
      if (confirm) router.push(`../admin`);
    } else {
      Alert.alert(
        "Unsaved Changes",
        "If you leave now, your modifications will not be saved.",
        [
          { text: "Stay", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => router.push(`../${user_id}`) },
        ]
      );
    }
  };

  if (loading || deleting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937" }}>
          {deleting ? "Deleting User..." : "Loading User..."}
        </Text>
      </View>
    );
  }

  const SegmentedControl = ({
    options,
    value,
    onValueChange,
  }: {
    options: string[];
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <View style={styles.segmentedControl}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.segment, value === option && styles.segmentActive]}
          onPress={() => onValueChange(option)}
        >
          <Text
            style={[styles.segmentText, value === option && styles.segmentTextActive]}
          >
            {option.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

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
              { position: "absolute", left: 0, right: 0, textAlign: "center" },
            ]}
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
          contentContainerStyle={[styles.form, width >= 700 && { width: 700, alignSelf: "center" }]}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter full name..."
              value={formData.name}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email..."
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Role</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter role (ex: Doctor)"
              value={formData.role}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, role: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Institution</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter institution"
              value={formData.institution}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, institution: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>User Type</Text>
            <SegmentedControl
              options={["user", "admin"]}
              value={formData.user_type}
              onValueChange={(val) =>
                setFormData((prev) => ({ ...prev, user_type: val as "user" | "admin" }))
              }
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && { backgroundColor: "#9CA3AF" }]}
            onPress={handleSave}
            disabled={saving}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Save size={16} color="#2563EB" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: "#f38181ff" }]}
            onPress={deleteUser}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Trash size={16} color="#891111ff" style={{ marginRight: 8 }} />
              <Text style={[styles.saveButtonText, { color: "#891111ff" }]}>Delete</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#1F2937" },
  form: { padding: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  segment: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 8 },
  segmentActive: { backgroundColor: "#6a90db" },
  segmentText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  segmentTextActive: { color: "#FFFFFF" },
  saveButton: {
    backgroundColor: "#c9def9ff",
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: { color: "#2563EB", fontSize: 16, fontWeight: "600" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
});
