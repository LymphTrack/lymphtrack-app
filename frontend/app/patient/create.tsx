import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft,User, Weight} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { KeyboardAvoidingView, Platform } from "react-native";
import { API_URL } from '@/constants/api';


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

  const generatePatientId = async (): Promise<string> => {
    const prefix = "MV";

    const { data, error } = await supabase
      .from("sick_patients")
      .select("patient_id")
      .order("patient_id", { ascending: false }) 
      .limit(1);

    if (error) {
      console.error("Erreur récupération patient_id:", error.message);
      return `${prefix}001`; 
    }

    if (!data || data.length === 0) {
      return `${prefix}001`; 
    }

    const lastId = data[0].patient_id;
    const lastNumber = parseInt(lastId.slice(2), 10);

    const nextNumber = (lastNumber + 1).toString().padStart(3, "0");

    return `${prefix}${nextNumber}`; 
  };

  const mapGenderToDb = (gender : 'Male' | 'Female') => {
    return gender === 'Female' ? 1 : 2;
  };

  const mapSideToDb = (lymphedema_side : 'Right' | 'Left' | 'Both') => {
    return lymphedema_side === 'Right' ? 1 : lymphedema_side === 'Left' ? 2 : 3;
  };

  const [noteHeight, setNoteHeight] = useState(100);

  <TextInput
    style={[styles.input, { height: noteHeight, textAlignVertical: "top" }]}
    multiline
    onContentSizeChange={(e) =>
      setNoteHeight(Math.max(100, e.nativeEvent.contentSize.height))
    }
  />

  const handleSubmit = async () => {
    if (!formData.age || !formData.bmi || !formData.gender || !formData.lymphedema_side) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const age = parseInt(formData.age);
    const bmi = parseInt(formData.bmi);

    if (age <= 10 || age > 100 || bmi <= 10 || bmi > 60) {
      Alert.alert('Error', 'Please enter valid values');
      return;
    }

    try {
      setLoading(true);
      const patientId = await generatePatientId();
      const bmiValue = parseFloat(formData.bmi.toString().replace(",", "."));

      const res = await fetch(`${API_URL}/patients/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          age: age,
          gender: mapGenderToDb(formData.gender),
          bmi: bmiValue,
          lymphedema_side: mapSideToDb(formData.lymphedema_side),
          notes: formData.notes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        Alert.alert("Error", errorData.detail || "Failed to create patient record");
        return;
      }

      Alert.alert("Success", "Patient created successfully", [
        { text: "OK", onPress: () => router.replace(`/patient/${patientId}`) }
      ]);

      setLoading(false);
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error(error);
    } finally {
      
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
        <TouchableOpacity onPress={() => router.push('../(tabs)/patients')}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Patient</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
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