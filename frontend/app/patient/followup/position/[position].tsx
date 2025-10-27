import { View, Platform, Alert, Text, ScrollView, StyleSheet, useWindowDimensions, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Trash, ArrowLeft, Plus, Download } from "lucide-react-native";
import { API_URL } from "@/constants/api";
import * as DocumentPicker from "expo-document-picker";
import { LoadingScreen } from "@/components/loadingScreen";
import { showAlert, confirmAction } from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { importAndUploadFiles } from "@/utils/uploadUtils";

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
    setLoading(true);
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
      showAlert("Error", "Unable to load measurements data.");
    } finally {
      setLoading(false);
    }
  };

  const importAndUploadPosition = async () => {
    const url = `${API_URL}/results/process-results/${operation_id}/${position}`;
    await importAndUploadFiles(url, [1, 6], loadMeasurements);
  };

  const downloadPosition = async () => {
    setExporting(true);
    try {
      console.log("[FRONT] Downloading operation folder:", operation_id);

      const res = await fetch(`${API_URL}/operations/export-position/${operation_id}/${position}`);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${patient_id}_operation_${operation_id}_position_${position}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);

      console.log("[FRONT] Download successful");
      showAlert("Download complete", "The position folder has been successfully saved.");
    } catch (err) {
      console.error("[FRONT] Error downloading:", err);
      showAlert("Download error", "Unable to download operation folder.");
    } finally {
      setExporting(false);
    }
  };

  const deleteMeasure = async (id_result: number, file_path: string) => {
    const confirmed = await confirmAction(
      "Delete Measurement",
      "Are you sure you want to delete this measurement? This action cannot be undone.",
      "Delete",
      "Cancel"
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const resp = await fetch(`${API_URL}/results/delete-measurements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ file_path }),
      });

      const data = await resp.json();
      console.log("Delete response:", data);

      if (!resp.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to delete measurement");
      }

      showAlert("Success", "Measurement deleted successfully.");
      await loadMeasurements();
    } catch (err: any) {
      console.error("Delete error:", err);
      showAlert("Error", err.message || "An unexpected error occurred while deleting measurement.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingScreen text="" />;
  if (exporting) return <LoadingScreen text="Exporting folder..." />;
  if (deleting) return <LoadingScreen text="Deleting measurement..." />;
  if (createMeasurement) return <LoadingScreen text="Creating measurement(s)..." />;
   
  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.secondaryHeader}>
        <View style={[styles.headerInfo, { width: width >= 700 ? 700 : "100%" }]}>
          <TouchableOpacity onPress={() => router.push(`../${operation_id}`)}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text pointerEvents="none" style={[commonStyles.secondaryHeaderTitle]}>
            Position : {position}
          </Text>
          <TouchableOpacity
            style={commonStyles.addButton}
            onPress={downloadPosition}
          >
            <Download size={20} color={COLORS.textButton} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.form, width >= 700 && { width: 700, alignSelf: "center" }]}>
          {measurements.length === 0 ? (
            <View style={width >= 700 && { width: 700, alignSelf: "center" }}>
              <View style={styles.noData}>
                <Text style={styles.noDataText}>
                  No measurements yet for this position.
                </Text>
                <TouchableOpacity
                  style={[commonStyles.button,{marginTop : 40, marginBottom: 40}]}
                  onPress={importAndUploadPosition}
                >
                  <Text style={commonStyles.buttonText}>Add measurement(s)</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.form, width >= 700 && { width: 700, alignSelf: "center" }]}>
              {measurements.map((m, i) => (
                <View key={i} style={commonStyles.card}>
                  <View style={styles.measureBlock}>
                    <View style={styles.measureTitle}>
                      <Text style={styles.measureTitle}>
                        Measurement {m.measurement_number}
                      </Text>
                      <TouchableOpacity
                        onPress={() => deleteMeasure(m.id_result, m.file_path)}
                      >
                        <Trash size={18} color={COLORS.secondary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.measureText}>
                      RL: {m.min_return_loss_db ?? "?"} dB
                    </Text>
                    <Text style={styles.measureText}>
                      Frequency: {m.min_frequency_hz ?? "?"} Hz
                    </Text>
                    <Text style={styles.measureText}>
                      Bandwidth: {m.bandwidth_hz ?? "?"} Hz
                    </Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={[commonStyles.button,{marginTop : 40, marginBottom: 40}]}
                onPress={importAndUploadPosition}
              >
                <Text style={commonStyles.buttonText}>Add measurement(s)</Text>
              </TouchableOpacity>  
            </View>
          )}
        </View>
      </ScrollView>
    </View> 
  );
}

const styles = StyleSheet.create({
  headerInfo :{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal:20,
  },
  form: {
    paddingHorizontal: 20,
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
});
