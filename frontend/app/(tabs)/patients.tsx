import React, { useState, useEffect } from 'react';
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput , ActivityIndicator} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Plus,MapPin, Trash  } from 'lucide-react-native';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();            

  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, [])
  );

  const loadPatients = async () => {
    try {
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
  };

  const deletePatient = async (patient_id: string) => {
    try {
      const res = await fetch(`${API_URL}/patients/${patient_id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        Alert.alert("Error", "Failed to delete patient");
      } else {
        Alert.alert("Success", "Patient deleted successfully");
        loadPatients(); 
      }
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  const [genderFilter, setGenderFilter] = useState<"" | "1" | "2">(""); 
  const [sideFilter, setSideFilter] = useState<"" | "1" | "2" | "3">("");

  const filteredPatients = patients
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

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => router.push(`/patient/${item.patient_id}`)}
    >
      <View style={styles.patientHeader}>
        <Text style={styles.patientId}>ID: {item.patient_id}</Text>
        <View style={styles.patientInfo}>
          <Text style={styles.patientDetail}>
            {item.age != null ? `${item.age}y` : '?'} • {item.gender === 1 ? 'Female' : item.gender === 2 ? 'Male' : '?'}
          </Text>

          <Text style={styles.patientDetail}>
            BMI: {item.bmi != null ? item.bmi.toFixed(1) : '?'}
          </Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MapPin size={16} color="#6B7280" />
          <Text style={styles.locationText}>
            Lymphedema side : {
              item.lymphedema_side === 1
                ? 'Right'
                : item.lymphedema_side === 2
                  ? 'Left'
                  : item.lymphedema_side === 3
                    ? 'Bilateral'
                    : '?'
            }
          </Text>
        </View>

        <TouchableOpacity onPress={() => confirmDeletePatient(item.patient_id)}>
          <Trash size={18} color="#4c54bc" />
        </TouchableOpacity>
      </View>

    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patients</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/patient/create')}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#6a90db" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Patient ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View
        style={{
          marginTop: -5,
          marginBottom: 10,
          zIndex: 1000, 
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 16, marginTop: -5, marginBottom : 10 }}>
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
            />
          </View>
        </View>
      </View>

      <View>
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            Patients: {filteredPatients.length}
          </Text>
        </View>
      </View>
    
      <FlatList
        data={filteredPatients}
        renderItem={renderPatientItem}
        keyExtractor={(item) => item.patient_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No patients found</Text>
            <Text style={styles.emptySubtext}>Add your first patient to get started</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
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
    marginHorizontal: 20,
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
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
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
    marginTop : 12,
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
    minHeight: 45, 
  },
  dropdownContainer: {
    borderColor: "#E5E7EB",
    minHeight: 45, 
  },
});