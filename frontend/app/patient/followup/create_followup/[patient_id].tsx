import { useState } from "react";
import { Platform, View,Text,StyleSheet,TouchableOpacity,ScrollView,Alert,TextInput,ActivityIndicator, useWindowDimensions} from "react-native";
import { Notebook, ArrowLeft, Calendar, ClipboardList, Save, FileUp } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { API_URL } from "@/constants/api";
import { validateFollowUpDate } from "@/utils/dateUtils";

import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";


export default function CreateFollowUp() {
  const { patient_id } = useLocalSearchParams<{ patient_id: string }>();
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
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
      if (Platform.OS === "web") {
        window.alert("Error\n\nFollow-up name is required");
      } else {
        Alert.alert("Error", "Follow-up name is required");
      }
      return;
    }

    const { valid, message } = validateFollowUpDate(date);
    if (!valid) {
      if (Platform.OS === "web") {
        window.alert(`Error\n\n${message}`);
      } else {
        Alert.alert("Error", message);
      }
      return;
    }

    setLoading(true);
    try {
      const payload = {
        patient_id: patient_id,
        name: name,
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

        const extension = uri.split(".").pop()?.toLowerCase() || "jpg";
        const mimeType =
          extension === "png" ? "image/png" : "image/jpeg";

        const formData = new FormData();
        formData.append("file", {
          uri,
          name: `photo_${i + 1}.${extension}`,
          type: mimeType,
        } as any);

        const photoRes = await fetch(`${API_URL}/photos/${opId}`, {
          method: "POST",
          body: formData,
        });

        const photoData = await photoRes.json();
        if (!photoRes.ok) {
          console.warn(`Erreur upload photo ${i + 1}:`, photoData?.detail);
        }
      }

      setLoading(false);
      router.push(`/patient/followup/${opId}`);

    } catch (err: any) {
      if (Platform.OS === "web") {
        window.alert("Error\n\n" + err.message);
      } else {
        Alert.alert("Error", err.message);
      }
    } finally {
      setLoading(false);
    }
  };


  const handleBack = () => {
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        "Unsaved Changes\n\nIf you leave now, your modifications will not be saved. Do you want to continue?"
      );
      if (confirm) {
        router.push(`../../${patient_id}`);
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
              router.push(`../../${patient_id}`);
            },
          },
        ]
      );
    }
  };

  const handlePickPhoto = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // garde Images = tous les formats
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937" }}>
          Creating FollowUp...
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
          Add Follow-Up</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent,  width >= 700 && {width : 700, alignSelf : "center"}]}>
        <View style={styles.card}>
          <Text style={styles.label}>
            Follow-up Name <Text style={{ color: "red" }}>*</Text>
          </Text>
          <View style={styles.inputRow}>
            <ClipboardList size={18} color="#6a90db" style={{ marginRight: 8 }} />
            <TextInput
              style={[
                styles.input,
                { 
                  borderColor: isFocused ? "red" : "#D1D5DB",
                  ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
                },
              ]}
              placeholder="Ex: PreOp , 1 month ..."
              placeholderTextColor={"#9CA3AF"}
              
              value={name}
              onChangeText={setName}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </View>
        </View>


        {Platform.OS === "web" ? (
          <View style={styles.card}>
            <Text style={styles.label}>
              Date <Text style={{ color: "red" }}>*</Text>
            </Text>
            <input
              type="date"
              value={date.toISOString().substring(0, 10)}
              onChange={(e) => setDate(new Date(e.target.value))}
              style={{ padding : 10, borderRadius: 12, borderWidth : 1, borderColor : "#E5E7EB", color : "#9CA3AF"}}
            />
          </View>
        ) : (
          <>
            <View style={styles.card}> 
              <Text style={styles.label}>Date <Text style={{ color: "red" }}>*</Text></Text> 
              <TouchableOpacity 
                style={styles.inputRow} 
                onPress={() => setShowDatePicker(true)} 
              > 
                <Calendar size={18} color="#6a90db" 
                  style={{ marginRight: 8 }} 
                /> 
                <Text style={styles.dateText}> 
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
                    if (selectedDate) 
                      setDate(selectedDate); 
                    }}
                /> 
              )}
            </View>
          </>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Notes (Optionnal)</Text>
          <View>
            <View style={styles.inputContainer}>
              <Notebook size={18} color="#6a90db" style ={{justifyContent: "flex-start", alignItems: "center"}}/>
              <TextInput
                style={[
                  styles.input,
                  { 
                    minHeight: formData.noteHeight, 
                    textAlignVertical: "top",
                    padding: 10,
                    borderColor: isFocused ? "red" : "#D1D5DB",
                    ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
                  },
                ]}       
                multiline
                placeholder="Enter notes..."
                placeholderTextColor="#9CA3AF"
                underlineColorAndroid="transparent"

                value={formData.notes}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, notes: text }))
                }
                onContentSizeChange={({ nativeEvent }) => {
                  const height = nativeEvent?.contentSize?.height || 100;
                  setFormData((prev) => ({ ...prev, noteHeight: height }));
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.label}>Photos (Optional)</Text>
          </View>

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
                    <FileUp size={20} color="#9CA3AF" />
                    <Text style={{ color: "#9CA3AF", fontSize: 14, marginTop: 5 }}>
                      Photo {i + 1}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>



        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Next</Text>
        </TouchableOpacity>
      </ScrollView>
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 16, color: "#1F2937", borderColor:"none" },
  dateText: { fontSize: 16, color: "#1F2937" },

  headerTitle: { fontSize: 20, fontWeight: "600", color: "#1F2937" },
  scrollContent: { padding: 20, paddingBottom: 60 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6a90db",
    marginBottom: 12,
    alignSelf: "center",
  },
  positionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 10,
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#6a90db",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#D1D5DB', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    backgroundColor: '#FFFFFF', 
   
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  importText: {
    marginLeft: 8,
    fontSize: 15,
    color: "#1F2937",
  },
  photosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  photoPlaceholder: {
    flex: 1,
    height: 100,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },

});
