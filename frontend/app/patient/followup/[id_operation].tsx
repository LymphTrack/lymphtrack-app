import { Platform, View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft,Calendar,Download, Notebook, Plus, Save, Trash } from "lucide-react-native";
import { API_URL } from "@/constants/api";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";

export default function PatientResultsScreen() {
  const { id_operation } = useLocalSearchParams<{ id_operation: string }>();

  const [operation, setOperation] = useState<any | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();
  const {width} = useWindowDimensions();
  const [measurements, setMeasurements] = useState(
    Array.from({ length: 6 }, (_, i) => ({
      position: i + 1,
      files: [],
    }))
  );

  useFocusEffect(
      useCallback(() => {
        if (id_operation) {
          loadAllData();
        }
      }, [id_operation])
  );

  const getPositionCoordinates = (pos: number, width: number) => {
    const offsetX = width >= 700 ? 180 : 120;
    const offsetY = width >= 700 ? 60 : 40;

    switch (pos) {
      case 1:
        return { bottom: offsetY + 15, right: offsetX + 30 };
      case 2:
        return { bottom: offsetY + 130, right: offsetX + 50 };
      case 3 : 
        return { top: offsetY + 80, right: offsetX + 60 };
      case 4:
        return { bottom: offsetY + 20, left: offsetX +0 };
      case 5:
        return { bottom: offsetY + 135, left: offsetX +30 };
      case 6:
        return { top: offsetY + 75, left: offsetX +40 }; 
      default:
        return {};
    }
  };

  const loadAllData = async () => {
    try {
      const opRes = await fetch(`${API_URL}/operations/${id_operation}`);
      if (!opRes.ok) throw new Error("Failed to fetch operation");
      const opData = await opRes.json();

      const resultsRes = await fetch(`${API_URL}/results/by_operation/${id_operation}`);
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

  const hasResultForPosition = (pos: number) => {
    return results.some(r => r.position === pos);
  };


  const handleDelete = async () => {
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        "Confirm deletion\n\nAre you sure you want to delete this operation?"
      );
      if (confirm) {
        setDeleting(true);
        try {
          const res = await fetch(`${API_URL}/operations/${id_operation}`, {
            method: "DELETE",
          });

          if (!res.ok) {
            const errData = await res.json();
            window.alert(`Error\n\n${errData.detail || "Unable to delete the operation"}`);
            return;
          }

          const data = await res.json();
          setDeleting(false);
          window.alert(`Success\n\n${data.message || "Operation deleted successfully"}`);

          router.push(`../${data.patient_id}`);
        } catch (err) {
          console.error("Unexpected error:", err);
          window.alert("Error\n\nSomething went wrong during deletion");
        }
      }
    } else {
      Alert.alert(
        "Confirm deletion",
        "Are you sure you want to delete this operation?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setDeleting(true);
              try {
                const res = await fetch(`${API_URL}/operations/${id_operation}`, {
                  method: "DELETE",
                });

                if (!res.ok) {
                  const errData = await res.json();
                  Alert.alert("Error", errData.detail || "Unable to delete the operation");
                  return;
                }

                const data = await res.json();
                Alert.alert("Success", data.message || "Operation deleted successfully");
                setDeleting(false);
                router.push(`../${data.patient_id}`);
              } catch (err) {
                console.error("Unexpected error:", err);
                Alert.alert("Error", "Something went wrong during deletion");
              }
            },
          },
        ]
      );
    }
  };

  const handleImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
        ],
      });

      if (res.canceled || !res.assets?.length) return;

      const files = res.assets;

      if (files.length !== 18) {
        const msg = `You selected ${files.length} files. You should import 18 (3 per position × 6 positions).`;
        Platform.OS === "web"
          ? window.alert(msg)
          : Alert.alert("Invalid number of files", msg);
        return;
      }

      const validExtensions = [".xlsx", ".xls", ".csv"];
      const invalidFiles = files.filter(
        (f) => !validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
      );
      if (invalidFiles.length > 0) {
        const msg = `Some files are not valid Excel or CSV files:\n\n${invalidFiles
          .map((f) => f.name)
          .join("\n")}`;
        Platform.OS === "web"
          ? window.alert(msg)
          : Alert.alert("Invalid file type", msg);
        return;
      }

      const grouped = [];
      for (let i = 0; i < 6; i++) {
        grouped.push({
          position: i + 1,
          files: files.slice(i * 3, i * 3 + 3),
        });
      }

      setMeasurements(grouped);
      setLoading(true);
      await handleSave();
      setLoading(false);
    } catch (err) {
      console.error("Import error:", err);
      Platform.OS === "web"
        ? window.alert("Error\n\nUnable to import files")
        : Alert.alert("Error", "Unable to import files");
    }
  };


  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();

      for (const group of measurements) {
        for (const file of group.files) {
          if (Platform.OS === "web") {
            if (file.file) {
              formData.append("files", file.file);
            } else {
              const blob = await fetch(file.uri).then((r) => r.blob());
              formData.append("files", blob, file.name);
            }
          } else {
            formData.append("files", {
              uri: file.uri,
              name: file.name,
              type: file.mimeType || "application/octet-stream",
            } as any);
          }
        }
      }

      const res = await fetch(`${API_URL}/results/process-all/${id_operation}`, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error("Processing failed");

      const data = await res.json();
      if (data.status === "error") {
        const msg = data.message || "Processing failed";
        Platform.OS === "web"
          ? window.alert(`Error\n\n${msg}`)
          : Alert.alert("Error", msg);
        return;
      }

      Platform.OS === "web"
        ? window.alert("All measurements processed and saved!")
        : Alert.alert("Success", "All measurements processed and saved!");
      router.push(`/patient/followup/${id_operation}`);
    } catch (err) {
      console.error("Save error:", err);
      Platform.OS === "web"
        ? window.alert("Error\n\nUnable to save measurements")
        : Alert.alert("Error", "Unable to save measurements");
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6a90db" />
      </View>
    );
  }

  if (deleting) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937" }}>
          Deleting FollowUp...
        </Text>
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

  if (!operation) {
    return (
      <View style={styles.loaderContainer}>
        <Text>No operation found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1}}>
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
              <TouchableOpacity onPress={() => router.push(`/patient/${operation.patient_id}`)}>
                <ArrowLeft size={24} color="#1F2937" />
              </TouchableOpacity>

              <Text style={[styles.headerTitle, { textAlign: "center" }]}>
                Visit patient : {operation.patient_id}
              </Text>

              <TouchableOpacity
                style={[styles.downloadButton, width >= 700 && { marginRight: 40,}]}
                onPress={async () => {
                  setExporting(true);
                  try {
                    console.log("[FRONT] Downloading operation folder:", id_operation);
                    const res = await fetch(`${API_URL}/operations/export-folder/${id_operation}`);
                    
                    if (!res.ok) 
                      throw new Error(`Download failed: ${res.status}`);
                    
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `operation_${id_operation}.zip`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    console.log("[FRONT] Download successful");
                  
                  } catch (err) {
                    console.error("[FRONT] Error downloading:", err);
                    Alert.alert("Download error", "Unable to download operation folder");
                    setExporting(false);
                  }
                  setExporting(false);
                }}
              >
                <Download size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={width >= 700 && { width: 700, alignSelf: "center" }}>
          <View style={styles.operationCard}>
            <View style={styles.operationHeader}>
              <Text style={styles.operationName}>Visit name : {operation.name}</Text>
              <View style ={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.operationDate}>
                  {new Date(operation.operation_date).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.operationRow}>
              <Notebook size={16} color="#6B7280" />
              <Text style={styles.operationNotes}>
                Notes: {operation.notes || "No notes available for this visit"}
              </Text>
            </View>
          </View>
          <Text style={styles.positionpTitle}>Positions</Text>

          <View>
            <View style={styles.operationCard}>
              <View style={{ position: "relative" }}>
                <Image
                  source={require("../../../assets/images/body.png")}
                  style={{ width: "100%", height: 400, resizeMode: "contain" }}
                />

                {Array.from({ length: 6 }).map((_, index) => {
                  const pos = index + 1;
                  const filled = hasResultForPosition(pos);
                  return (
                    <TouchableOpacity
                      key={pos}
                      style={[
                        styles.positionButton,
                        getPositionCoordinates(pos, width),
                        { backgroundColor: filled ? "#6a90db" : "#9CA3AF" },
                      ]}
                      onPress={() =>
                        router.push(`/patient/followup/position/${pos}?operation_id=${operation.id_operation}`)
                      }
                    >
                      <Text style={styles.positionButtonText}>{pos}</Text>
                    </TouchableOpacity>
                  );
                })}

              </View>
            </View>
          </View>
        </View>
        <View>
          <TouchableOpacity
            style ={styles.importButton}
            onPress={() => handleImport()}
          >
            <Plus size={20} color="#2563EB" />
            <Text style={styles.importButtonText}>Import all results</Text>
          </TouchableOpacity>
      </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={ styles.button}>
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
                <Text style={styles.modifyButtonText}>Modify visit</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Trash size={16} color="#891111ff" style={{ marginRight: 8 }} />
                <Text style={styles.deleteButtonText}>Delete visit</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop : Platform.OS === 'web' ? 20 : 60,
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
operationCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  padding: 20,
  margin: 20,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
},
operationHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
},
operationName: { fontSize: 18, fontWeight: "600", color: "#6a90db" },
operationDate: { fontSize: 14, color: "#6B7280" },
operationRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 8,
  gap: 8,
},
operationNotes: {
  fontSize: 16,
  color: "#6B7280",
  flexShrink: 1,
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
  button : {
    flexDirection: "row",
    gap  : 25,
    alignSelf : "center",
  },
  deleteButton: {
  backgroundColor: "#f38181ff", 
  borderRadius: 12,
  padding: 14,
  alignItems: "center",
  width : 150,
},
deleteButtonText: {
  color: "#891111ff",
  fontSize: 16,
  fontWeight: "600",
},
modifyButton: {
  backgroundColor: "#c9def9ff",
  padding: 14,
  borderRadius: 12,
  alignItems: "center",
  width : 150,
  },
  modifyButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
  },

  buttonContainer : {
    marginHorizontal : 15,
    width : 400,
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

  positionpTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6a90db",
    marginTop: 10,
    alignSelf: "center",
  },

sectionTitle: {
  fontSize: 18,
  fontWeight: "600",
  color: "#1F2937",
  marginBottom: 16,
},
settingItem: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#F3F4F6",
},
settingLeft: {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
},
iconContainer: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "#EFF6FF",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
},
settingTitle: {
  fontSize: 16,
  fontWeight: "500",
  color: "#1F2937",
  marginBottom: 2,
},
settingSubtitle: {
  fontSize: 14,
  color: "#6B7280",
},

positionIcon: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: "#EFF6FF",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
},
positionNumber: {
  fontSize: 14,
  fontWeight: "600",
  color: "#2563EB",
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
footer: {
    padding: 25,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
positionButton: {
  position: "absolute",
  backgroundColor: "#6a90db",
  width: 28,
  height: 28,
  borderRadius: 14,
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 3,
  elevation: 3,
},
positionButtonText: {
  color: "white",
  fontWeight: "600",
  fontSize: 13,
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
    marginTop: 24,
    marginBottom: 30,
    width: '50%',
    alignSelf: 'center',
    justifyContent: "center",
  },
});
