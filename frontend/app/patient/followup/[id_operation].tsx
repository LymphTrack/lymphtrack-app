import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Save, Trash } from "lucide-react-native";
import { API_URL } from "@/constants/api";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

export default function PatientResultsScreen() {
  const { id_operation } = useLocalSearchParams<{ id_operation: string }>();

  const [operation, setOperation] = useState<any | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();


  useFocusEffect(
      useCallback(() => {
        if (id_operation) {
          loadAllData();
        }
      }, [id_operation])
  );

  const loadAllData = async () => {
    try {
      const opRes = await fetch(`${API_URL}/operations/${id_operation}`);
      if (!opRes.ok) throw new Error("Failed to fetch operation");
      const opData = await opRes.json();

      const resultsRes = await fetch(`${API_URL}/operations/${id_operation}/results`);
      if (!resultsRes.ok) throw new Error("Failed to fetch results");
      const resultsData = await resultsRes.json();

      setOperation(opData);
      setResults(resultsData);
    } catch (e) {
      console.error("Error loading patient data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Confirm deletion",
      "Are you sure you want to delete this operation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/operations/${id_operation}`, {
                method: "DELETE",
              });

              if (!res.ok) {
                const errData = await res.json();
                Alert.alert("Error", errData.detail || "Unable to delete the operation");
                return;
              }

              Alert.alert("Success", "Operation deleted successfully");
              router.back();
            } catch (err) {
              console.error("Unexpected error:", err);
              Alert.alert("Error", "Something went wrong during deletion");
            }
          },
        },
      ]
    );
  };

  const renderMeasurements = (position: number) => {
    const measurements = results.filter((f) => f.position === position);

    if (measurements.length === 0) {
      return (
        <View key={`position-${position}`} style={styles.positionBlock}>
          <Text style={styles.positionTitle}>Position {position}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              router.push(
                `/patient/followup/create_followup/position/${position}?operation_id=${operation.id_operation}`
              )
            }
          >
            <Text style={styles.addButtonText}>Add Position {position}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View key={`position-${position}`} style={styles.positionBlock}>
        <Text style={styles.positionTitle}>Position {position}</Text>
        {measurements.map((m) => (
          <View key={m.id} style={styles.measurementRow}>
            <View style={styles.measureBlock}>
              <Text style={styles.measureTitle}>Test {m.measurement_number}</Text>
              <Text style={styles.measureText}>- RL: {m.min_return_loss_db ?? "?"} dB</Text>
              <Text style={styles.measureText}>- Freq: {m.min_frequency_hz ?? "?"} Hz</Text>
              <Text style={styles.measureText}>- BW: {m.bandwidth_hz ?? "?"} Hz</Text>
            </View>
          </View>
        ))}

        <View>
              <TouchableOpacity
                style={styles.modifyButton}
                onPress={() =>
                  router.push(
                    `/patient/followup/create_followup/position/${position}?operation_id=${operation.id_operation}/`
                  )
                }
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Save size={16} color="#2563EB" style={{ marginRight: 8 }} />
                    <Text style={styles.modifyButtonText}>Modify</Text>
                </View>
              </TouchableOpacity>

            </View>
      </View>
    );
  };


  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6a90db" />
      </View>
    );
  }

  if (!operation) {
    return (
      <View style={styles.loaderContainer}>
        <Text>No operation found</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push(
              `/patient/${operation.patient_id}`
            )}>
          <ArrowLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visit patient : {operation.patient_id}</Text>
      <View style={{ width: 28 }} />
    </View>

      <View style={styles.operationBlock}>
        <Text style={styles.operationTitle}>{operation.name}</Text>
        <Text style={styles.operationDate}>({new Date(operation.operation_date).toLocaleDateString()})</Text>
        <Text style={styles.operationNotes}>{operation.notes || "No notes available for this visit"}</Text>
        {[1, 2, 3, 4, 5, 6].map((position) => renderMeasurements(position))}
      </View>

      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.modifyButton}
          onPress={() =>
            router.push(
              `/patient/followup/modify_followup/${operation.id_operation}`
            )
          }
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Save size={16} color="#2563EB" style={{ marginRight: 8 }} />
              <Text style={styles.modifyButtonText}>Modify</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Trash size={16} color="#891111ff" style={{ marginRight: 8 }} />
              <Text style={styles.deleteButtonText}>Delete</Text>
          </View>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
    paddingBottom: 20,
  },
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
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  operationBlock: {
    margin: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  operationTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#6a90db",
    alignSelf : 'center',
    marginBottom : 5
  },
  operationDate: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 25,
    alignSelf : 'center',
  },
  positionBlock: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
  },
  positionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6a90db",
    marginBottom: 6,
  },
  positionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  measureBlock: {
    marginLeft: 10,
  },
  measureTitle: {
    fontSize: 15,
    color: "#6a90db",
    marginBottom: 8,
  },
  measureText: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 2,
  },
  measurementRow: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  deleteButton: {
  backgroundColor: "#f38181ff", 
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: "center",
  marginTop: 10,
  marginBottom : 25,
},
deleteButtonText: {
  color: "#891111ff",
  fontSize: 16,
  fontWeight: "600",
},
modifyButton: {
  backgroundColor: "#c9def9ff",
  marginTop: 14,
  padding: 14,
  borderRadius: 12,
  alignItems: "center",
  },
  modifyButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
  },

  buttonContainer : {
    marginHorizontal : 15,
  },

  operationNotes : {
    marginTop: 10,
    fontSize: 15,
    paddingHorizontal: 10,
    color: "#6B7280",
    marginBottom : 18,
  },

  addButton: {
  backgroundColor: "#c9def9ff",
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: "center",
  marginTop: 8,
},
addButtonText: {
  color: "#2563EB",
  fontSize: 16,
  fontWeight: "600",
},

});
