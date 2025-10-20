import { View, Platform, Alert, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Save, ArrowLeft, Plus } from "lucide-react-native";
import { API_URL } from "@/constants/api";
import * as DocumentPicker from "expo-document-picker";

export default function PositionScreen() {
  const { position, operation_id } = useLocalSearchParams<{ position: string; operation_id: string }>();
  const router = useRouter();

  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (operation_id && position) {
      loadMeasurements();
    }
  }, [operation_id, position]);

  const loadMeasurements = async () => {
    try {
      const res = await fetch(`${API_URL}/results/${operation_id}/${position}`);
      if (!res.ok) throw new Error("Failed to fetch measurements");
      const data = await res.json();
      setMeasurements(data);
    } catch (err) {
      console.error("Error loading measurements:", err);
    } finally {
      setLoading(false);
    }
  };

  const importAndUploadPosition = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
        ],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets?.length) return;
      const assets = res.assets;

      if (assets.length < 1 || assets.length > 6) {
        const msg = `You selected ${assets.length} files. Please select between 1 and 6 Excel or CSV files.`;
        Platform.OS === "web" ? window.alert(msg) : Alert.alert("Invalid number of files", msg);
        return;
      }

      // 2️⃣ Vérification extensions
      const validExtensions = [".xlsx", ".xls", ".csv"];
      const invalid = assets.filter(a => !validExtensions.some(ext => a.name?.toLowerCase().endsWith(ext)));
      if (invalid.length) {
        const msg = `Some files are not valid Excel or CSV files:\n\n${invalid.map(f => f.name).join("\n")}`;
        Platform.OS === "web" ? window.alert(msg) : Alert.alert("Invalid file type", msg);
        return;
      }

      // 3️⃣ Préparer FormData
      const fd = new FormData();
      for (const f of assets) {
        if (Platform.OS === "web") {
          let blob: Blob;
          if ((f as any).file instanceof File) blob = (f as any).file as File;
          else blob = await fetch(f.uri).then(r => r.blob());
          fd.append("files", blob, f.name || "measurement.csv");
        } else {
          fd.append("files", {
            uri: f.uri,
            name: f.name || "measurement.csv",
            type: f.mimeType || "application/octet-stream",
          } as any);
        }
      }

      // 4️⃣ Upload vers le backend
      setExporting(true);
      const resp = await fetch(`${API_URL}/results/process-results/${operation_id}/${position}`, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" },
      });

      const text = await resp.text();
      console.log("Backend resp:", resp.status, text);

      if (!resp.ok) throw new Error(text || `HTTP ${resp.status}`);

      const data = JSON.parse(text);
      if (data.status === "error") {
        const msg = data.message || "Processing failed";
        Platform.OS === "web" ? window.alert(`Error\n\n${msg}`) : Alert.alert("Error", msg);
        return;
      }

      Platform.OS === "web"
        ? window.alert("✅ Measurements processed and saved!")
        : Alert.alert("Success", "Measurements processed and saved!");

      loadMeasurements();
    } catch (e: any) {
      console.error("Upload error:", e);
      Platform.OS === "web"
        ? window.alert("Error\n\n" + (e.message || e))
        : Alert.alert("Error", e.message || String(e));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6a90db" />
      </View>
    );
  }

   if (exporting) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937" }}>
          Exporting FollowUp...
        </Text>
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
          <Text style={styles.noDataText}>No measurements yet for this position.</Text>
          <TouchableOpacity style={styles.addButton} onPress={importAndUploadPosition}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Measurement(s)</Text>
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
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={importAndUploadPosition}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add More</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    backgroundColor: "#F8FAFC", 
    paddingBottom: 30 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#1F2937", 
    marginLeft: 10 
  },
  loaderContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  noData: { 
    alignItems: "center", 
    marginTop: 60 
  },
  noDataText: { 
    fontSize: 16, 
    color: "#6B7280",
     marginBottom: 20 
    },
  card: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 16, 
    padding: 20, 
    margin: 20, 
    elevation: 4 
  },
  measureBlock: { 
    marginBottom: 20 
  },
  measureTitle: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#6a90db" 
  },
  measureText: { 
    fontSize: 14, 
    color: "#4B5563", 
    marginBottom: 4 
  },
  addButton: {
    backgroundColor: "#6a90db",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonText: { 
    color: "white", 
    fontWeight: "600", 
    fontSize: 15 
  },
});
