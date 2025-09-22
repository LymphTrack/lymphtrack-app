import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform , View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, ScrollView, useWindowDimensions } from "react-native";
import { ArrowLeft, MapPin,Notebook, Share } from "lucide-react-native";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "@/constants/api";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

interface Patient {
  patient_id: string;
  age: number;
  gender: number;
  bmi: number;
  lymphedema_side: number;
  notes: string | null;
}

interface Operation {
  id_operation: number;
  name: string;
  operation_date: string;
}

export default function PatientDetailScreen() {
  const { patient_id } = useLocalSearchParams<{ patient_id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [exporting, setExporting] = useState(false);
  const {width} = useWindowDimensions();

  const fetchPatient = async () => {
    try {
      const res = await fetch(`${API_URL}/patients/${patient_id}`);
      if (!res.ok) throw new Error("Failed to fetch patient");
      const data = await res.json();
      setPatient(data);
    } catch (error) {
      console.error("Erreur patient:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperations = async () => {
    try {
      const res = await fetch(`${API_URL}/operations/by_patient/${patient_id}`);
      if (!res.ok) throw new Error("Failed to fetch operations");
      
      const data: Operation[] = await res.json(); 

      setOperations(
        Array.from(new Map(data.map((op) => [op.name, op])).values())
      );
    } catch (error) {
      console.error("Erreur op:", error);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      const fileUri = FileSystem.documentDirectory + `patient_${patient_id}.zip`;

      const res = await FileSystem.downloadAsync(
        `${API_URL}/patients/export-folder/${patient_id}`,
        fileUri
      );

      if (res.status !== 200) {
        const errorText = await FileSystem.readAsStringAsync(res.uri);
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.status === "error") {
            if (Platform.OS === "web") {
              window.alert(`No Files\n\n${errorJson.message || "No files found for this patient"}`);
            } else {
              Alert.alert("No Files", errorJson.message || "No files found for this patient");
            }
            return;
          }
        } catch {
        }
        throw new Error("Failed to download patient zip");
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(res.uri);
      } else {
        if (Platform.OS === "web") {
          window.alert(`Download complete\n\nSaved to ${res.uri}`);
        } else {
          Alert.alert("Download complete", `Saved to ${res.uri}`);
        }
      }
    } catch (error) {
      console.error("Export error:", error);

      if (Platform.OS === "web") {
        const retry = window.confirm("Error\n\nUnable to export patient folder.\n\nDo you want to retry?");
        if (retry) {
          handleExport();
        }
      } else {
        Alert.alert(
          "Error",
          "Unable to export patient folder",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Retry", onPress: () => handleExport() },
          ]
        );
      }
    } finally {
      setExporting(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      if (patient_id) {
        fetchPatient();
        fetchOperations();
      }
    }, [patient_id])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db"/>
      </View>
    );
  }

  if (exporting) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937", textAlign: "center", paddingHorizontal: 30 }}>
          Exporting patient folder... Please do not close the app.
        </Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('../(tabs)/patients')}>
            <ArrowLeft size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient not found</Text>
          <View style={{ width: 28 }} />
        </View>
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
          <TouchableOpacity onPress={() => router.push(`../(tabs)/patients`)}>
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
          Patient: {patient.patient_id}</Text>
        </View>
      </View>

      <ScrollView style = {width>= 700 && {width : 700, alignSelf : "center"}}>
        <TouchableOpacity
          style={styles.patientCard}
          onPress={() => router.push(`/patient/modify/${patient.patient_id}`)}
        >
          <View style={styles.patientHeader}>
            <Text style={styles.patientId}>ID: {patient.patient_id}</Text>
            <View style={styles.patientInfo}>
              <Text style={styles.patientDetail}>
                {patient.age ? `${patient.age}y` : '?'} • {patient.gender === 1 ? 'Female' : patient.gender === 2 ? 'Male' : '?'}
              </Text>
              <Text style={styles.patientDetail}>
                BMI: {patient.bmi ? patient.bmi.toFixed(1) : '?'}
              </Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.locationText}>
              Lymphedema side: {
                patient.lymphedema_side === 1 ? 'Right' :
                patient.lymphedema_side === 2 ? 'Left' :
                patient.lymphedema_side === 3 ? 'Bilateral' : '?'
              }
            </Text>
          </View>

          <View style={styles.locationRow}>
            <View style ={{marginTop : 10}}>
              <Notebook size={16} color="#6B7280" />
            </View>
            <Text 
              style={[styles.patientNotes, { flexWrap: "wrap" }]} 
              numberOfLines={0}
            >
              Notes: {patient.notes || "No notes available for this patient"}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.followUpTitle}>Follow-up</Text>
        <View style={styles.timeline}>
          {operations.length === 0 ? (
            <Text style={styles.noFollowUp}>No follow-up available</Text>
          ) : (
            operations.map((op) => (
              <TouchableOpacity
                key={op.id_operation}
                style={styles.timelineItem}
                onPress={() => router.push(`/patient/followup/${op.id_operation}`)}
              >
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineOperation}>{op.name}</Text>
                  <Text style={styles.timelineDate}>{new Date(op.operation_date).toLocaleDateString()}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>


        <TouchableOpacity
          style={styles.addFollowUpButton}
          onPress={() => router.push(`/patient/followup/create_followup/${patient.patient_id}`)}
        >
          <Text style={styles.addFollowUpButtonText}>Add Follow-Up</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.exportButton, width >= 700 && {width : 700, alignSelf: "center"}]} onPress={handleExport}>
          <Share size={20} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Export Patient Folder</Text>
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
  patientCard: {
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
  patientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  patientId: { fontSize: 18, fontWeight: "600", color: "#6a90db" },
  patientInfo: { alignItems: "flex-end" },
  patientDetail: { fontSize: 14, color: "#6B7280", marginBottom: 2 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  locationText: { fontSize: 16, color: "#374151" },
  patientNotes: {
    marginTop: 10,
    fontSize: 16,
    color: "#6B7280",
  },
  followUpTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6a90db",
    marginTop: 10,
    alignSelf: "center",
  },
  noFollowUp: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 10,
  },
  timeline: {
    marginTop: 20,
    marginHorizontal: 20,
    borderLeftWidth: 2,
    borderLeftColor: "#6a90db",
    paddingLeft: 15,
  },
  timelineItem: {
    marginBottom: 20,
    paddingLeft: 10,
    position: "relative",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#6a90db",
    position: "absolute",
    left: -22,
    top: 10,
  },
  timelineContent: {
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  timelineOperation: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  timelineDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  addFollowUpButton: {
    backgroundColor: '#c9def9ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 60,
    width: '50%',
    alignSelf: 'center',
  },
  addFollowUpButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },

   footer: {
    padding: 25,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  exportButton: {
    flexDirection: "row",
    backgroundColor: "#6a90db",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom : 15,
    alignItems: "center",
    justifyContent: "center",
  },
  exportButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
