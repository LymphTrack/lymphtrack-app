import React, { useState, useEffect } from "react";
import { Platform , useWindowDimensions, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter} from "expo-router";
import { supabase } from "@/lib/supabase";
import {API_URL} from "@/constants/api"

export default function ModifyAccountScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [institution, setInstitution] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const {width} = useWindowDimensions();

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
        if (Platform.OS === 'web') {
          window.alert("Error\n\nFailed to load user profile");
        }else {
          Alert.alert("Error", "Failed to load user profile");
        } 
        return;
      }

      const profile = await res.json();

      setName(profile.name || "");
      setEmail(profile.email || user.email || "");
      setRole(profile.role || "");
      setInstitution(profile.institution || "");

    } catch (error) {
      console.error("Error loading profile:", error);
      if (Platform.OS === 'web') {
        window.alert("Error\n\nUnexpected error occurred while loading profil");
      }else {
        Alert.alert("Error", "Unexpected error occurred while loading profile");
      } 
      
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (email && email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) {
          if (Platform.OS === "web") {
            window.alert(`Error\n\n${authError.message}`);
          } else {
            Alert.alert("Error", authError.message);
          }
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
        if (Platform.OS === "web") {
          window.alert(`Error\n\n${errorData.detail || "Failed to update user"}`);
        } else {
          Alert.alert("Error", errorData.detail || "Failed to update user");
        }
        return;
      }

      if (Platform.OS === "web") {
        window.alert("Success\n\nAccount updated successfully!");
      } else {
        Alert.alert("Success", "Account updated successfully!");
      }
      router.back();

    } catch (err) {
      console.error(err);
      if (Platform.OS === "web") {
        window.alert("Error\n\nUnexpected error occurred");
      } else {
        Alert.alert("Error", "Unexpected error occurred");
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937", textAlign: "center", paddingHorizontal: 30 }}>
        </Text>
      </View>
    );
  }

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
          Modify Account
        </Text>
      </View>
      </View>
      
      <ScrollView contentContainerStyle={[styles.form , width >= 700 && {width : 700 , alignSelf : "center"}]}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Role</Text>
          <TextInput
            style={styles.input}
            placeholder="Doctor, Researcher, Student..."
            value={role}
            onChangeText={setRole}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Institution</Text>
          <TextInput
            style={styles.input}
            placeholder="University / Hospital"
            value={institution}
            onChangeText={setInstitution}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && { backgroundColor: "#9CA3AF" }]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    alignItems: "center",
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
