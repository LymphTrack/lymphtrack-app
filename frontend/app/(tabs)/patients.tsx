import { useState, useCallback} from 'react';
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput , ActivityIndicator, Platform, useWindowDimensions,} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Plus,MapPin, Trash, Download , X, CheckCircle2, Circle} from 'lucide-react-native';
import DropDownPicker from "react-native-dropdown-picker";
import { API_URL } from '@/constants/api';
import { LoadingScreen } from "@/components/loadingScreen";
import { showAlert} from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { exportFolder } from "@/utils/exportUtils";
import { deleteItem } from "@/utils/deleteUtils";

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
  const [deletingId, setDeletingId] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();            
  const { width } = useWindowDimensions();
  const [isFocused, setIsFocused] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
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
  const [genderFilter, setGenderFilter] = useState<"" | "1" | "2">(""); 
  const [sideFilter, setSideFilter] = useState<"" | "1" | "2" | "3">("");

  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, [])
  );

  const loadPatients = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/patients/`);
      if (!res.ok) throw new Error("Failed to fetch patients");

      const data = await res.json();
      setPatients(data || []);
    } catch (error) {
      console.error("Error loading patients:", error);
      showAlert("Error", "Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const deletePatient = async (patient_id: string) => {
    setDeletingId(true);
    await deleteItem(`${API_URL}/patients/${patient_id}`, "patient", loadPatients);
    setDeletingId(false);
  };

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


  const renderPatientItem = ({ item }: { item: Patient }) => {
    const isSelected = selectedPatients.includes(item.patient_id);

    return (
      <TouchableOpacity
        style={[
          commonStyles.card,
          exportMode && isSelected && { backgroundColor: COLORS.butonBackground, borderColor: COLORS.primary},
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
        <View style={commonStyles.cardHeader}>
          <Text style={[commonStyles.title, {color :COLORS.primary}]}>ID: {item.patient_id}</Text>
          <View style={styles.patientInfo}>
            <Text style={commonStyles.subtitle}>
              {item.age != null ? `${item.age}y` : "?"} •{" "}
              {item.gender === 1 ? "Female" : item.gender === 2 ? "Male" : "?"}
            </Text>
            <Text style={commonStyles.subtitle}>
              BMI: {item.bmi != null ? item.bmi.toFixed(1) : "?"}
            </Text>
          </View>
        </View>

        <View style={commonStyles.cardHeader}>
          <View style={commonStyles.row}>
            <MapPin size={16} color={COLORS.text} />
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
              <CheckCircle2 size={26} color={COLORS.primary} />
            ) : (
              <Circle size={26} color={COLORS.inputBorderColor} />
            )
          ) : (
            <TouchableOpacity
              onPress={() => deletePatient(item.patient_id)}
            >
              <Trash size={18} color={COLORS.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleExport = async () => {
    setExporting(true);
    const url = `${API_URL}/patients/export-multiple/`;
    await exportFolder(
      `${API_URL}/patients/export-multiple/`,
      `patients_export_${selectedPatients.length}.zip`,
      setExporting,
      "POST",
      { patient_ids: selectedPatients }
    );
    ;
    setExporting(false);
  };

  const selectAll = () => {
    if (selectedPatients.length === filteredPatients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(filteredPatients.map((p) => p.patient_id));
    }
  };

  if (deletingId) return <LoadingScreen text="Deleting the patient..." />;
  if (exporting) return <LoadingScreen text="Exporting the folder(s)..." />;
  if (loading) return <LoadingScreen text="Loading data..." />;

  return (
    <View style={commonStyles.container}>
      <View style={[commonStyles.header,  width >=700 && {justifyContent: "center"}]}>
        <Text style={[commonStyles.headerTitle, width >= 700 && {width : 550, }]}>Patients</Text>
            <View style={commonStyles.row}>
              {!exportMode && (
                <TouchableOpacity
                  style={commonStyles.addButton}
                  onPress={() => router.push('/patient/create')}
                >
                  <Plus size={22} color={COLORS.textButton} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[commonStyles.addButton, exportMode && { backgroundColor: COLORS.error, paddingHorizontal: 10, paddingVertical: 10 }]}
                onPress={() => {
                  setExportMode(!exportMode);
                  setSelectedPatients([]);
                }}
              >
                {exportMode ? <X size={20} color={COLORS.textButton} /> : <Download size={20} color={COLORS.textButton} />}
                
              </TouchableOpacity>
            </View>
        </View>

        <FlatList
          data={filteredPatients}
          renderItem={renderPatientItem}
          keyExtractor={(item) => item.patient_id}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={[commonStyles.form,{marginBottom: 40}, width >=700 && {width : 700, alignSelf: "center"}]}
          ListHeaderComponent={
            <>
              <View
                style={[
                  commonStyles.input, 
                  {flexDirection: 'row', 
                    alignItems: 'center', 
                    paddingVertical:2 , 
                    marginTop: 15},
                ]}
              >
                <Search size={20} color={COLORS.primary} style={styles.searchIcon} />
                <TextInput
                  style={[
                    styles.searchInput,
                    { 
                      borderColor: isFocused ? "red" : COLORS.background,
                      ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
                    },
                  ]}
                  placeholder="Search by Patient ID..."
                  placeholderTextColor={COLORS.subtitle}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View style={[commonStyles.row, {marginTop: -10}]}>
                
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
                      style={[commonStyles.input]}
                      textStyle={{ fontSize: 16, color: COLORS.subtitle}}
                      listMode='MODAL'
                      modalContentContainerStyle={{
                        backgroundColor: COLORS.background,
                        paddingVertical: 50,
                        paddingHorizontal: "10%",
                        borderRadius: 16,
                      }}
                      modalTitle="Select side"
                      modalTitleStyle={{
                        fontSize: 20,
                        fontWeight: "bold",
                        color: COLORS.primary,
                        textAlign: "center",
                        marginBottom: 10,
                      }}
                      modalProps={{
                        animationType: "slide",
                        presentationStyle: "pageSheet", 
                      }}
                      listItemContainerStyle={{
                        borderBottomWidth: 1,
                        paddingVertical: 10,
                        borderBottomColor: COLORS.grayLight,
                      }}
                      listItemLabelStyle={{
                        fontSize: 16,
                        color: COLORS.text,
                      }}
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
                      style={[commonStyles.input]}
                      textStyle={{ fontSize: 16, color: COLORS.subtitle }}
                      listMode='MODAL'
                      modalContentContainerStyle={{
                        backgroundColor: COLORS.background,
                        paddingVertical: 50,
                        paddingHorizontal: "10%",
                        borderRadius: 16,
                      }}
                      modalTitle="Select gender"
                      modalTitleStyle={{
                        fontSize: 20,
                        fontWeight: "bold",
                        color: COLORS.primary,
                        textAlign: "center",
                        marginBottom: 10,
                      }}
                      modalProps={{
                        animationType: "slide",
                        presentationStyle: "pageSheet", 
                      }}
                      listItemContainerStyle={{
                        borderBottomWidth: 1,
                        paddingVertical: 10,
                        borderBottomColor: COLORS.grayLight,
                      }}
                      listItemLabelStyle={{
                        fontSize: 16,
                        color: COLORS.text,
                      }}
                    />
                  </View>
                </View>

              <View style={styles.counterContainer}>
                <Text style={styles.counterText}>
                  Patients: {filteredPatients.length}
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={commonStyles.title}>No patients found</Text>
              <Text style={commonStyles.subtitle}>
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
                { backgroundColor: selectedPatients.length ? COLORS.primary : COLORS.grayMedium },
              ]}
              disabled={selectedPatients.length === 0}
            >
              <Download size={18} color={COLORS.textButton} />
              <Text style={[styles.bottomButtonText, { marginLeft: 6, color: COLORS.textButton }]}>
                Export {selectedPatients.length > 0 ? `(${selectedPatients.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 7 : 12,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 20,
  },
  patientInfo: {
    alignItems: 'flex-end',
  },
  patientBody: {
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    color: COLORS.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  exportModeButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 24,
    marginRight: 15,
  },
  exportModeText: { color: COLORS.textButton, fontWeight: '500', marginLeft: 6 },
  counterContainer: {
    alignItems: "flex-end", 
    marginTop : Platform.OS === 'web' ? -5 : 12,
    marginRight: 10,
    marginBottom: 10,
  },

  counterText: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.primary,
    fontStyle : 'italic',
  },
  pickerWrapper: {
    flex: 1,
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.headerBackground,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
    paddingVertical: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
bottomButton: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: COLORS.butonBackground,
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 8,
},
bottomButtonText: {
  color: COLORS.secondary,
  fontWeight: "600",
  fontSize: 15,
},

});