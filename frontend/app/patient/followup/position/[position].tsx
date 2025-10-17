import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Save, ArrowLeft } from "lucide-react-native";
import { API_URL } from "@/constants/api";

export default function PositionScreen() {
  const { position, operation_id } = useLocalSearchParams<{ position: string; operation_id: string }>();
  const router = useRouter();

  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (operation_id && position) {
      loadMeasurements();
    }
  }, [operation_id, position]);

  const loadMeasurements = async () => {
    try {
      const res = await fetch(`${API_URL}/results/by_operation/${operation_id}`);
      if (!res.ok) throw new Error("Failed to fetch measurements");
      const data = await res.json();

      const filtered = data.filter((m: any) => m.position === Number(position));
      setMeasurements(filtered);
    } catch (err) {
      console.error("Error loading measurements:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6a90db" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Position {position}</Text>
      </View>

      {measurements.length === 0 ? (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No measurements for this position.</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              router.push(
                `/patient/followup/create_followup/position/${position}?operation_id=${operation_id}`
              )
            }
          >
            <Text style={styles.addButtonText}>Add Measurement</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          {measurements.map((m, i) => (
            <View key={i} style={styles.measureBlock}>
              <Text style={styles.measureTitle}>Measurement {m.measurement_number}</Text>
              <Text style={styles.measureText}>RL: {m.min_return_loss_db ?? "?"} dB</Text>
              <Text style={styles.measureText}>Frequency: {m.min_frequency_hz ?? "?"} Hz</Text>
              <Text style={styles.measureText}>Bandwidth: {m.bandwidth_hz ?? "?"} Hz</Text>

              <TouchableOpacity
                style={styles.modifyButton}
                onPress={() =>
                  router.push(
                    `/patient/followup/create_followup/position/${position}?operation_id=${operation_id}`
                  )
                }
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Save size={16} color="#2563EB" style={{ marginRight: 8 }} />
                  <Text style={styles.modifyButtonText}>Modify</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#F8FAFC", paddingBottom: 30 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937", marginLeft: 10 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  noData: { alignItems: "center", marginTop: 60 },
  noDataText: { fontSize: 16, color: "#6B7280", marginBottom: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, margin: 20, elevation: 4 },
  measureBlock: { marginBottom: 20 },
  measureTitle: { fontSize: 16, fontWeight: "600", color: "#6a90db" },
  measureText: { fontSize: 14, color: "#4B5563", marginBottom: 4 },
  modifyButton: {
    backgroundColor: "#c9def9ff",
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  modifyButtonText: { color: "#2563EB", fontSize: 14, fontWeight: "600" },
  addButton: {
    backgroundColor: "#6a90db",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  addButtonText: { color: "white", fontWeight: "600", fontSize: 15 },
});
