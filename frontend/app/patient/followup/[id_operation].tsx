import { Platform, View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft,Calendar,Download, Notebook, Plus} from "lucide-react-native";
import { API_URL } from "@/constants/api";
import { useState, useCallback} from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { LoadingScreen } from "@/components/loadingScreen";
import { showAlert} from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { importAndUploadFiles } from "@/utils/uploadUtils";
import { exportFolder } from "@/utils/exportUtils";
import { deleteItem } from "@/utils/deleteUtils";
import { LineChart, Line, XAxis, YAxis,Legend, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";


export default function PatientResultsScreen() {
  const { id_operation } = useLocalSearchParams<{ id_operation: string }>();
  const [operation, setOperation] = useState<any | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [photos, setPhotos] = useState<Array<{id:number; url:string; created_at?:string}>>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [graphData, setGraphData] = useState<any[]>([]);
  const router = useRouter();
  const {width} = useWindowDimensions();
  
  useFocusEffect(
      useCallback(() => {
        if (id_operation) {
          loadAllData();
        }
      }, [id_operation])
  );

  const getPositionCoordinates = (pos: number, width: number) => {
    const offsetX = width >= 700 ? 150 : width*0.18;
    const offsetY = 40;

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
    setLoading(true);

    try {
      const [opRes, resultsRes,] = await Promise.all([
        fetch(`${API_URL}/operations/${id_operation}`),
        fetch(`${API_URL}/results/by_operation/${id_operation}`),
      ]);

      if (!opRes.ok) throw new Error("Failed to fetch operation");
      if (!resultsRes.ok) throw new Error("Failed to fetch results");

      const opData = await opRes.json();
      const resultsData = await resultsRes.json();

      setOperation(opData);
      setResults(resultsData);

      await loadGraphData();
      await loadPhotos();

    } catch (e) {
      console.error("Error loading patient data:", e);
      showAlert("Error", "Unable to load operation data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const loadGraphData = async () => {
    try {
      const res = await fetch(`${API_URL}/results/plot-data-by-visit/${id_operation}`);
      if (!res.ok) {
        console.warn("No visit graph found:", res.status);
        setGraphData([]);
        return;
      }
      const data = await res.json();
      if (data?.graph_data) {
        setGraphData(data.graph_data);
      } else {
        setGraphData([]);
      }
    } catch (e) {
      console.error("Error loading graph data:", e);
      setGraphData([]);
    }
  };

  const hasResultForPosition = (pos: number) => {
    return results.some((r) => r.position === pos);
  };

  const loadPhotos = async () => {
    try {
      const res = await fetch(`${API_URL}/photos/${id_operation}`);
      if (!res.ok) throw new Error("Failed to fetch photos");
      const data = await res.json();
      setPhotos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading photos:", e);
      showAlert("Error", "Unable to load operation photos.");
    }
  };

  const uploadPhoto = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        type: ["image/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      const formData = new FormData();

      if (Platform.OS === "web") {
        let blob: Blob;
        if ((file as any).file instanceof File) {
          blob = (file as any).file as File;
        } else {
          blob = await fetch(file.uri).then((r) => r.blob());
        }
        formData.append("file", blob, file.name || "photo.jpg");
      } else {
        formData.append("file", {
          uri: file.uri,
          name: file.name || "photo.jpg",
          type: file.mimeType || "image/jpeg",
        } as any);
      }

      setUploadingPhoto(true);

      const res = await fetch(`${API_URL}/upload/photos/${id_operation}`, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to upload photo");

      const data = JSON.parse(text);
      if (data?.photo?.url) {
        setPhotos((prev) => [...prev, data.photo]);
      }

      showAlert("Success", "Photo uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      showAlert("Error", err.message || "Unexpected error during photo upload.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const importAndUploadAll = async () => {
    const url = `${API_URL}/results/process-all/${id_operation}`;
    await importAndUploadFiles(url, 18, () => router.push(`/patient/followup/${id_operation}`));
  };

  const handleExport = async () => {
    setExporting(true);
    const url = `${API_URL}/operations/export-folder/${id_operation}`;
    await exportFolder(url, `${operation.patient_id}_operation_${id_operation}.zip`);
    setExporting(false);
  };

  const deletePhoto = async (
    photoId: number,
    setPhotos: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    await deleteItem(`${API_URL}/photos/${photoId}`, "photo", () =>
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    );
  };

  if (loading) return <LoadingScreen text="" />;
  if (uploadingPhoto) return <LoadingScreen text="Uploading photo..." />;
  if (exporting) return <LoadingScreen text="Exporting FollowUp..." />;

  if (!operation) {
    return (
      <View style={styles.loaderContainer}>
        <Text>No operation found</Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.secondaryHeader}>
        <View style={[commonStyles.headerInfo, { width: width >= 700 ? 700 : "100%" }]}>
          <TouchableOpacity onPress={() => router.push(`/patient/${operation.patient_id}`)}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text pointerEvents="none" style={[commonStyles.secondaryHeaderTitle]}>
            Visit patient : {operation.patient_id}
          </Text>
          <TouchableOpacity
            style={commonStyles.addButton}
            onPress={() => handleExport()}
          >
            <Download size={20} color={COLORS.textButton} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.form, width >= 700 && { width: 700, alignSelf: "center" }]}>
          <TouchableOpacity
            style={commonStyles.card}
            onPress={() => router.push(`../followup/modify_followup/${id_operation}`)}
          >
            <View style={commonStyles.cardHeader}>
              <Text style={[commonStyles.title, { color: COLORS.primary }]}>
                Visit name : {operation.name}
              </Text>
              <View style={commonStyles.row}>
                <Calendar size={16} color={COLORS.subtitle} />
                <Text style={commonStyles.subtitle}>
                  {new Date(operation.operation_date).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={commonStyles.row}>
              <Notebook size={16} color={COLORS.text} style={{ marginTop: 11 }} />
              <Text style={commonStyles.notes} numberOfLines={0}>
                Notes: {operation.notes || "No notes available for this visit"}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={commonStyles.sectionTitle}>Positions</Text>
          <View style={commonStyles.card}>
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
                      { backgroundColor: filled ? COLORS.primary : COLORS.grayMedium },
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

          <TouchableOpacity
            style={[commonStyles.button, { marginTop: 40, marginBottom: 40 }]}
            onPress={importAndUploadAll}
          >
            <Text style={commonStyles.buttonText}>Import all results</Text>
          </TouchableOpacity>

          {photos.length >= 0 && (
            <View style={{ width: "100%", alignSelf: "center", marginBottom: 40 }}>
              <View style={[commonStyles.card, { marginTop: 0 }]}>
                <View
                  style={commonStyles.cardHeader}
                >
                  <Text style={commonStyles.title}>
                    Photos ({photos.length})
                  </Text>
                  <TouchableOpacity
                    onPress={uploadPhoto}
                    disabled={uploadingPhoto}
                    style={[styles.photoAddBtn, uploadingPhoto && { opacity: 0.6 }]}
                  >
                    <Plus size={18} color={COLORS.butonText} />
                    <Text style={styles.photoAddBtnText}>Add photo</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.photoGrid}>
                  {photos.map((p) => (
                    <View key={p.id} style={styles.photoItem}>
                      <Image
                        source={{ uri: p.url }}
                        style={styles.photoImage}
                        onError={(e) => {
                          console.log("Image failed to load:", p.url, e.nativeEvent);
                        }}
                      />
                      <TouchableOpacity
                        style={styles.deletePhotoButton}
                        onPress={() => deletePhoto(p.id, setPhotos)}
                      >
                        <Text style={styles.deletePhotoButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
          <View style={commonStyles.form}>
            <Text style={[commonStyles.sectionTitle, {marginTop: 0}]}>Outcomes</Text>

              {results.length === 0 ? (
                <View style={[commonStyles.card, { marginBottom: 10, maxWidth: 800,  width:"100%", alignSelf:"center" }]}>
                  <Text style={commonStyles.subtitle}>No measurements yet.</Text>
                </View>
              ) : (
              <View style={{ marginBottom: 40, maxWidth:1120, width:"100%", alignSelf:"center"}}>
                <View style={[commonStyles.card,]}>
                  <Text style={[commonStyles.sectionTitle, { fontSize: 16, marginTop:0 }]}>
                    Comparison graph of measurements
                  </Text>

                  <View style={{ height: 500}}>
                    <ResponsiveContainer width="100%" height="100%" >
                      <LineChart data={graphData} margin={{ top: 40, right: 20, left: 20, bottom: 20 }}>
                        <CartesianGrid stroke={COLORS.grayLight} />
                        <XAxis 
                          dataKey="freq" 
                          tickFormatter={(value) => value.toFixed(3)}
                          label={{ 
                            value: "Frequency (GHz)", 
                            position: "top" ,
                            fill : COLORS.subtitle,
                            fontSize : 16,
                            fontWeight : "500",
                            dy:50,
                          }} 
                        />
                        <YAxis 
                          label={{ 
                            value: "Return Loss (dB)", 
                            angle: -90, 
                            position: "insideLeft",
                            fill : COLORS.subtitle,
                            fontSize : 16,
                            fontWeight : "500",
                            dy : 50,
                          }} 
                        />
                        <Tooltip />
                        
                        {Array.from({ length: 6 }).map((_, index) => {
                          const pos = index + 1;
                          if (!graphData.some((d) => d[`pos${pos}`] !== undefined)) return null;
                          return (
                            <Line
                              key={pos}
                              type="monotone"
                              dataKey={`pos${pos}`}
                              stroke={COLORS[`color${pos}`]}
                              strokeWidth={2}
                              dot={false}
                              name={`Position ${pos}`}
                            />
                          );
                        })}

                        <Legend
                          verticalAlign="bottom"
                          align="center"
                          wrapperStyle={{
                            paddingTop: 40,
                            fontSize: 15,
                            color: COLORS.subtitle,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </View>   
                </View>
              </View>
            )}
          </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    paddingHorizontal: 24,
  },

  positionButton: {
    position: "absolute",
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: COLORS.shadow,
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
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,           
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    margin: 5,
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    borderRadius: 12,
  },
  photoAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.butonBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoAddBtnText: {
    color: COLORS.butonText,
    fontSize: 14,
    fontWeight: "600",
  },
  deletePhotoButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: COLORS.butonBackground,
    borderRadius: 12,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  deletePhotoButtonText: {
    color: "white",
    fontSize: 16,
    lineHeight: 14,
    marginTop: -4,
    fontWeight: "bold",
  },
});
