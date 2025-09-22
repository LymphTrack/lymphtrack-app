import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft,User, Weight} from 'lucide-react-native';
import { KeyboardAvoidingView, Platform } from "react-native";
import { API_URL } from '@/constants/api';
import { mapGenderToDb, mapSideToDb, validatePatientData } from "@/utils/patientUtils";

export default function CreatePatientScreen() {
  const [formData, setFormData] = useState({
    age: '',
    gender: 'Male' as 'Male' | 'Female',
    lymphedema_side: 'Right' as 'Right' | 'Left' | 'Both',
    bmi : '',
    notes :'',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const {width} = useWindowDimensions();

  const [noteHeight, setNoteHeight] = useState(100);

  <TextInput
    style={[styles.input, { height: noteHeight, textAlignVertical: "top" }]}
    multiline
    onContentSizeChange={(e) =>
      setNoteHeight(Math.max(100, e.nativeEvent.contentSize.height))
    }
  />

  const handleSubmit = async () => {
    const { valid, error, age, bmi } = validatePatientData(formData.age, formData.bmi);

    if (!valid) {
      if (Platform.OS === "web") {
        window.alert(`Error\n\n${error || "Invalid data"}`);
      } else {
        Alert.alert("Error", error || "Invalid data");
      }
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/patients/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: age,
          gender: mapGenderToDb(formData.gender),
          bmi: bmi,
          lymphedema_side: mapSideToDb(formData.lymphedema_side),
          notes: formData.notes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (Platform.OS === "web") {
          window.alert(`Error\n\n${errorData.detail || "Failed to create patient record"}`);
        } else {
          Alert.alert("Error", errorData.detail || "Failed to create patient record");
        }
        return;
      }

      const createdPatient = await res.json();

      if (Platform.OS === "web") {
        window.alert("Success\n\nPatient created successfully");
        router.replace(`/patient/${createdPatient.patient_id}`);
      } else {
        Alert.alert("Success", "Patient created successfully", [
          { text: "OK", onPress: () => router.replace(`/patient/${createdPatient.patient_id}`) },
        ]);
      }
    } catch (error) {
      console.error("Error creating patient:", error);
      if (Platform.OS === "web") {
        window.alert("Error\n\nAn unexpected error occurred");
      } else {
        Alert.alert("Error", "An unexpected error occurred");
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
          <Text style={styles.sectionTitle}>Patient Demographics</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <View style={styles.inputContainer}>
              <User size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter age"
                placeholderTextColor={"#9CA3AF"}
                value={formData.age}
                onChangeText={(text) => setFormData(prev => ({ ...prev, age: text }))}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <SegmentedControl
              options={['Male', 'Female']}
              value={formData.gender}
              onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value as 'Male' | 'Female' }))}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Measurements</Text>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Bmi</Text>
              <View style={styles.inputContainer}>
                <Weight size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor={"#9CA3AF"}
                  value={formData.bmi}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, bmi: text }))}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lymphedema Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Side</Text>
            <SegmentedControl
              options={['Right', 'Left', 'Both']}
              value={formData.lymphedema_side}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                lymphedema_side: value as 'Left' | 'Right' | 'Both'
              }))}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    minHeight: 100,       
                    textAlignVertical: "top",
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