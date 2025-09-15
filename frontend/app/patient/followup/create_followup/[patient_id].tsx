import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator
} from "react-native";
import { ArrowLeft, Calendar, ClipboardList, Save, FileUp } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { API_URL } from "@/constants/api";

export default function CreateFollowUp() {
  const { patient_id } = useLocalSearchParams<{ patient_id: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    notes: "",
    noteHeight: 100, 
  });

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Follow-up name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/operations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patient_id,
          name: name,
          operation_date: date.toISOString().split("T")[0],
          notes: formData.notes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        Alert.alert("Error", errorData.detail || "Unable to save follow-up");
        return;
      }

      const data = await res.json();

      Alert.alert("Success", "Follow-up saved successfully", [
        {
          text: "OK",
          onPress: () =>
            router.push(
              `/patient/followup/${data.id_operation}`
            ),
        },
      ]);
      setLoading(false);
    } catch (err) {
      console.error("Error:", err);
      Alert.alert("Error", "An error occurred while saving");
    }
  };

  const handleBack = () => {
    Alert.alert(
      'Unsaved Changes',
      'If you leave now, your modifications will not be saved. Do you want to continue?',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            router.push(`../../${patient_id}`);
          },
        },
      ]
    );
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
        <TouchableOpacity onPress={handleBack}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Follow-Up</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.label}>Follow-up Name</Text>
          <View style={styles.inputRow}>
            <ClipboardList size={18} color="#6a90db" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="Ex: PreOp , 1 month ..."
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.inputRow}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={18} color="#6a90db" style={{ marginRight: 8 }} />
            <Text style={styles.dateText}>
              {date.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Notes (Optionnal)</Text>

          <View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    minHeight: formData.noteHeight, 
                    textAlignVertical: "top",
                    padding: 10,
                  },
                ]}
                multiline
                placeholder="Enter notes..."
                placeholderTextColor="#9CA3AF"
                value={formData.notes}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, notes: text }))
                }
                onContentSizeChange={({ nativeEvent }) => {
                  const height = nativeEvent?.contentSize?.height || 100;
                  setFormData((prev) => ({ ...prev, noteHeight: height }));
                }}
              />
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Next</Text>
        </TouchableOpacity>
      </ScrollView>
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 16, color: "#1F2937" },
  dateText: { fontSize: 16, color: "#1F2937" },

  headerTitle: { fontSize: 20, fontWeight: "600", color: "#1F2937" },
  scrollContent: { padding: 20, paddingBottom: 60 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  label: { 
    fontSize: 16, 
    fontWeight: "500", 
    color: "#374151", 
    marginBottom: 8 },
  valueBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6a90db",
    marginBottom: 12,
    alignSelf: "center",
  },
  positionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 10,
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#6a90db",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
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
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  importText: {
    marginLeft: 8,
    fontSize: 15,
    color: "#1F2937",
  },

});
