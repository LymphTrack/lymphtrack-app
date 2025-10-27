import { useState } from "react";
import {View,Text,TextInput,TouchableOpacity,StyleSheet,ScrollView,Alert, useWindowDimensions,} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, User, Briefcase, Building, Lock} from "lucide-react-native";
import { KeyboardAvoidingView, Platform } from "react-native";
import { API_URL } from "@/constants/api";
import { LoadingScreen } from "@/components/loadingScreen";
import { SegmentedControl } from "@/components/segmentedControl";
import { showAlert, confirmAction } from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { InputField } from "@/components/inputField"; 

export default function CreateUserScreen() {
  const router = useRouter();
  const {width} = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    institution: "",
    user_type: "user" as "user" | "admin",
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      showAlert("Error", "Name, Email and Password are required");
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
        showAlert("Error", errorData.detail || "Failed to create user");
        return;
      }

      showAlert("Success", "User created successfully");
      router.replace("../admin");

    } catch (error) {
      console.error("Error creating user:", error);
      showAlert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
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
      router.push("../admin");
    }
  };

  if (loading) return <LoadingScreen text="Creating user..." />;

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
            New User
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.form , width >= 600 && {width : 600 , alignSelf : "center"}]}>
          <InputField
            label="Email"
            required
            icon={<User size={18} color={COLORS.text} style={styles.inputIcon} />}
            placeholder="Enter email ..."
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
          />

          <InputField
            label="Password"
            required
            icon={<Lock size={18} color={COLORS.text} style={styles.inputIcon} />}
            placeholder="Enter password ..."
            secureTextEntry
            value={formData.password}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, password: text }))}
          />

          <InputField
            label="Name"
            optional
            icon={<User size={18} color={COLORS.text} style={styles.inputIcon} />}
            placeholder="Enter full name ..."
            value={formData.name}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
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
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, institution: text }))
            }
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
            onPress={handleSubmit}
          >
            <Text style={commonStyles.buttonText}>Create User</Text>
          </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { 
    padding:24,
  },
  inputIcon: { 
    marginLeft: 4 ,
    marginBottom : -2,
  },
});
