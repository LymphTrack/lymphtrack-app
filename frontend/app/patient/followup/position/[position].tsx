import { View, Platform, Alert, Text, ScrollView, StyleSheet, useWindowDimensions, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Trash, ArrowLeft, Plus, Download } from "lucide-react-native";
import { API_URL } from "@/constants/api";
import * as DocumentPicker from "expo-document-picker";

export default function PositionScreen() {
  const { position, operation_id } = useLocalSearchParams<{ position: string; operation_id: string }>();
  const router = useRouter();
  const {width} = useWindowDimensions();
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createMeasurement, setCreateMeasurement] = useState(false);
  const [patient_id, setPatientId] = useState<string | number | null>(null);

  useEffect(() => {
    if (operation_id && position) {
      loadMeasurements();
    }
  }, [operation_id, position]);

  const loadMeasurements = async () => {
    try {
      const [res, opRes] = await Promise.all([
        fetch(`${API_URL}/results/${operation_id}/${position}`),
        fetch(`${API_URL}/operations/${operation_id}`),
      ]);
      if (!res.ok) throw new Error("Failed to fetch measurements");
      if (!opRes.ok) throw new Error("Failed to fetch operation");

      const data = await res.json();
      const opData = await opRes.json();

      setMeasurements(data);
      setPatientId(opData?.patient_id ?? null);
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

      const validExtensions = [".xlsx", ".xls", ".csv"];
      const invalid = assets.filter(a => !validExtensions.some(ext => a.name?.toLowerCase().endsWith(ext)));
      if (invalid.length) {
        const msg = `Some files are not valid Excel or CSV files:\n\n${invalid.map(f => f.name).join("\n")}`;
        Platform.OS === "web" ? window.alert(msg) : Alert.alert("Invalid file type", msg);
        return;
      }

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

      setCreateMeasurement(true);
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
        ? window.alert("Measurements processed and saved!")
        : Alert.alert("Success", "Measurements processed and saved!");

      loadMeasurements();
    } catch (e: any) {
      console.error("Upload error:", e);
      Platform.OS === "web"
        ? window.alert("Error\n\n" + (e.message || e))
        : Alert.alert("Error", e.message || String(e));
    } finally {
      setCreateMeasurement(false);
    }
  };

  const downloadPosition = async () => {
    setExporting(true);
    try {
      console.log("[FRONT] Downloading operation folder:", operation_id);
      const res = await fetch(`${API_URL}/operations/export-position/${operation_id}/${position}`);
                    
      if (!res.ok) 
        throw new Error(`Download failed: ${res.status}`);
                    
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${patient_id}_operation_${operation_id}_position_${position}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      console.log("[FRONT] Download successful");
                  
      } catch (err) {
        console.error("[FRONT] Error downloading:", err);
        Alert.alert("Download error", "Unable to download operation folder");
        setExporting(false);
      }
    setExporting(false);
  }

  const deleteMeasure = async (id_result: number, file_path: string) => {
    const confirmMsg = "Are you sure you want to delete this measurement? This action cannot be undone.";
    if (Platform.OS === "web") {
      const confirmed = window.confirm(confirmMsg);
      if (!confirmed) return;
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert(
          "Delete Measurement",
          confirmMsg,
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Delete", style: "destructive", onPress: () => resolve(true) },
          ],
          { cancelable: true }
        );
      });
      if (!confirmed) return;
    }

    setDeleting(true);
    try {
      const resp = await fetch(`${API_URL}/results/delete-measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ file_path }),
      });

      const data = await resp.json();
      console.log("Delete response:", data);

      if (!resp.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to delete measurement");
      }

      await loadMeasurements();
      
    } catch (err: any) {
      setDeleting(false);
      console.error("Delete error:", err);
      const msg = err.message || "An unexpected error occurred";
      if (Platform.OS === "web") {
        window.alert("Error\n\n" + msg);
      } else {
        Alert.alert("Error", msg);
      }
    }
    setDeleting(false);
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
          Exporting the position...
        </Text>
      </View>
    );
  }

  if (deleting) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937" }}>
          Deleting measurement...
        </Text>
      </View>
    );
  }

  if (createMeasurement) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937" }}>
          Creating measurement(s)...
        </Text>
      </View>
    );
  }
   
  return (
    <ScrollView contentContainerStyle={styles.container}>
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
            <View
              style={{
                width: width >= 700 ? 700 : "100%",
                alignSelf: "center",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: width >= 700 ? 30 : 10,
                position: "relative",
              }}
            >
              <TouchableOpacity onPress={() => router.push(`../${operation_id}`)}>
                <ArrowLeft size={24} color="#1F2937" />
              </TouchableOpacity>

              <Text style={[styles.headerTitle, { textAlign: "center" }]}>
                Position : {position}
              </Text>

              <TouchableOpacity
                style={[styles.downloadButton, width >= 700 && { marginRight: 60,}]}
                onPress={downloadPosition}
              >
                <Download size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>


      {measurements.length === 0 ? (
        <View style={width >= 700 && { width: 700, alignSelf: "center" }}>
          <View style={styles.noData}>
            <Text style={styles.noDataText}>No measurements yet for this position.</Text>
            <TouchableOpacity style={styles.importButton} onPress={importAndUploadPosition}>
              <Plus size={20} color="#2563EB" />
              <Text style={styles.importButtonText}>Add Measurement(s)</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={width >= 700 && { width: 700, alignSelf: "center" }}>
            {measurements.map((m, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.measureBlock}>
                  <View style={styles.measureTitle}>
                    <Text style={styles.measureTitle}>Measurement {m.measurement_number}</Text>
                    <TouchableOpacity onPress={() => deleteMeasure(m.id_result, m.file_path)}>
                      <Trash size={18} color="#4c54bc" /> 
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.measureText}>RL: {m.min_return_loss_db ?? "?"} dB</Text>
                  <Text style={styles.measureText}>Frequency: {m.min_frequency_hz ?? "?"} Hz</Text>
                  <Text style={styles.measureText}>Bandwidth: {m.bandwidth_hz ?? "?"} Hz</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.importButton} onPress={importAndUploadPosition}>
              <Plus size={20} color="#2563EB" />
              <Text style={styles.importButtonText}>Add measurement(s)</Text>
            </TouchableOpacity>
          </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 20,
    paddingTop : Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    marginBottom: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
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
    marginVertical: 10,
    marginHorizontal:20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  measureBlock: { 
    marginBottom: 0, 
  },
  measureTitle: { 
    fontSize: 16, 
    marginBottom: 12,
    fontWeight: "600", 
    color: "#6a90db", 
    flexDirection: "row", 
    justifyContent: "space-between",
    alignItems: "center",
  },
  measureText: { 
    fontSize: 14, 
    color: "#4B5563", 
    marginBottom: 4 
  },
  importButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    flexDirection: "row",
    gap : 10,
    backgroundColor: '#c9def9ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 40,
    width: '50%',
    alignSelf: 'center',
    justifyContent: "center",
  },
downloadButton: {
  backgroundColor: "#6a90db",
  width: 42,
  height: 42,
  borderRadius: 21,
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 3,
  
},
});
