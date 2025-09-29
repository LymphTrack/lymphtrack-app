import { useState, useEffect } from "react";
import { Switch, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, useWindowDimensions} from "react-native";
import { ArrowLeft, Trash, Save } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, Platform } from "react-native";
import { API_URL } from "@/constants/api";
import { mapDbToGender, mapDbToSide, validatePatientData, mapGenderToDb, mapSideToDb } from "@/utils/patientUtils";

export default function ModifyPatientScreen() {
  const { patient_id } = useLocalSearchParams<{ patient_id : string }>();
 
  const router = useRouter();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Unknown">("Male");
  const [bmi, setBmi] = useState("");
  const [lymphedemaSide, setLymphedemaSide] = useState<"Right" | "Left" | "Both" | "Unknown">("Right");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {width} = useWindowDimensions();
  const [isFocused, setIsFocused] = useState(false);
  const [skipAge, setSkipAge] = useState(false);
  const [skipBmi, setSkipBmi] = useState(false);


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
      setSkipAge(data.age === null);

      setBmi(data.bmi?.toString() || "");
      setSkipBmi(data.bmi === null);

      setGender(mapDbToGender(data.gender));
      setLymphedemaSide(mapDbToSide(data.lymphedema_side));
      setNotes(data.notes || "");
    } catch (error) {
      console.error("Error loading patient:", error);
      if (Platform.OS === "web") {
        window.alert("Error\n\nFailed to load patient data");
      } else {
        Alert.alert("Error", "Failed to load patient data");
      }
    } finally {
      setLoading(false);
    }
  };

  const deletePatient = async () => {
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        "Confirm deletion\n\nAre you sure you want to delete this patient?"
      );
      if (confirm) {
        setDeleting(true);
        try {
          const res = await fetch(`${API_URL}/patients/${patient_id}`, {
            method: "DELETE",
          });

          if (!res.ok) {
            const errorData = await res.json();
            window.alert(`Error\n\n${errorData.detail || "Failed to delete patient"}`);
            return;
          }

          window.alert("Success\n\nPatient deleted successfully!");
          router.replace("/patients");
        } catch (err) {
          console.error("Error deleting patient:", err);
          window.alert("Error\n\nUnexpected error occurred");
        } finally {
          setDeleting(false);
        }
      }
    } else {
      Alert.alert(
        "Confirm deletion",
        "Are you sure you want to delete this patient?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setDeleting(true);
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
                setDeleting(false);
              }
            },
          },
        ]
      );
    }
  };


  const handleSave = async () => {
    const { valid, error, age: ageValue, bmi: bmiValue } = validatePatientData(
      skipAge ? null : age,
      skipBmi ? null : bmi
    );

    if (!valid) {
      if (Platform.OS === "web") {
        window.alert(`Error\n\n${error || "Invalid data"}`);
      } else {
        Alert.alert("Error", error || "Invalid data");
      }
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/patients/${patient_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: skipAge ? null : ageValue,
          gender: mapGenderToDb(gender),
          bmi: skipBmi ? null : bmiValue,
          lymphedema_side: mapSideToDb(lymphedemaSide),
          notes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (Platform.OS === "web") {
          window.alert(`Error\n\n${errorData.detail || "Failed to update patient"}`);
        } else {
          Alert.alert("Error", errorData.detail || "Failed to update patient");
        }
        return;
      }

      if (Platform.OS === "web") {
        window.alert("Success\n\nPatient updated successfully!");
      } else {
        Alert.alert("Success", "Patient updated successfully!");
      }
      router.push(`../${patient_id}`);
    } catch (err) {
      console.error("Error:", err);
      if (Platform.OS === "web") {
        window.alert("Error\n\nUnexpected error occurred");
      } else {
        Alert.alert("Error", "Unexpected error occurred");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        "Unsaved Changes\n\nIf you leave now, your modifications will not be saved. Do you want to continue?"
      );
      if (confirm) {
        router.push(`../${patient_id}`);
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
              router.push(`../${patient_id}`);
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
      </View>
    );
  }

  if (deleting) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937", textAlign: "center", paddingHorizontal: 30 }}>
          Deleting Patient ...
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
          Modify Patient: {patient_id}</Text>
        </View>
      </View>
      <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >

      <ScrollView contentContainerStyle={[styles.form, width >= 700 && {width : 700, alignSelf:"center"}]}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age (optional)</Text>
          <TextInput
            style={[
              styles.input,
              { 
                borderColor: isFocused ? "#D1D5DB" : "#D1D5DB",
                ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
              },
            ]}
            placeholder="Enter age"
            placeholderTextColor={"#9CA3AF"}
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <Text style={{ marginRight: 8, color: "#374151" }}>Do not provide age</Text>
              <Switch
                value={skipAge}
                onValueChange={(val) => {
                  setSkipAge(val);
                  if (val) setAge("");
                }}
                {...(Platform.OS === "web"
                  ? ({
                      activeThumbColor: "#2563EB",
                      activeTrackColor: "#93C5FD",
                      thumbColor: "#f4f3f4",
                      trackColor: "#D1D5DB",
                    } as any)
                  : {
                      trackColor: { false: "#D1D5DB", true: "#93C5FD" },
                      thumbColor: skipAge ? "#2563EB" : "#f4f3f4",
                      ios_backgroundColor: "#D1D5DB",
                    })}
              />
            </View>          
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <SegmentedControl
            options={["Male", "Female", "Unknown"]}
            value={gender}
            onValueChange={(val) => setGender(val as "Male" | "Female" | "Unknown")}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>BMI (optional)</Text>
          <TextInput
            style={[
              styles.input,
              { 
                borderColor: isFocused ? "#D1D5DB" : "#D1D5DB",
                ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
              },
            ]}
            placeholder="Enter BMI"
            placeholderTextColor={"#9CA3AF"}
            keyboardType="decimal-pad"
            value={bmi}
            onChangeText={setBmi}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
           <View style={{ flexDirection: "row", alignItems: "center", marginTop : 8}}>
              <Text style={{ marginRight: 8, color: "#374151" }}>Do not provide BMI</Text>

              <Switch
                value={skipBmi}
                onValueChange={(val) => {
                  setSkipBmi(val);
                  if (val) setBmi("");
                }}
                {...(Platform.OS === "web"
                  ? ({
                      activeThumbColor: "#2563EB",
                      activeTrackColor: "#93C5FD",
                      thumbColor: "#f4f3f4",
                      trackColor: "#D1D5DB",
                    } as any)
                  : {
                      trackColor: { false: "#D1D5DB", true: "#93C5FD" },
                      thumbColor: skipBmi ? "#2563EB" : "#f4f3f4",
                      ios_backgroundColor: "#D1D5DB",
                    })}
              /> 
            </View>       
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lymphedema Side</Text>
          <SegmentedControl
            options={["Right", "Left", "Both" , "Unknown"]}
            value={lymphedemaSide}
            onValueChange={(val) => setLymphedemaSide(val as "Right" | "Left" | "Both" | "Unknown")}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[
              styles.input,
              { 
                height : 100,
                textAlignVertical : "top",
                borderColor: isFocused ? "#D1D5DB" : "#D1D5DB",
                ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
              },
            ]}
            placeholder="Enter notes..."
            placeholderTextColor={"#9CA3AF"}
            multiline
            value={notes}
            onChangeText={setNotes}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && { backgroundColor: "#9CA3AF" }]}
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
          onPress={deletePatient}
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
    paddingTop : Platform.OS === 'web' ? 20 : 60,
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
