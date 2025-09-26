import { useState } from "react";
import {View,Text,TextInput,TouchableOpacity,StyleSheet,ScrollView,Alert,ActivityIndicator, useWindowDimensions,} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, User, Briefcase, Building, Lock, Eye, EyeOff } from "lucide-react-native";
import { KeyboardAvoidingView, Platform } from "react-native";
import { API_URL } from "@/constants/api";

export default function CreateUserScreen() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    institution: "",
    user_type: "user" as "user" | "admin",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const {width} = useWindowDimensions();
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      if (Platform.OS === "web") {
        window.alert("Error\n\nName, Email and Password are required");
      } else {
        Alert.alert("Error", "Name, Email and Password are required");
      }
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (Platform.OS === "web") {
          window.alert(`Error\n\n${errorData.detail || "Failed to create user"}`);
        } else {
          Alert.alert("Error", errorData.detail || "Failed to create user");
        }
        return;
      }

      const createdUser = await res.json();

      if (Platform.OS === "web") {
        window.alert("Success\n\nUser created successfully");
        router.replace("../admin");
      } else {
        Alert.alert("Success", "User created successfully", [
          {
            text: "OK",
            onPress: () => router.replace("../admin"),
          },
        ]);
      }
    } catch (error) {
      console.error("Error creating user:", error);
      if (Platform.OS === "web") {
        window.alert("Error\n\nAn unexpected error occurred");
      } else {
        Alert.alert("Error", "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937" }}>
          Creating User...
        </Text>
      </View>
    );
  }

  const handleBack = () => {
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        "Unsaved Changes\n\nIf you leave now, your modifications will not be saved. Do you want to continue?"
      );
      if (confirm) {
        router.push("../admin");
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
              router.push("../admin");
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
          New User
        </Text>
      </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={[styles.form,width >=700 && {width : 700, alignSelf: "center"}]} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email <Text style={{ color: "red" }}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <User size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: isFocused ? "red" : "#D1D5DB",
                    ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
                  },
                ]}
                placeholder="Enter email ..."
                placeholderTextColor={"#9CA3AF"}
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, email: text }))
                }
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Password <Text style={{ color: "red" }}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Lock size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: isFocused ? "red" : "#D1D5DB",
                    ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
                  },
                ]}
                placeholder="Enter password ..."
                placeholderTextColor={"#9CA3AF"}
                value={formData.password}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, password: text }))
                }
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name (optional)</Text>
            <View style={styles.inputContainer}>
              <User size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: isFocused ? "red" : "#D1D5DB",
                    ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
                  },
                ]}
                placeholder="Enter full name ..."
                placeholderTextColor={"#9CA3AF"}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, name: text }))                 
                }
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}                 
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Role (optional)</Text>
            <View style={styles.inputContainer}>
              <Briefcase size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: isFocused ? "red" : "#D1D5DB",
                    ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
                  },
                ]}
                placeholder="Enter role (ex: Doctor) ..."
                placeholderTextColor={"#9CA3AF"}
                value={formData.role}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, role: text }))
                }
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}                
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Institution (optional)</Text>
            <View style={styles.inputContainer}>
              <Building size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: isFocused ? "red" : "#D1D5DB",
                    ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
                  },
                ]}
                placeholder="Enter institution"
                placeholderTextColor={"#9CA3AF"}
                value={formData.institution}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, institution: text }))
                }
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)} 
              />
            </View>
          </View>

          <View style={styles.segmentedControl}>
            {["user", "admin"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.segment,
                  formData.user_type === type && styles.segmentActive,
                ]}
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    user_type: type as "user" | "admin",
                  }))
                }
              >
                <Text
                  style={[
                    styles.segmentText,
                    formData.user_type === type && styles.segmentTextActive,
                  ]}
                >
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Create User</Text>
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
    paddingTop : Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  form: { flex: 1, paddingHorizontal: 20, marginTop: 20, },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginLeft : 5,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentActive: { backgroundColor: "#6a90db" },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  segmentTextActive: { color: "#FFFFFF" },
  submitButton: {
    backgroundColor: "#c9def9ff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonDisabled: { backgroundColor: "#9CA3AF" },
  submitButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
  },
});
