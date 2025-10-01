import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { ArrowLeft, FileUp, Plus, Save, Edit, Trash } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { API_URL } from "@/constants/api";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

export default function CreatePositionFollowUp() {
  const { position, operation_id } = useLocalSearchParams<{
    position: string;
    operation_id: string;
  }>();

  const router = useRouter();

  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {width} = useWindowDimensions();

  const maxMeasurements = 6;

  useFocusEffect(
      useCallback(() => {
        if (operation_id && position) {
          loadMeasurements();
        }
      }, [operation_id, position])
  );

  const loadMeasurements = async () => {
    try {
      const res = await fetch(`${API_URL}/results/${operation_id}/${position}`);
      if (!res.ok) throw new Error("Failed to fetch measurements");

      const data = await res.json();
      setMeasurements(data || []);
    } catch (err) {
      console.error("Error loading measurements:", err);
      if (Platform.OS === "web") {
        window.alert("Error\n\nUnable to load measurements");
      } else {
        Alert.alert("Error", "Unable to load measurements");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (index: number) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
          "text/plain",
        ],
      });

      if (res.canceled) return;

      const file = res.assets[0];

      setMeasurements((prev) =>
        prev.map((m) =>
          m.measurement_number === index
            ? { ...m, localFile: file, file_name: file.name }
            : m
        )
      );
    } catch (err) {
      console.error("Import error:", err);
      if (Platform.OS === "web") {
        window.alert("Error\n\nUnable to import file");
      } else {
        Alert.alert("Error", "Unable to import file");
      }
    }
  };

  const handleAddMeasurement = () => {
    if (measurements.length < maxMeasurements) {
      const nextIndex = measurements.length + 1;
      setMeasurements([
        ...measurements,
        { id: null, measurement_number: nextIndex },
      ]);
    } else {
      if (Platform.OS === "web") {
        window.alert("Limit\n\nYou can only add up to 6 measurements");
      } else {
        Alert.alert("Limit", "You can only add up to 6 measurements");
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();

      for (const m of measurements) {
        if (m.localFile) {
          if (Platform.OS === "web") {
            const fileBlob = await fetch(m.localFile.uri).then((r) => r.blob());
            formData.append("files", fileBlob, m.localFile.name);
          } else {
            formData.append("files", {
              uri: m.localFile.uri,
              name: m.localFile.name,
              type: m.localFile.mimeType || "application/octet-stream",
            } as any);
          }
        }
      }

      const res = await fetch(
        `${API_URL}/results/process-results/${operation_id}/${position}`,
        {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json", 
          },
        }
      );

      if (!res.ok) throw new Error("Processing failed");

      const data = await res.json();

      if (data.status === "error") {
        if (Platform.OS === "web") {
          window.alert(`Error\n\n${data.message || "Processing failed"}`);
        } else {
          Alert.alert("Error", data.message || "Processing failed");
        }
        return;
      }

      if (Platform.OS === "web") {
        window.alert("Success\n\nMeasurements processed and saved");
      } else {
        Alert.alert("Success", "Measurements processed and saved");
      }
      router.push(`/patient/followup/${operation_id}`);
    } catch (err) {
      console.error("Save error:", err);
      if (Platform.OS === "web") {
        window.alert("Error\n\nUnable to save measurements");
      } else {
        Alert.alert("Error", "Unable to save measurements");
      }
    } finally {
      setSaving(false);
    }
  };


  const handleDelete = async (index: number, filePath?: string) => {
    try {
      setDeleting(true);
      if (filePath) {
        const res = await fetch(`${API_URL}/results/delete-measurements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_path: filePath }),
        });

        if (!res.ok) throw new Error("Failed to delete file from server");
      }

      setMeasurements((prev) => prev.filter((m) => m.measurement_number !== index));
    } catch (err) {
      console.error("Delete error:", err);
      if (Platform.OS === "web") {
        window.alert("Error\n\nUnable to delete measurement");
      } else {
        Alert.alert("Error", "Unable to delete measurement");
      }
    }
    setDeleting(false);
  };

  const handleBack = () => {
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        "Unsaved Changes\n\nIf you leave now, your modifications will not be saved. Do you want to continue?"
      );
      if (confirm) {
        router.back();
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
              router.back();
            },
          },
        ]
      );
    }
  };
 

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6a90db" />
      </View>
    );
  }

  if (saving) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937", textAlign: "center", paddingHorizontal: 30 }}>
          Please do not close the app while your Excel files are being processed...
        </Text>
      </View>
    );
  }

  if (deleting) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937", textAlign: "center", paddingHorizontal: 30 }}>
          Please do not close the app while your Excel files are being deleted...
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
          Position {position}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, width >= 700 && {width : 700, alignSelf:"center"}]}>

        {measurements.map((m, idx) => (
          <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap : 10 }}>
            <TouchableOpacity
              style={[styles.importButton, { flex: 1 }]}
              onPress={() => handleImport(m.measurement_number)}
            >
              {m.file_name ? (
                <>
                  <Edit size={20} color="#FFFFFF" />
                  <Text style={styles.importText}>{m.file_name}</Text>
                </>
              ) : (
                <>
                  <FileUp size={20} color="#FFFFFF" />
                  <Text style={styles.importText}>
                    Import Measurement {m.measurement_number}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(m.measurement_number, m.file_path)}
            >
              <Trash size={20} color="#891111" />
            </TouchableOpacity>
          </View>
        ))}

        {measurements.length < maxMeasurements && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddMeasurement}
          >
            <Plus size={20} color="#2563EB" />
            <Text style={styles.addButtonText}>Add Measurement</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      

      <View style={styles.footer }>
        <TouchableOpacity style={[styles.saveButton , width >= 700 && {width : 700, alignSelf:"center"}]} onPress={handleSave}>
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Save Measurements</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  content: { padding: 20 },
  infoText: { fontSize: 16, marginBottom: 20, color: "#374151" },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6a90db",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    width: "100%",
    justifyContent: "center",
  },
  importText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 20,
    justifyContent: "center",
  },
  addButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },

  deleteButton: {
    backgroundColor: "#f38181ff", 
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal:10,
    alignItems: "center",
    marginTop: 10,
    marginBottom : 25,
  },
  deleteButtonText: {
    color: "#891111ff",
    fontSize: 16,
    fontWeight: "600",
  },

  footer: {
    padding: 25,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#6a90db",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom : 15,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});
