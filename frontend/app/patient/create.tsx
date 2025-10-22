import { useState } from 'react';
import { Switch, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft,User, Weight} from 'lucide-react-native';
import { KeyboardAvoidingView, Platform } from "react-native";
import { API_URL } from '@/constants/api';
import { mapGenderToDb, mapSideToDb, validatePatientData } from "@/utils/patientUtils";

export default function CreatePatientScreen() {
  const [formData, setFormData] = useState({
    patient_id: '',
    skipId: false,
    age: '',
    skipAge: false,
    bmi: '',
    skipBmi: false,
    gender: 'Male' as 'Male' | 'Female' | 'Unknown',
    lymphedema_side: 'Right' as 'Right' | 'Left' | 'Both' | 'Unknown',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const {width} = useWindowDimensions();
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    const { valid, error, age, bmi } = validatePatientData(
      formData.skipAge ? null : formData.age,
      formData.skipBmi ? null : formData.bmi,
      formData.skipId ? null : formData.patient_id,
    );

    if (!valid) {
      if (Platform.OS === "web") {
        window.alert(`Error\n\n${error || "Invalid data"}`);
      } else {
        Alert.alert("Error", error || "Invalid data");
      }
      return;
    }

    if (!formData.skipId && formData.patient_id) {
      if (!formData.patient_id.startsWith("MV")) {
        if (Platform.OS === "web") {
          window.alert("Error\n\nPatient ID must start with 'MV'");
        } else {
          Alert.alert("Error", "Patient ID must start with 'MV'");
        }
        return;
      }
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/patients/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: formData.skipId ? null : formData.patient_id?.trim().toUpperCase(),
          gender: mapGenderToDb(formData.gender),
          age: formData.skipAge ? null : age,
          bmi: formData.skipBmi ? null : bmi,
          lymphedema_side: mapSideToDb(formData.lymphedema_side),
          notes: formData.notes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const msg = errorData.detail || "Failed to create patient record";
        if (Platform.OS === "web") {
          window.alert(`Error\n\n${msg}`);
        } else {
          Alert.alert("Error", msg);
        }
        return;
      }

      const createdPatient = await res.json();

      if (Platform.OS === "web") {
        router.replace(`/patient/${createdPatient.patient_id}`);
      } else {
        router.replace(`/patient/${createdPatient.patient_id}`);
      }

    } catch (error) {
      console.error("Error creating patient:", error);
      const msg = "An unexpected error occurred";
      if (Platform.OS === "web") {
        window.alert(`Error\n\n${msg}`);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setLoading(false);
    }
  };


  const SegmentedControl = ({ 
    options, 
    value, 
    onValueChange 
  }: { 
    options: string[], 
    value: string, 
    onValueChange: (value: string) => void 
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

  const handleBack = () => {
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        "Unsaved Changes\n\nIf you leave now, your modifications will not be saved. Do you want to continue?"
      );
      if (confirm) {
        router.push("../(tabs)/patients");
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
              router.push("../(tabs)/patients");
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
          Creating Patient ...
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
          New Patient</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >

      <ScrollView style={[styles.form, width>=700 && {width : 700, alignSelf : "center"}]} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient ID</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Custom Patient ID (optional)</Text>

            {!formData.skipId && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: "#D1D5DB",
                      ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
                    },
                  ]}
                  placeholder="Enter patient ID (e.g. MV123)"
                  placeholderTextColor="#9CA3AF"
                  value={formData.patient_id}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, patient_id: text.trim().toUpperCase() }))
                  }
                  autoCapitalize="characters"
                />
              </View>
            )}

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <Text style={{ marginRight: 8, color: "#374151" }}>Do not provide ID</Text>
              <Switch
                value={formData.skipId}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    skipId: val,
                    patient_id: val ? "" : prev.patient_id,
                  }))
                }
                {...(Platform.OS === "web"
                  ? ({
                      activeThumbColor: "#2563EB",
                      activeTrackColor: "#93C5FD",
                      thumbColor: "#f4f3f4",
                      trackColor: "#D1D5DB",
                    } as any)
                  : {
                      trackColor: { false: "#D1D5DB", true: "#93C5FD" },
                      thumbColor: formData.skipId ? "#2563EB" : "#f4f3f4",
                      ios_backgroundColor: "#D1D5DB",
                    })}
              />
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Demographics</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age (optional)</Text>

            {!formData.skipAge && (
              <View style={styles.inputContainer}>
                <User size={20} color="#6B7280" style={styles.inputIcon} />
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
                  value={formData.age}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, age: text }))}
                  keyboardType="numeric"
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <Text style={{ marginRight: 8, color: "#374151" }}>Do not provide age</Text>

              <Switch
                value={formData.skipAge}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, skipAge: val, age: val ? "" : prev.age }))
                }
                {...(Platform.OS === "web"
                  ? ({
                      activeThumbColor: "#2563EB",
                      activeTrackColor: "#93C5FD",
                      thumbColor: "#f4f3f4",
                      trackColor: "#D1D5DB",
                    } as any)
                  : {
                      trackColor: { false: "#D1D5DB", true: "#93C5FD" },
                      thumbColor: formData.skipAge ? "#2563EB" : "#f4f3f4",
                      ios_backgroundColor: "#D1D5DB",
                    })}
              />
            </View>
          </View>


          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <SegmentedControl
              options={['Male', 'Female', 'Unknown']}
              value={formData.gender}
              onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value as 'Male' | 'Female' | 'Unknown' }))}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Measurements</Text>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>BMI (optional)</Text>

              {!formData.skipBmi && (
                <View style={styles.inputContainer}>
                  <Weight size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: isFocused ? "red" : "#D1D5DB",
                        ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
                      },
                    ]}
                    placeholder="0.0"
                    placeholderTextColor={"#9CA3AF"}
                    value={formData.bmi}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, bmi: text }))}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center",}}>
              <Text style={{ marginRight: 8, color: "#374151" }}>Do not provide BMI</Text>

              <Switch
                value={formData.skipBmi}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, skipBmi: val, age: val ? "" : prev.age }))
                }
                {...(Platform.OS === "web"
                  ? ({
                      activeThumbColor: "#2563EB",
                      activeTrackColor: "#93C5FD",
                      thumbColor: "#f4f3f4",
                      trackColor: "#D1D5DB",
                    } as any)
                  : {
                      trackColor: { false: "#D1D5DB", true: "#93C5FD" },
                      thumbColor: formData.skipBmi ? "#2563EB" : "#f4f3f4",
                      ios_backgroundColor: "#D1D5DB",
                    })}
              />
            </View>

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lymphedema Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Side</Text>
            <SegmentedControl
              options={['Right', 'Left', 'Both', 'Unknown']}
              value={formData.lymphedema_side}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                lymphedema_side: value as 'Left' | 'Right' | 'Both' | 'Unknown'
              }))}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (optional)</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    minHeight: 100,       
                    textAlignVertical: "top",
                    borderColor: isFocused ? "red" : "#D1D5DB",
                    ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
                    
                  },
                ]}
                multiline={true}         
                placeholder="Enter notes..."
                placeholderTextColor={"#9CA3AF"}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                onContentSizeChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    noteHeight: e.nativeEvent.contentSize.height,
                  }))
                }
              />
            </View>
          </View>

        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Create Patient</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop : Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#6a90db',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  bmiDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  bmiLabel: {
    fontSize: 16,
    color: '#6a90db',
    fontWeight: '500',
  },
  bmiValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6a90db',
  },
  submitButton: {
    backgroundColor: '#c9def9ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
});