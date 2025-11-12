import { useState } from "react";
import { Platform, View,Text,StyleSheet,TouchableOpacity,ScrollView,useWindowDimensions} from "react-native";
import { Notebook, ArrowLeft, Calendar, ClipboardList, Camera, FileUp } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { API_URL } from "@/constants/api";
import { validateFollowUpDate } from "@/utils/dateUtils";
import { LoadingScreen } from "@/components/loadingScreen";
import { showAlert, confirmAction } from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { InputField } from '@/components/inputField';

import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";


export default function CreateFollowUp() {
  const { patient_id } = useLocalSearchParams<{ patient_id: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    notes: "",
    noteHeight: 100, 
  });
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const {width}= useWindowDimensions();

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert("Error", "Follow-up name is required");
      return;
    }

    const { valid, message } = validateFollowUpDate(date);
    if (!valid) {
      showAlert("Error", message);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        patient_id,
        name,
        operation_date: date.toISOString().split("T")[0],
        notes: formData.notes,
      };

      const res = await fetch(`${API_URL}/operations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Unable to save follow-up");
      }

      const opId = data.operation.id_operation;

      for (const [i, uri] of photos.entries()) {
        if (!uri) continue;

        const extension =
          uri.toLowerCase().endsWith(".png") ? "png" :
          uri.toLowerCase().endsWith(".jpg") || uri.toLowerCase().endsWith(".jpeg") ? "jpg" :
          uri.toLowerCase().endsWith(".heic") ? "jpg" :
          "jpg";

        const mimeType = extension === "png" ? "image/png" : "image/jpeg";

        const formData = new FormData();

        if (Platform.OS === "web") {
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append("file", blob, `photo_${i + 1}.${extension}`);
        } else {
          formData.append("file", {
            uri,
            name: `photo_${i + 1}.${extension}`,
            type: mimeType,
          } as any);
        }

        const photoRes = await fetch(`${API_URL}/photos/upload/${opId}`, {
          method: "POST",
          body: formData,
        });

        const text = await photoRes.text();
        console.log(`UPLOAD RESPONSE photo ${i + 1}:`, photoRes.status, text);

        if (!photoRes.ok) {
          console.warn(`Upload error for photo ${i + 1}:`, text);
        }
      }

      setLoading(false);
      router.push(`/patient/followup/${opId}`);
    } catch (err: any) {
      console.error("Error saving follow-up:", err);
      showAlert("Error", err.message || "Unexpected error occurred while saving follow-up");
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
      router.push(`../../${patient_id}`);
    }
  };

  const handlePickPhoto = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const fileUri = asset.uri;

      let extension = fileUri.split(".").pop()?.toLowerCase();

      if (!extension) extension = "jpg";

      setPhotos((prev) => {
        const copy = [...prev];
        copy[index] = fileUri;
        return copy;
      });
    }
  };

  if (loading) return <LoadingScreen text="Creating follow-up..." />;

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
           Add Follow Up
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
              icon={<Calendar size={18} color={COLORS.primary} style={styles.inputIcon} />}
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
              icon={<Calendar size={18} color={COLORS.primary} style={styles.inputIcon} />}
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
            minHeight: formData.noteHeight || 100,
            textAlignVertical: "top",
            padding: 10,
          }}
          value={formData.notes}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, notes: text }))
          }
          onContentSizeChange={({ nativeEvent }) => {
            const height = nativeEvent?.contentSize?.height || 100;
            setFormData((prev) => ({ ...prev, noteHeight: height }));
          }}
        />

          <Text style={[commonStyles.inputTitle]}>
            <Camera size={16} color={ COLORS.primary} style = {styles.inputIcon}/> Photos 
            <Text style={commonStyles.subtitle}> (optional)</Text>
          </Text>
          <View style={styles.photosRow}>
            {photos.map((uri, i) => (
              <TouchableOpacity
                key={i}
                style={styles.photoPlaceholder}
                onPress={() => handlePickPhoto(i)}
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={{ width: "100%", height: "100%", borderRadius: 12 }}
                  />
                ) : (
                  <>
                    <FileUp size={20} color={COLORS.subtitle} />
                    <Text style={{ color: COLORS.subtitle, fontSize: 14, marginTop: 5 }}>
                      Photo {i + 1}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[commonStyles.button,{marginBottom : 40, marginTop : 15}]}
            onPress={handleSave}
          >
            <Text style={commonStyles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: 20,
  },
  inputIcon: {
    marginBottom:-2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateText: { fontSize: 16, color: "#1F2937" },

  label: { 
    fontSize: 16, 
    fontWeight: "500", 
    color: "#374151", 
    marginBottom: 8 
  },
  valueBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  photosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom : 20,
  },
  photoPlaceholder: {
    flex: 1,
    height: 100,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.inputBorderColor,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cardBackground,
  },

});
