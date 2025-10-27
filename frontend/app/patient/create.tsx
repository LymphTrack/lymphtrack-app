import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Weight , ArrowLeftRight, Notebook} from 'lucide-react-native';
import { KeyboardAvoidingView, Platform } from "react-native";
import { API_URL } from '@/constants/api';
import { mapGenderToDb, mapSideToDb, validatePatientData } from "@/utils/patientUtils";
import { LoadingScreen } from "@/components/loadingScreen";
import { SegmentedControl } from '@/components/segmentedControl';
import { showAlert, confirmAction } from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { InputField } from '@/components/inputField';

export default function CreatePatientScreen() {
  const router = useRouter();
  const {width} = useWindowDimensions();
  const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
    patient_id: '',
    skipId: false,
    age: '',
    skipAge: false,
    bmi: '',
    skipBmi: false,
    gender: 'Male' as 'Male' | 'Female' | 'Unknown',
    lymphedema_side: 'Right' as 'Right' | 'Left' | 'Both' | 'Unknown',
    notes: '',
  });

  const handleSubmit = async () => {
    const { valid, error, age, bmi } = validatePatientData(
      formData.skipAge ? null : formData.age,
      formData.skipBmi ? null : formData.bmi,
      formData.skipId ? null : formData.patient_id,
      true,
    );

    if (!valid) {
      showAlert("Error", `${error || "Invalid data"}`);
      return;
    }

    if (!formData.skipId && formData.patient_id) {
      if (!formData.patient_id.startsWith("MV")) {
        showAlert("Error", `Patient ID must start with 'MV'`);
        return;
      }
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/patients/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: formData.skipId ? null : formData.patient_id?.trim().toUpperCase(),
          gender: mapGenderToDb(formData.gender),
          age: formData.skipAge ? null : age,
          bmi: formData.skipBmi ? null : bmi,
          lymphedema_side: mapSideToDb(formData.lymphedema_side),
          notes: formData.notes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        showAlert("Error", `${errorData.detail} || "Failed to create patient record"`);
        return;
      }

      const createdPatient = await res.json();
      router.replace(`/patient/${createdPatient.patient_id}`);

    } catch (error) {
      console.error("Error creating patient:", error);
      showAlert("Error", `An unexpected error occurred`);
    } finally {
      setLoading(false);
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
      router.push("../(tabs)/patients");
    }
  };

  if (loading) return <LoadingScreen text="Creating patient..." />;

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
            New Patient
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
            <Text style={[commonStyles.title, {marginBottom : 12}]}>Patient ID</Text>
            <InputField
              label="Custom Patient ID"
              optional
              icon={<User size={18} color={COLORS.text} style={styles.inputIcon} />}
              placeholder="Enter patient ID (e.g. MV123)"
              autoCapitalize="characters"
              value={formData.patient_id}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, patient_id: text.trim().toUpperCase() }))
              }
              withSwitch
              switchLabel="Do not provide ID"
              switchDefault={formData.skipId}
              onSwitchChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  skipId: val,
                  patient_id: val ? "" : prev.patient_id,
                }))
              }
            />            
          </View>
          
          <View style={commonStyles.card}>
            <Text style={[commonStyles.title, {marginBottom : 12}]}>Patient Demographics</Text>
            <InputField
              label="Age"
              optional
              icon={<User size={18} color={COLORS.text} style={styles.inputIcon} />}
              placeholder="Enter age"
              keyboardType="numeric"
              value={formData.age}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, age: text }))}
              withSwitch
              switchLabel="Do not provide age"
              switchDefault={formData.skipAge}
              onSwitchChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  skipAge: val,
                  age: val ? "" : prev.age,
                }))
              }
            />

            <View style={styles.inputGroup}>
              <Text style={[commonStyles.inputTitle, { marginTop : 15 }]}><Text style={{ fontSize: 18, marginRight: 4, color: COLORS.text }}>⚧</Text>
                Gender
              </Text>
              <SegmentedControl
                options={['Male', 'Female', 'Unknown']}
                value={formData.gender}
                onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value as 'Male' | 'Female' | 'Unknown' }))}
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
              value={formData.bmi}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, bmi: text }))}
              withSwitch
              switchLabel="Do not provide BMI"
              switchDefault={formData.skipBmi}
              onSwitchChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  skipBmi: val,
                  bmi: val ? "" : prev.bmi,
                }))
              }
            />
          </View>

          <View style={commonStyles.card}>
            <Text style={[commonStyles.title, {marginBottom : 15}]}>Lymphedema Information</Text>
            <View style={styles.inputGroup}>
              <Text style={commonStyles.inputTitle}><ArrowLeftRight size={18} color={COLORS.text} style={styles.inputIcon} /> Side</Text>
              <SegmentedControl
                options={['Right', 'Left', 'Both', 'Unknown']}
                value={formData.lymphedema_side}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  lymphedema_side: value as 'Left' | 'Right' | 'Both' | 'Unknown'
                }))}
              />
            </View>
          </View>

          <View style={commonStyles.card}>
            <Text style={[commonStyles.title, {marginBottom : 12}]}>Other <Text style={[commonStyles.inputTitle, {color:COLORS.subtitle} ]}>(optional)</Text></Text>
            <View style={styles.inputGroup}>
              <Text style={commonStyles.inputTitle}><Notebook size={18} color={COLORS.text} style={styles.inputIcon} /> Notes</Text>
              <View style={[commonStyles.input, {marginBottom: -10}]}>
                <TextInput
                  style={styles.input}
                  multiline={true}         
                  placeholder="Enter notes..."
                  placeholderTextColor={COLORS.inputText}
                  value={formData.notes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  onContentSizeChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      noteHeight: e.nativeEvent.contentSize.height,
                    }))
                  }
                />
              </View>
            </View>
          </View>
  
        <TouchableOpacity
          style={[commonStyles.button,{marginBottom : 40}]}
          onPress={handleSubmit}
        >
          <Text style={commonStyles.buttonText}>Create Patient</Text>
        </TouchableOpacity>
        
       </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputIcon: {
    marginBottom:-2,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
});