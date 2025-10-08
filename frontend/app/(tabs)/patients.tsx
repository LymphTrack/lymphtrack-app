import { useState} from 'react';
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput , ActivityIndicator, Platform, useWindowDimensions,} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Plus,MapPin, Trash, Download , X, CheckCircle2, Circle} from 'lucide-react-native';
import { Alert } from "react-native";
import { useCallback } from "react";
import DropDownPicker from "react-native-dropdown-picker";
import { API_URL } from '@/constants/api';

interface Patient {
  patient_id: string;
  age: number;
  gender: number;
  bmi: number;
  lymphedema_side: number;
  notes : string | null;
}

export default function PatientsScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();            
  const { width } = useWindowDimensions();
  const [isFocused, setIsFocused] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  

  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, [])
  );

  const loadPatients = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/patients/`);
      if (!res.ok) {
        throw new Error("Failed to fetch patients");
      }
      const data = await res.json();
      setPatients(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeletePatient = (patient_id: string) => {
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        "Confirm deletion\n\nAre you sure you want to delete this patient?"
      );
      if (confirm) {
        deletePatient(patient_id);
      }
    } else {
      Alert.alert(
        "Confirm deletion",
        "Are you sure you want to delete this patient?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deletePatient(patient_id),
          },
        ]
      );
    }
  };

  const deletePatient = async (patient_id: string) => {
    try {
      setDeletingId(patient_id);
      const res = await fetch(`${API_URL}/patients/${patient_id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        if (Platform.OS === "web") {
          window.alert("Error\n\nFailed to delete patient");
        } else {
          Alert.alert("Error", "Failed to delete patient");
        }
      } else {
        if (Platform.OS === "web") {
          window.alert("Success\n\nPatient deleted successfully");
        } else {
          Alert.alert("Success", "Patient deleted successfully");
        }
        loadPatients();
      }
    } catch (err) {
      console.error("Erreur:", err);
      if (Platform.OS === "web") {
        window.alert("Error\n\nUnable to delete patient. Please check your internet connection.");
      } else {
        Alert.alert(
          "Error",
          "Unable to delete patient. Please check your internet connection."
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  const [genderFilter, setGenderFilter] = useState<"" | "1" | "2">(""); 
  const [sideFilter, setSideFilter] = useState<"" | "1" | "2" | "3">("");

  const filteredPatients = patients
    .slice()
    .sort((a, b) => a.patient_id.localeCompare(b.patient_id))
    
    .filter((p) =>
      p.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
    )

    .filter((p) => 
      genderFilter ? p.gender === parseInt(genderFilter) : true
    )

  .filter((p) =>
    sideFilter ? p.lymphedema_side === parseInt(sideFilter) : true
  );

  const [openSide, setOpenSide] = useState(false);
  const [openGender, setOpenGender] = useState(false);
  const [side, setSide] = useState([
    { label: "All sides", value: "" },
    { label: "Right", value: "1" },
    { label: "Left", value: "2" },
    { label: "Bilateral", value: "3" },
  ]);
  const [gender, setGender] = useState([
    { label: "All gender", value: "" },
    { label: "Female", value: "1" },
    { label: "Male", value: "2" },
  ]);

  const renderPatientItem = ({ item }: { item: Patient }) => {
    const isSelected = selectedPatients.includes(item.patient_id);

    return (
      <TouchableOpacity
        style={[
          styles.patientCard,
          exportMode && isSelected && { backgroundColor: "#E5EDFF", borderColor: "#6a90db" },
        ]}
        onPress={() => {
          if (exportMode) {
            setSelectedPatients((prev) =>
              prev.includes(item.patient_id)
                ? prev.filter((id) => id !== item.patient_id)
                : [...prev, item.patient_id]
            );
          } else {
            router.push(`/patient/${item.patient_id}`);
          }
        }}
      >
        <View style={styles.patientHeader}>
          <Text style={styles.patientId}>ID: {item.patient_id}</Text>
          <View style={styles.patientInfo}>
            <Text style={styles.patientDetail}>
              {item.age != null ? `${item.age}y` : "?"} •{" "}
              {item.gender === 1 ? "Female" : item.gender === 2 ? "Male" : "?"}
            </Text>
            <Text style={styles.patientDetail}>
              BMI: {item.bmi != null ? item.bmi.toFixed(1) : "?"}
            </Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.locationText}>
              Lymphedema side:{" "}
              {item.lymphedema_side === 1
                ? "Right"
                : item.lymphedema_side === 2
                ? "Left"
                : item.lymphedema_side === 3
                ? "Bilateral"
                : "?"}
            </Text>
          </View>

          {exportMode ? (
            isSelected ? (
              <CheckCircle2 size={26} color="#6a90db" />
            ) : (
              <Circle size={26} color="#D1D5DB" />
            )
          ) : (
            <TouchableOpacity
              disabled={deletingId === item.patient_id}
              onPress={() => confirmDeletePatient(item.patient_id)}
            >
              {deletingId === item.patient_id ? (
                <ActivityIndicator size="small" color="#6a90db" />
              ) : (
                <Trash size={18} color="#4c54bc" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleExport = async () => {
    console.log("🟢 [FRONT] handleExport() triggered");
    setExporting(true);

    if (selectedPatients.length === 0) {
      console.warn("⚠️ [FRONT] No patients selected for export");
      setExporting(false);
      return;
    }

    console.log("📦 [FRONT] Selected patients:", selectedPatients);

    try {
      console.log("➡️ [FRONT] Sending POST request to backend...");
      const res = await fetch(`${API_URL}/patients/export-multiple`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedPatients),
      });

      console.log("⬅️ [FRONT] Response received. Status:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ [FRONT] Backend responded with error:", errorText);
        throw new Error(`Export failed: ${res.status}`);
        setExporting(false);
      }

      console.log("📥 [FRONT] Fetch successful, converting response to blob...");
      const blob = await res.blob();
      console.log("✅ [FRONT] Blob created. Size:", blob.size, "bytes");

      console.log("💾 [FRONT] Creating download link...");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `patients_export_${selectedPatients.length}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      console.log("📁 [FRONT] File download triggered successfully");
      window.URL.revokeObjectURL(url);
      console.log("🧹 [FRONT] Temporary object URL revoked");

    } catch (err) {
      console.error("❌ [FRONT] Error during export:", err);
      Alert.alert("Export error", "Unable to export selected patients");
      setExporting(false);
    } finally {
      console.log("🔚 [FRONT] handleExport() finished");
      setExporting(false);
    }
  };

  const selectAll = () => {
    if (selectedPatients.length === filteredPatients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(filteredPatients.map((p) => p.patient_id));
    }
  };

  if (exporting) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
        <Text style={{ marginTop: 20, fontSize: 16, color: "#1F2937", textAlign: "center", paddingHorizontal: 30 }}>
          Exporting Folder(s) ...
        </Text>
      </View>
    );
  } 

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
      </View>
    );
  }

  

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style = {{ width : width>= 700 ? 700 : "100%", 
          alignSelf: width >= 700 ? "center" : "stretch", 
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: width >= 700 ? 30 : 10,}}>
            <Text style={styles.headerTitle}>Patients</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!exportMode && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => router.push('/patient/create')}
                >
                  <Plus size={22} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.exportModeButton, exportMode && { backgroundColor: "#ef4444" }]}
                onPress={() => {
                  setExportMode(!exportMode);
                  setSelectedPatients([]);
                }}
              >
                {exportMode ? <X size={20} color="#FFF" /> : <Download size={20} color="#FFF" />}
                <Text style={styles.exportModeText}>{exportMode ? "Cancel" : "Export"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <FlatList
          data={filteredPatients}
          renderItem={renderPatientItem}
          keyExtractor={(item) => item.patient_id}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={[
            styles.listContainer,
            width >= 700 && { width: 700, alignSelf: "center" }
          ]}
          ListHeaderComponent={
            <>
              <View
                style={[
                  styles.searchContainer,
                  {
                    width: width >= 700 ? 660 : "100%",
                    alignSelf: width >= 700 ? "center" : "stretch",
                  },
                ]}
              >
                <Search size={20} color="#6a90db" style={styles.searchIcon} />
                <TextInput
                  style={[
                    styles.searchInput,
                    { 
                      borderColor: isFocused ? "red" : "#D1D5DB",
                      ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
                    },
                  ]}
                  placeholder="Search by Patient ID..."
                  placeholderTextColor={"gray"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View
                style={{
                  marginTop: -5,
                  marginBottom: 10,
                  zIndex: 1000,
                  width: width >= 700 ? 700 : "100%",
                  alignSelf: width >= 700 ? "center" : "stretch",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginHorizontal: width >= 700 ? 14 : -5,
                    marginTop: -5,
                    marginBottom: 10,
                  }}
                >
                  <View style={styles.pickerWrapper}>
                    <DropDownPicker
                      open={openSide}
                      value={sideFilter}
                      items={side}
                      setOpen={setOpenSide}
                      setValue={(callback) => {
                        const val = callback(sideFilter);
                        setSideFilter(val);
                      }}
                      setItems={setSide}
                      placeholder="Select side"
                      style={styles.dropdown}
                      dropDownContainerStyle={styles.dropdownContainer}
                      textStyle={{ fontSize: 16, color: "gray" }}
                      listMode='MODAL'
                    />
                  </View>

                  <View style={styles.pickerWrapper}>
                    <DropDownPicker
                      open={openGender}
                      value={genderFilter}
                      items={gender}
                      setOpen={setOpenGender}
                      setValue={(callback) => {
                        const val = callback(genderFilter);
                        setGenderFilter(val);
                      }}
                      setItems={setGender}
                      placeholder="Select gender"
                      style={styles.dropdown}
                      dropDownContainerStyle={styles.dropdownContainer}
                      textStyle={{ fontSize: 16, color: "gray" }}
                      listMode='MODAL'
                    />
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.counterContainer,
                  width >= 700 && { width: 700, marginRight: 70, alignSelf: "center" },
                ]}
              >
                <Text style={styles.counterText}>
                  Patients: {filteredPatients.length}
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No patients found</Text>
              <Text style={styles.emptySubtext}>
                Add your first patient to get started
              </Text>
            </View>
          }

        />
        {exportMode && (
          <View style={styles.bottomBar}>
            <TouchableOpacity onPress={selectAll} style={styles.bottomButton}>
              <Text style={styles.bottomButtonText}>
                {selectedPatients.length === filteredPatients.length ? "Deselect all" : "Select all"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExport}
              style={[
                styles.bottomButton,
                { backgroundColor: selectedPatients.length ? "#6a90db" : "#9CA3AF" },
              ]}
              disabled={selectedPatients.length === 0}
            >
              <Download size={18} color="#FFF" />
              <Text style={[styles.bottomButtonText, { marginLeft: 6, color: "white" }]}>
                Export {selectedPatients.length > 0 ? `(${selectedPatients.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 10,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#6a90db',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6a90db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 7 : 12,
    fontSize: 16,
    color: "black",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 20,
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientId: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6a90db',
  },
  patientInfo: {
    alignItems: 'flex-end',
  },
  patientDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  patientBody: {
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between'
  },
  locationText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  exportModeButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#6a90db',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10,
  },
  exportModeText: { color: '#FFF', fontWeight: '500', marginLeft: 6 },
  
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  counterContainer: {
    alignItems: "flex-end", 
    marginTop : Platform.OS === 'web' ? -5 : 12,
    marginRight: 30,
    marginBottom: 10,
  },

  counterText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6a90db",
    fontStyle : 'italic',
  },
  pickerWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  dropdown: {
    borderColor: "#E5E7EB",
    borderRadius: 12,
    minHeight: Platform.OS === 'web' ? 35 : 45, 
  },
  dropdownContainer: {
    borderColor: "#E5E7EB",
    minHeight: Platform.OS === 'web' ? 35 : 45,  
  },

  bottomBar: {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "#FFFFFF",
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",
  borderTopWidth: 1,
  borderTopColor: "#E5E7EB",
  paddingVertical: 12,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 4,
},
bottomButton: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#E0E7FF",
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 8,
},
bottomButtonText: {
  color: "#4c54bc",
  fontWeight: "600",
  fontSize: 15,
},

});