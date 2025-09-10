import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator} from "react-native";
import { ArrowLeft, Trash, Save } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, Platform } from "react-native";
import { API_URL } from "@/constants/api";

export default function ModifyPatientScreen() {
  const { patient_id } = useLocalSearchParams<{ patient_id : string }>();
 
  const router = useRouter();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [bmi, setBmi] = useState("");
  const [lymphedemaSide, setLymphedemaSide] = useState<"Right" | "Left" | "Both">("Right");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patient_id) {
      loadPatient();
    }
  }, [patient_id]);

  const loadPatient = async () => {
    try {
      const res = await fetch(`${API_URL}/patients/${patient_id}`);
      if (!res.ok) throw new Error("Failed to load patient data");

      const data = await res.json();

      setAge(data.age?.toString() || "");
      setGender(data.gender === 1 ? "Female" : "Male");
      setBmi(data.bmi?.toString() || "");
      setLymphedemaSide(
        data.lymphedema_side === 1
          ? "Right"
          : data.lymphedema_side === 2
          ? "Left"
          : "Both"
      );
      setNotes(data.notes || "");
    } catch (error) {
      console.error("Error loading patient:", error);
      Alert.alert("Error", "Failed to load patient data");
    } finally {
      setLoading(false);
    }
  };

  const deletePatient = async () => {
    Alert.alert(
      "Confirm deletion",
      "Are you sure you want to delete this patient?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const res = await fetch(`${API_URL}/patients/${patient_id}`, {
                method: "DELETE",
              });

              if (!res.ok) {
                const errorData = await res.json();
                Alert.alert("Error", errorData.detail || "Failed to delete patient");
                return;
              }

              Alert.alert("Success", "Patient deleted successfully!");
              router.replace("/patients");
            } catch (err) {
              console.error("Error deleting patient:", err);
              Alert.alert("Error", "Unexpected error occurred");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const mapGenderToDb = (gender: "Male" | "Female") => {
    return gender === "Female" ? 1 : 2;
  };

  const mapSideToDb = (side: "Right" | "Left" | "Both") => {
    return side === "Right" ? 1 : side === "Left" ? 2 : 3;
  };

  const handleSave = async () => {
    if (!age || !gender || !bmi || !lymphedemaSide) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const ageValue = parseInt(age, 10);
    const bmiValue = parseFloat(bmi.replace(",", "."));

    if (isNaN(ageValue) || ageValue < 10 || ageValue > 100) {
      Alert.alert("Error", "Incorrect age");
      return;
    }

    if (isNaN(bmiValue) || bmiValue < 10 || bmiValue > 60) {
      Alert.alert("Error", "Incorrect BMI");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/patients/${patient_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: ageValue,
          gender: mapGenderToDb(gender),
          bmi: bmiValue,
          lymphedema_side: mapSideToDb(lymphedemaSide),
          notes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        Alert.alert("Error", errorData.detail || "Failed to update patient");
        return;
      }

      Alert.alert("Success", "Patient updated successfully!");
      router.back();
    } catch (err) {
      console.error("Error:", err);
      Alert.alert("Error", "Unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6a90db" style={{ marginTop: 50 }} />
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
    onValueChange: (value: string) => void;
  }) => (
    <View style={styles.segmentedControl}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.segment,
            value === option && styles.segmentActive,
          ]}
          onPress={() => onValueChange(option)}
        >
          <Text
            style={[
              styles.segmentText,
              value === option && styles.segmentTextActive,
            ]}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modify Patient {patient_id}</Text>
        <View style={{ width: 24 }} />
      </View>
      <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >

      {/* Form */}
      <ScrollView contentContainerStyle={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter age"
            placeholderTextColor={"#9CA3AF"}
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <SegmentedControl
            options={["Male", "Female"]}
            value={gender}
            onValueChange={(val) => setGender(val as "Male" | "Female")}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>BMI</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter BMI"
            placeholderTextColor={"#9CA3AF"}
            keyboardType="decimal-pad"
            value={bmi}
            onChangeText={setBmi}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lymphedema Side</Text>
          <SegmentedControl
            options={["Right", "Left", "Both"]}
            value={lymphedemaSide}
            onValueChange={(val) => setLymphedemaSide(val as "Right" | "Left" | "Both")}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            placeholder="Enter notes..."
            placeholderTextColor={"#9CA3AF"}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && { backgroundColor: "#9CA3AF" }]}
          onPress={handleSave}
          disabled={loading}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Save size={16} color="#2563EB" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>
                {loading ? "Saving..." : "Save Changes"}
              </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: "#f38181ff" }]}
          onPress={deletePatient}
          disabled={loading}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Trash size={16} color="#891111ff" style={{ marginRight: 8 }} />
            <Text style={[styles.saveButtonText, { color: "#891111ff" }]}>
              Delete Patient
            </Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#1F2937" },
  form: { padding: 24 },
  inputGroup: { marginBottom: 20 },
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
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: "#6a90db",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  segmentTextActive: {
    color: "#FFFFFF",
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
