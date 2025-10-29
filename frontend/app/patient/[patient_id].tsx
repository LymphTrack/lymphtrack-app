import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet,TouchableOpacity, ScrollView, useWindowDimensions } from "react-native";
import { ArrowLeft, MapPin,Notebook, Download } from "lucide-react-native";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "@/constants/api";
import { LoadingScreen } from "@/components/loadingScreen";
import { showAlert, confirmAction } from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { exportFolder } from "@/utils/exportUtils";

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
      console.error("Error fetching patient:", error);
      showAlert("Error", "Failed to load patient information.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOperations = async () => {
    try {
      const res = await fetch(`${API_URL}/operations/by_patient/${patient_id}`);
      if (!res.ok) throw new Error("Failed to fetch operations");

      const data: Operation[] = await res.json();

      const uniqueOps = Array.from(
        new Map(data.map((op) => [op.name, op])).values()
      );

      uniqueOps.sort(
        (a, b) =>
          new Date(a.operation_date).getTime() -
          new Date(b.operation_date).getTime()
      );

      setOperations(uniqueOps);
    } catch (error) {
      console.error("Error fetching operations:", error);
      showAlert("Error", "Failed to load patient operations.");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const url = `${API_URL}/patients/export-folder/${patient_id}`;
    await exportFolder(url, `patient_${patient_id}.zip`);
    setExporting(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (patient_id) {
        fetchPatient();
        fetchOperations();
      }
    }, [patient_id])
  );

  if (loading) return <LoadingScreen active={true} text="" />;
  if (exporting) return <LoadingScreen active={true} text="Exporting patient data..." />;

  if (!patient) {
    return (
      <View style={commonStyles.container}>
        <View style={commonStyles.secondaryHeader}>
          <TouchableOpacity onPress={() => router.push('../(tabs)/patients')}>
            <ArrowLeft size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={commonStyles.secondaryHeaderTitle}>Patient not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
        <View style={commonStyles.secondaryHeader}>
          <View style={[commonStyles.headerInfo, {width: width >= 700 ? 700 : "100%"}]}>
            <TouchableOpacity onPress={() => router.push(`../(tabs)/patients`)}>
                <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text pointerEvents="none" style={[commonStyles.secondaryHeaderTitle]}>
              Patient: {patient.patient_id}
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
        <View style={[commonStyles.form, width >= 700 && {width : 700 , alignSelf : "center"}]}>
          <TouchableOpacity
            style={commonStyles.card}
            onPress={() => router.push(`/patient/modify/${patient.patient_id}`)}
          >
            <View style={commonStyles.cardHeader}>
              <Text style={[commonStyles.title, {color :COLORS.primary}]}>ID: {patient.patient_id}</Text>
              <View style={styles.patientInfo}>
                <Text style={commonStyles.subtitle}>
                  {patient.age ? `${patient.age}y` : '?'} • {patient.gender === 1 ? 'Female' : patient.gender === 2 ? 'Male' : '?'}
                </Text>
                <Text style={commonStyles.subtitle}>
                  BMI: {patient.bmi ? patient.bmi.toFixed(1) : '?'}
                </Text>
              </View>
            </View>

            <View style={commonStyles.row}>
              <MapPin size={16} color={COLORS.text}/>
              <Text style={styles.locationText}>
                Lymphedema side: {
                  patient.lymphedema_side === 1 ? 'Right' :
                  patient.lymphedema_side === 2 ? 'Left' :
                  patient.lymphedema_side === 3 ? 'Bilateral' : '?'
                }
              </Text>
            </View>

            <View style={commonStyles.row}>
              <View style ={{marginTop : 10}}>
                <Notebook size={16} color={COLORS.text} />
              </View>
              <Text 
                style={[commonStyles.notes, { flexWrap: "wrap" }]} 
                numberOfLines={0}
              >
                Notes: {patient.notes || "No notes available for this patient"}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={commonStyles.sectionTitle}>Follow-up</Text>
          
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
                  <View style={[commonStyles.card, {padding:6, paddingLeft : 15}]}>
                    <Text style={styles.timelineOperation}>{op.name}</Text>
                    <Text style={styles.timelineDate}>{new Date(op.operation_date).toLocaleDateString()}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
          <TouchableOpacity
            style={[commonStyles.button,{marginTop : 40, marginBottom: 40}]}
            onPress={() => router.push(`/patient/followup/create_followup/${patient.patient_id}`)}
          >
            <Text style={commonStyles.buttonText}>Add Follow-up</Text>
          </TouchableOpacity> 
        
          <Text style={commonStyles.sectionTitle}>Outcomes</Text>
          <View style={[commonStyles.card, {marginBottom: 40, justifyContent: "center", alignItems: "center"}]}>
            <Text style={commonStyles.title}>🏗️ Under construction</Text>
            <Text style={commonStyles.subtitle}>To be implemented ...</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  patientInfo: { 
    alignItems: "flex-end" 
  },
  locationText: { 
    fontSize: 16, 
    color: COLORS.text,
  },
  noFollowUp: {
    fontSize: 14,
    color: COLORS.subtitle,
    textAlign: "center",
    marginTop: 10,
  },
  timeline: {
    marginTop: 20,
    marginHorizontal: 20,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
    paddingLeft: 15,
  },
  timelineItem: {
    marginBottom: 5,
    paddingLeft: 10,
    position: "relative",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    position: "absolute",
    left: -22,
    top: 30,
  },
  timelineOperation: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  timelineDate: {
    fontSize: 14,
    color: COLORS.subtitle,
    paddingVertical:2,
  },
});
