import { View, Text, ScrollView, StyleSheet, useWindowDimensions, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { Trash, ArrowLeft, Download, Plus } from "lucide-react-native";
import { API_URL } from "@/constants/api";
import { exportFolder } from "@/utils/exportUtils";
import { LoadingScreen } from "@/components/loadingScreen";
import { showAlert } from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { importAndUploadFiles } from "@/utils/uploadUtils";
import { deleteItem } from "@/utils/deleteUtils";
import { exportGraph } from "@/utils/exportGraphUtils";
import { GraphView, MultiPositionGraphs } from "@/components/graphView";

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
  const [graphData, setGraphData] = useState<any[]>([]);
  const [loadingGraphData, setLoadingGraphData] = useState(true);
  const graphRef = useRef(null);

  useEffect(() => {
    if (operation_id && position) {
      loadMeasurements();
      loadGraphData();
    }
  }, [operation_id, position]);

  const loadMeasurements = async () => {
    setLoading(true);
    try {
      const [res, opRes] = await Promise.all([
        fetch(`${API_URL}/results/by-visit-and-position/${operation_id}/${position}`),
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

  const loadGraphData = async () => {
    setLoadingGraphData(true);
    try {
      const plotRes = await fetch(`${API_URL}/results/plot-data-by-position/${operation_id}/${position}`);
      if (!plotRes.ok) throw new Error("Failed to fetch graph data");
      const plotData = await plotRes.json();
      setGraphData(plotData.graph_data ?? []);
    } catch (err) {
      console.error("Error loading graph data:", err);
      setGraphData([]);
    } finally {
      setLoadingGraphData(false);
    }
  };

  const importAndUploadPosition = async () => {
    setCreateMeasurement(true);
    const url = `${API_URL}/results/process-results/${operation_id}/${position}`;
    await importAndUploadFiles(url, [1, 6], loadMeasurements);
    setCreateMeasurement(false);
  };

  const handleExport = async () => {
    setExporting(true);
    const url = `${API_URL}/operations/export-position/${operation_id}/${position}`;
    await exportFolder(url, `operation_${operation_id}_position_${position}.zip`);
    setExporting(false);
  };

  const deleteMeasure = async (id_result: number, file_path: string) => {
    setDeleting(true);
    await deleteItem(
      `${API_URL}/results/delete-measurements`,
      "measurement",
      loadMeasurements,
      "POST",
      { file_path }
    );
    setDeleting(false);
  };

  if (loading) return <LoadingScreen text="" />;
  if (exporting) return <LoadingScreen text="Exporting folder..." />;
  if (deleting) return <LoadingScreen text="Deleting measurement..." />;
  if (createMeasurement) return <LoadingScreen text="Creating measurement(s)..." />;
   
  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.secondaryHeader}>
        <View style={[commonStyles.headerInfo, { width: width >= 700 ? 700 : "100%" }]}>
          <TouchableOpacity onPress={() => router.push(`../${operation_id}`)}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text pointerEvents="none" style={[commonStyles.secondaryHeaderTitle]}>
            Position : {position}
          </Text>
          <TouchableOpacity
            style={commonStyles.addButton}
            onPress={handleExport}
          >
            <Download size={20} color={COLORS.textButton} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[commonStyles.form, width >= 700 && { width: 700, alignSelf: "center" }]}>
          {measurements.length === 0 ? (
            <View style={width >= 700 && { width: 700, alignSelf: "center" }}>
              <View style={styles.noData}>
                <Text style={commonStyles.title}>
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
            <View style={[commonStyles.form, width >= 700 && { width: 700, alignSelf: "center" }]}>
              {measurements.map((m, i) => (
                <View key={i} style={commonStyles.card}>
                  <View style={styles.measureBlock}>
                    <View style={[commonStyles.cardHeader, {marginTop:-30}]}>
                      <Text style={[commonStyles.sectionTitle , {fontSize : 20, fontWeight : "600"}]}>
                        Measurement {m.measurement_number}
                      </Text>
                      <TouchableOpacity
                        onPress={() => deleteMeasure(m.id_result, m.file_path)}
                      >
                        <Trash size={18} color={COLORS.secondary} style={{marginTop: 30}}/>
                      </TouchableOpacity>
                    </View>

                    <Text style={commonStyles.subtitle}>
                      RL: {m.min_return_loss_db ?? "?"} dB
                    </Text>
                    <Text style={commonStyles.subtitle}>
                      Frequency: {m.min_frequency_hz ?? "?"} Hz
                    </Text>
                    <Text style={commonStyles.subtitle}>
                      Bandwidth: {m.bandwidth_hz ?? "?"} Hz
                    </Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={[commonStyles.button,{marginTop : 40, marginBottom: 10}]}
                onPress={importAndUploadPosition}
              >
                <View style={commonStyles.row}>
                  <Plus size={16} color={COLORS.butonText} />
                  <Text style={commonStyles.buttonText}>Add measurement(s)</Text>
                </View>
              </TouchableOpacity>  
            </View>
          )}
        </View>
        <View style={commonStyles.form}>
          <Text style={commonStyles.sectionTitle}>Outcomes</Text>

          {loadingGraphData ? (
            <View
              style={[
                {
                  alignItems: "center",
                  justifyContent: "center",
                  height: 300,
                  maxWidth: 800,
                  width: "100%",
                  alignSelf: "center",
                },
              ]}
            >
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={[commonStyles.subtitle, { marginTop: 15 }]}>
                Loading graph...
              </Text>
            </View>
          ) : measurements.length === 0 ? (
            <View
              style={[
                commonStyles.card,
                {
                  marginBottom: 10,
                  maxWidth: 800,
                  width: "100%",
                  alignSelf: "center",
                },
              ]}
            >
              <Text style={commonStyles.subtitle}>No measurements yet.</Text>
            </View>
          ) : (
            <>
            <GraphView
              graphData={graphData}
              lines={measurements.map((_, i) => `loss${i + 1}`)}
              labels={Object.fromEntries(
                measurements.map((m, i) => [
                  `loss${i + 1}`,
                  `Measurement ${m.measurement_number ?? i + 1}`,
                ])
              )}
              title="Comparison graph of measurements"
              exportRef={graphRef}
            />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignSelf: "center",
              marginBottom: 40,
              maxWidth: 500,
              gap: 20,
            }}
          >
            <TouchableOpacity
              style={[commonStyles.button, { width: 150 }]}
              onPress={() => exportGraph(graphData, `graph_position_${position}`, "csv")}
            >
              <Text style={commonStyles.buttonText}>Export CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[commonStyles.button, { width: 150 }]}
              onPress={() =>
                exportGraph(graphData, `graph_position_${position}`, "png", graphRef)
              }
            >
              <Text style={commonStyles.buttonText}>Export PNG</Text>
            </TouchableOpacity>
          </View>
          </>
          )}
        </View>
      </ScrollView>
    </View> 
  );
}

const styles = StyleSheet.create({
  noData: { 
    alignItems: "center", 
    marginTop: 60 
  },
  measureBlock: { 
    marginBottom: 0, 
  },
  metricText: {
    fontSize: 14,
    lineHeight: 18,
  },
  metricValue: {
    fontWeight: "600",
    color: COLORS.text,
  },

});
