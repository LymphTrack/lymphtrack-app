import { useState, useEffect } from "react";
import {Platform, View,Text,TextInput,TouchableOpacity,StyleSheet,Alert,ScrollView,ActivityIndicator, useWindowDimensions} from "react-native";
import { ArrowLeft, ClipboardList , Notebook, Calendar, Save, Trash} from "lucide-react-native";
import { useRouter, useLocalSearchParams,  } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { API_URL } from "@/constants/api";
import { validateFollowUpDate } from "@/utils/dateUtils";
import { LoadingScreen } from "@/components/loadingScreen";
import { showAlert, confirmAction } from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { InputField } from '@/components/inputField';

export default function ModifyFollowUpScreen() {
  const { id_operation } = useLocalSearchParams<{ id_operation: string }>();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const {width} = useWindowDimensions();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (id_operation) loadFollowUp();
  }, [id_operation]);

  const loadFollowUp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/operations/${id_operation}`);
      if (!res.ok) throw new Error("Failed to fetch follow-up");

      const data = await res.json();
      setName(data?.name || "");
      setDate(data?.operation_date ? new Date(data.operation_date) : new Date());
      setNotes(data?.notes || "");
    } catch (err) {
      console.error("Error loading follow-up:", err);
      showAlert("Error", "Unable to load follow-up data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const { valid, message } = validateFollowUpDate(date);
    if (!valid) {
      showAlert("Error", message);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/operations/${id_operation}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          operation_date: date.toISOString().split("T")[0],
          notes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        showAlert("Error", errorData.detail || "Unable to update follow-up");
        return;
      }

      showAlert("Success", "Follow-up updated successfully!");
      router.push(`/patient/followup/${id_operation}`);
    } catch (err) {
      console.error("Error updating follow-up:", err);
      showAlert("Error", "Unable to update follow-up");
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
      router.push(`../${id_operation}`);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmAction(
      "Confirm deletion",
      "Are you sure you want to delete this operation?",
      "Delete",
      "Cancel"
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/operations/${id_operation}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showAlert("Error", data.detail || "Unable to delete the operation");
        return;
      }

      showAlert("Success", data.message || "Operation deleted successfully");
      router.push(`../${data.patient_id}`);
    } catch (err) {
      console.error("Unexpected error:", err);
      showAlert("Error", "Something went wrong during deletion");
    } finally {
      setDeleting(false);
    }
  }; 

  if (loading) return <LoadingScreen text="" />;
  if (saving) return <LoadingScreen text="Saving changes..." />;
  if (deleting) return <LoadingScreen text="Deleting operation..." />;

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
           Modify Follow Up
          </Text>
        </View>
      </View>

     <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.form , width >= 600 && {width : 600 , alignSelf : "center"}]}>
          <InputField
              label="Follow-up Name"
              required
              icon={<ClipboardList size={16} color={COLORS.primary} style={styles.inputIcon} />}
              placeholder="Ex: PreOp, 1 month ..."
              value={name}
              onChangeText={setName}
            />
        
          {Platform.OS === "web" ? (
            <InputField
              label="Date"
              required
              icon={<Calendar size={16} color={COLORS.primary} style={styles.inputIcon} />}
              belowElement={
                <input
                  type="date"
                  value={date.toISOString().substring(0, 10)}
                  onChange={(e) => setDate(new Date(e.target.value))}
                  style={{
                      borderWidth: 1,
                      flex : 1,
                      borderColor: COLORS.inputBorderColor,
                      color: COLORS.subtitle,
                      borderRadius: 20,
                      padding : 12,
                      fontSize: 16,
                      marginBottom: 16,
                      backgroundColor: COLORS.inputBackground, 
                    }}
                />
              }
            />
          ) : (
            <InputField
              label="Date"
              required
              icon={<Calendar size={18} color={COLORS.primary} style={{ marginRight: 4 }} />}
              value={date.toLocaleDateString()}
              editable={false}
              belowElement={
                <>
                  <TouchableOpacity
                    style={[
                      commonStyles.input,
                      { flexDirection: "row", alignItems: "center" },
                    ]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Calendar size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: COLORS.text, fontSize: 16 }}>
                      {date.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setDate(selectedDate);
                      }}
                    />
                  )}
                </>
              }
          />
          )}

          <InputField
            label="Notes"
            optional
            icon={<Notebook size={16} color={COLORS.primary} style={styles.inputIcon} />}
            placeholder="Enter notes..."
            multiline
            style={{
              minHeight: 100,
              textAlignVertical: "top",
              padding: 10,
            }}
            value={notes}
            onChangeText={setNotes}
          />

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
              onPress={handleDelete}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Trash size={18} color={COLORS.darkRed} style={{ marginRight: 8 }} />
                <Text style={[commonStyles.buttonText, { color: COLORS.darkRed }]}>Delete</Text>
              </View>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { 
    padding: 24 
  },
  inputIcon: {
    marginBottom:-2,
  },
});
