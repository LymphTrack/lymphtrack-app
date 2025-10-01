import { useState, useEffect } from "react";
import {Platform, View,Text,TextInput,TouchableOpacity,StyleSheet,Alert,ScrollView,ActivityIndicator, useWindowDimensions} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter, useLocalSearchParams,  } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { API_URL } from "@/constants/api";
import { validateFollowUpDate } from "@/utils/dateUtils";

export default function ModifyFollowUpScreen() {
  const { id_operation } = useLocalSearchParams<{ id_operation: string }>();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const {width} = useWindowDimensions();
  const [isFocused, setIsFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (id_operation) loadFollowUp();
  }, [id_operation]);

  const loadFollowUp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/operations/${id_operation}`);
      if (!res.ok) throw new Error("Failed to fetch follow-up");

      const data = await res.json();

      setName(data?.name || "");
      setDate(data?.operation_date ? new Date(data.operation_date) : new Date());
      setNotes(data?.notes || "");
    } catch (err) {
      console.error("Error loading follow-up:", err);
      if (Platform.OS === "web") {
        window.alert("Error\n\nUnable to load follow-up data");
      } else {
        Alert.alert("Error", "Unable to load follow-up data");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const { valid, message } = validateFollowUpDate(date);
    if (!valid) {
      if (Platform.OS === "web") {
        window.alert(`Error\n\n${message}`);
      } else {
        Alert.alert("Error", message);
      }
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_URL}/operations/${id_operation}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          operation_date: date.toISOString().split("T")[0],
          notes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (Platform.OS === "web") {
          window.alert(`Error\n\n${errorData.detail || "Unable to update follow-up"}`);
        } else {
          Alert.alert("Error", errorData.detail || "Unable to update follow-up");
        }
        return;
      }

      if (Platform.OS === "web") {
        window.alert("Success\n\nFollow-up updated successfully!");
      } else {
        Alert.alert("Success", "Follow-up updated successfully!");
      }

      router.push(`/patient/followup/${id_operation}`);
    } catch (err) {
      console.error("Error updating follow-up:", err);
      if (Platform.OS === "web") {
        window.alert("Error\n\nUnable to update follow-up");
      } else {
        Alert.alert("Error", "Unable to update follow-up");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
      </View>
    );
  }

  if (saving) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937" }}>
          Modifying FollowUp...
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
        router.push(`../${id_operation}`);
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
              router.push(`../${id_operation}`);
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
          Modify Follow-Up</Text>
        </View>
      </View>


      <ScrollView contentContainerStyle={[styles.form, width >= 700 &&{width : 700, alignSelf : "center"}]}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Follow-Up Name</Text>
          <TextInput
            style={[
              styles.input,
              { 
                borderColor: isFocused ? "#D1D5DB" : "#D1D5DB",
                ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
              },
            ]}
            placeholder="Enter follow-up name"
            value={name}
            onChangeText={setName}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </View>
        
        {Platform.OS === "web" ? (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <input
              type="date"
              value={date.toISOString().substring(0, 10)}
              onChange={(e) => setDate(new Date(e.target.value))}
              style={{ padding : 10, borderRadius: 12, borderWidth : 1, borderColor : "#E5E7EB", color : "#1F2937"}}
            />
          </View>
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
              >
                <Text>{date.toLocaleDateString()}</Text>
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
          </>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[
              styles.input,
              { 
                textAlignVertical: "top",
                padding: 10,
                borderColor: isFocused ? "#D1D5DB" : "#D1D5DB",
                ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
              },
            ]}
            placeholder="Enter notes..."
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
        >
          <Text style={styles.saveButtonText}>Save Changes
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
