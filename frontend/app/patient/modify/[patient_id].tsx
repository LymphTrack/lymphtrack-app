import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions} from "react-native";
import { ArrowLeft, Trash, Save , User,Notebook, Weight, ArrowLeftRight} from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, Platform } from "react-native";
import { API_URL } from "@/constants/api";
import { mapDbToGender, mapDbToSide, validatePatientData, mapGenderToDb, mapSideToDb } from "@/utils/patientUtils";
import { LoadingScreen } from "@/components/loadingScreen";
import { SegmentedControl } from '@/components/segmentedControl';
import { showAlert, confirmAction } from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { InputField } from '@/components/inputField';

export default function ModifyPatientScreen() {
  const { patient_id } = useLocalSearchParams<{ patient_id : string }>();
  const router = useRouter();
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Unknown">("Male");
  const [bmi, setBmi] = useState("");
  const [lymphedemaSide, setLymphedemaSide] = useState<"Right" | "Left" | "Both" | "Unknown">("Right");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {width} = useWindowDimensions();
  const [skipAge, setSkipAge] = useState(false);
  const [skipBmi, setSkipBmi] = useState(false);


  useEffect(() => {
    if (patient_id) {
      loadPatient();
    }
  }, [patient_id]);

  const loadPatient = async () => {
    try {
      const res = await fetch(`${API_URL}/patients/${patient_id}`);
      if (!res.ok) throw new Error("Failed to load patient data");

      const data = await res.json();
      setAge(data.age?.toString() || "");
      setSkipAge(data.age === null);

      setBmi(data.bmi?.toString() || "");
      setSkipBmi(data.bmi === null);

      setGender(mapDbToGender(data.gender));
      setLymphedemaSide(mapDbToSide(data.lymphedema_side));
      setNotes(data.notes || "");
    } catch (error) {
      console.error("Error loading patient:", error);
      showAlert("Error", "Failed to load patient data");
    } finally {
      setLoading(false);
    }
  };

  const deletePatient = async () => {
    const confirmed = await confirmAction(
      "Confirm deletion",
      "Are you sure you want to delete this patient?",
      "Delete",
      "Cancel"
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/patients/${patient_id}`, { method: "DELETE" });

      if (!res.ok) {
        const errorData = await res.json();
        showAlert("Error", errorData.detail || "Failed to delete patient");
        return;
      }

      showAlert("Success", "Patient deleted successfully!");
      router.replace("/patients");
    } catch (err) {
      console.error("Error deleting patient:", err);
      showAlert("Error", "Unexpected error occurred");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    const { valid, error, age: ageValue, bmi: bmiValue } = validatePatientData(
      skipAge ? null : age,
      skipBmi ? null : bmi,
      null,
      false
    );

    if (!valid) {
      showAlert("Error", error || "Invalid data");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/patients/${patient_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: skipAge ? null : ageValue,
          gender: mapGenderToDb(gender),
          bmi: skipBmi ? null : bmiValue,
          lymphedema_side: mapSideToDb(lymphedemaSide),
          notes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        showAlert("Error", errorData.detail || "Failed to update patient");
        return;
      }

      showAlert("Success", "Patient updated successfully!");
      router.push(`../${patient_id}`);
    } catch (err) {
      console.error("Error updating patient:", err);
      showAlert("Error", "Unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    const confirmed = await confirmAction(
      "Unsaved Changes",
      "If you leave now, your modifications will not be saved. Do you want to continue?",
      "Leave",
      "Stay"
    );

    if (confirmed) {
      router.push(`../${patient_id}`);
    }
  };

  if (loading) return <LoadingScreen text="" />;
  if (deleting) return <LoadingScreen text="Deleting patient..." />;
  if (saving) return <LoadingScreen text="Saving changes..." />;

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.secondaryHeader}>
        <View
          style={{
            width: width >= 700 ? 700 : "100%",
            alignSelf: "center",
            paddingHorizontal: width >= 700 ? 30 : 10,
          }}
        >
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text
            pointerEvents="none"
            style={commonStyles.secondaryHeaderTitle}
          >
            Modify Patient: {patient_id}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.form , width >= 600 && {width : 600 , alignSelf : "center"}]}>
          
          <View style={commonStyles.card}>
            <Text style={[commonStyles.title, {marginBottom : 12}]}>Patient Demographics</Text>
            <InputField
              label="Age"
              optional
              icon={<User size={18} color={COLORS.text} style={{ marginRight: 4 }} />}
              placeholder="Enter age"
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
              withSwitch
              switchLabel="Do not provide age"
              switchDefault={skipAge}
              onSwitchChange={(val) => {
                setSkipAge(val);
                if (val) setAge("");
              }}
            />
            <View style={styles.inputGroup}>
              <Text style={[commonStyles.inputTitle, { marginTop : 15 }]}><Text style={{ fontSize: 18, marginRight: 4, color: COLORS.text }}>⚧</Text>
                Gender
              </Text>
              <SegmentedControl
                options={['Male', 'Female', 'Unknown']}
                value={gender}
                onValueChange={(val) => setGender(val as "Male" | "Female" | "Unknown")}
              />
            </View>
          </View>       

          <View style={commonStyles.card}>
            <Text style={[commonStyles.title, {marginBottom : 12}]}>Measurements</Text>
            <InputField
              label="BMI"
              optional
              icon={<Weight size={18} color={COLORS.text} style={styles.inputIcon} />}
              placeholder="0.0"
              keyboardType="decimal-pad"
              value={bmi}
              onChangeText={setBmi}
              withSwitch
              switchLabel="Do not provide BMI"
              switchDefault={skipBmi}
              onSwitchChange={(val) => {
                setSkipAge(val);
                if (val) setBmi("");
              }}
            />
          </View>   

          <View style={commonStyles.card}>
            <Text style={[commonStyles.title, {marginBottom : 15}]}>Lymphedema Information</Text>
            <View style={styles.inputGroup}>
              <Text style={commonStyles.inputTitle}><ArrowLeftRight size={18} color={COLORS.text} style={styles.inputIcon} /> Side</Text>
              <SegmentedControl
                options={['Right', 'Left', 'Both', 'Unknown']}
                value={lymphedemaSide}
                onValueChange={(val) => setLymphedemaSide(val as "Right" | "Left" | "Both" | "Unknown")}
              />
            </View>
          </View>

          <View style={commonStyles.card}>
            <Text style={[commonStyles.title, {marginBottom : 12}]}>Other</Text>
            <View style={styles.inputGroup}>
              <InputField
                  label="Notes"
                  optional
                  icon={<Notebook size={18} color={COLORS.text} style={{ marginRight: 4 }} />}
                  placeholder="Enter notes..."
                  multiline
                  style={{
                    minHeight: 100,
                    textAlignVertical: "top",
                    marginBottom: -15,
                  }}
                  value={notes}
                  onChangeText={setNotes}
                />
            </View>
          </View>
  

            <TouchableOpacity
              style={commonStyles.button}
              onPress={handleSave}
              disabled={saving}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Save size={18} color={COLORS.butonText} style={{ marginRight: 8 }} />
                <Text style={commonStyles.buttonText}>Save Changes</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[commonStyles.button, { backgroundColor: COLORS.lightRed, marginTop: 12 }]}
              onPress={deletePatient}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Trash size={18} color={COLORS.darkRed} style={{ marginRight: 8 }} />
                <Text style={[commonStyles.buttonText, { color: COLORS.darkRed }]}>Delete</Text>
              </View>
            </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { padding: 24 },
  inputGroup: { marginBottom: 20 },
  inputIcon: {
    marginBottom:-2,
  },
});
