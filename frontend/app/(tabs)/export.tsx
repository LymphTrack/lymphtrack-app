import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, Download, CheckCircle2, Circle } from "lucide-react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { API_URL } from "@/constants/api";

interface Patient {
  patient_id: string;
  age: number;
  gender: number;
  bmi: number;
  lymphedema_side: number;
}

export default function ExportScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"" | "1" | "2">("");
  const [sideFilter, setSideFilter] = useState<"" | "1" | "2" | "3">("");
  const [openGender, setOpenGender] = useState(false);
  const [openSide, setOpenSide] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Charger les patients
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/patients/`);
      if (!res.ok) throw new Error("Failed to fetch patients");
      const data = await res.json();
      setPatients(data || []);
    } catch (err) {
      console.error("Error loading patients:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedPatients((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedPatients.length === filteredPatients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(filteredPatients.map((p) => p.patient_id));
    }
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

  const handleExport = () => {
    console.log("Exporting patients:", selectedPatients);
    // Backend export to be added later
  };

  const renderPatientItem = ({ item }: { item: Patient }) => {
    const selected = selectedPatients.includes(item.patient_id);
    return (
      <TouchableOpacity
        style={[
          styles.patientCard,
          selected && { backgroundColor: "#E5EDFF", borderColor: "#6a90db" },
        ]}
        onPress={() => toggleSelection(item.patient_id)}
      >
        <View style={styles.patientRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientId}>{item.patient_id}</Text>
            <Text style={styles.patientDetails}>
              {item.age ?? "?"}y •{" "}
              {item.gender === 1
                ? "Female"
                : item.gender === 2
                ? "Male"
                : "?"}
            </Text>
            <Text style={styles.patientDetails}>
              BMI: {item.bmi?.toFixed(1) ?? "?"} |{" "}
              {item.lymphedema_side === 1
                ? "Right"
                : item.lymphedema_side === 2
                ? "Left"
                : item.lymphedema_side === 3
                ? "Bilateral"
                : "?"}
            </Text>
          </View>
          <View style={{ justifyContent: "center" }}>
            {selected ? (
              <CheckCircle2 size={28} color="#6a90db" />
            ) : (
              <Circle size={28} color="#D1D5DB" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a90db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View
          style={{
            width: width >= 700 ? 700 : "100%",
            alignSelf: width >= 700 ? "center" : "stretch",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: width >= 700 ? 30 : 10,
          }}
        >
          <Text style={styles.headerTitle}>Export</Text>
          <TouchableOpacity
            style={[
              styles.exportButton,
              { opacity: selectedPatients.length ? 1 : 0.5 },
            ]}
            disabled={selectedPatients.length === 0}
            onPress={handleExport}
          >
            <Download size={20} color="#FFF" />
            <Text style={styles.exportText}>
              Export {selectedPatients.length > 0 ? `(${selectedPatients.length})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LISTE avec barre de recherche et filtres */}
      <FlatList
        data={filteredPatients}
        renderItem={renderPatientItem}
        keyExtractor={(item) => item.patient_id}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={[
          styles.listContainer,
          width >= 700 && { width: 700, alignSelf: "center" },
        ]}
        ListHeaderComponent={
          <>
            {/* BARRE DE RECHERCHE */}
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
                style={styles.searchInput}
                placeholder="Search by Patient ID..."
                placeholderTextColor="gray"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* FILTRES */}
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
                    items={[
                      { label: "All sides", value: "" },
                      { label: "Right", value: "1" },
                      { label: "Left", value: "2" },
                      { label: "Bilateral", value: "3" },
                    ]}
                    setOpen={setOpenSide}
                    setValue={(callback) => {
                      const val = callback(sideFilter);
                      setSideFilter(val);
                    }}
                    setItems={() => {}}
                    placeholder="All sides"
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    textStyle={{ fontSize: 16, color: "gray" }}
                    listMode="MODAL"
                  />
                </View>

                <View style={styles.pickerWrapper}>
                  <DropDownPicker
                    open={openGender}
                    value={genderFilter}
                    items={[
                      { label: "All genders", value: "" },
                      { label: "Female", value: "1" },
                      { label: "Male", value: "2" },
                    ]}
                    setOpen={setOpenGender}
                    setValue={(callback) => {
                      const val = callback(genderFilter);
                      setGenderFilter(val);
                    }}
                    setItems={() => {}}
                    placeholder="All genders"
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    textStyle={{ fontSize: 16, color: "gray" }}
                    listMode="MODAL"
                  />
                </View>
              </View>
            </View>

            <View
              style={[
                styles.selectAllContainer,
                width >= 700 && { width: 675, alignSelf: "center" },
              ]}
            >
              <TouchableOpacity onPress={selectAll} style={styles.selectAllButton}>
                <Text style={styles.selectAllText}>
                  {selectedPatients.length === filteredPatients.length
                    ? "Deselect all"
                    : "Select all"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.counterText}>
                {selectedPatients.length}/{filteredPatients.length} selected
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No patients found</Text>
          </View>
        }
      />
    </View>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 10,
    paddingTop: Platform.OS === "web" ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: "#1F2937" },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6a90db",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exportText: { color: "#FFF", marginLeft: 8, fontWeight: "500" },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20, marginTop: 20 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === "web" ? 7 : 12,
    fontSize: 16,
    color: "black",
  },
  pickerWrapper: { flex: 1, marginHorizontal: 5 },
  dropdown: {
    borderColor: "#E5E7EB",
    borderRadius: 12,
    minHeight: Platform.OS === "web" ? 35 : 45,
  },
  dropdownContainer: {
    borderColor: "#E5E7EB",
    minHeight: Platform.OS === "web" ? 35 : 45,
  },
  patientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  patientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  patientId: { fontSize: 18, fontWeight: "600", color: "#6a90db" },
  patientDetails: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  selectAllContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  selectAllButton: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectAllText: { color: "#4c54bc", fontWeight: "600" },
  counterText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6a90db",
    fontStyle: "italic",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", marginTop: 40 },
  emptyText: { fontSize: 16, color: "#9CA3AF" },
});
