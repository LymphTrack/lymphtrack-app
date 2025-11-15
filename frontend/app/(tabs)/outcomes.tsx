import { useState, useCallback } from "react";
import {View,Text,FlatList,TouchableOpacity,ScrollView,StyleSheet,useWindowDimensions,} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { useFocusEffect } from "@react-navigation/native";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { API_URL } from "@/constants/api";
import { LoadingScreen } from "@/components/loadingScreen";
import { normalizeVisit } from "@/utils/normalizeVisits";
import { showAlert } from "@/utils/alertUtils";
import { CheckCircle2, Circle } from "lucide-react-native";

interface Patient {
  patient_id: string;
  age: number;
  gender: number;
  bmi: number;
  lymphedema_side: number;
  notes : string | null;
}

export default function OutcomesScreen() {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [openPosition, setOpenPosition] = useState(false);
  const [openVisit, setOpenVisit] = useState(false);
  const [openGender, setOpenGender] = useState(false);
  const [openSide, setOpenSide] = useState(false);
  const [openAge, setOpenAge] = useState(false);
  const [openBMI, setOpenBMI] = useState(false);
  const [ageFilter, setAgeFilter] = useState("");
  const [bmiFilter, setBMIFilter] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [positionFilter, setPositionFilter] = useState<string>("");
  const [visitFilter, setVisitFilter] = useState<string>("");
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [sideFilter, setSideFilter] = useState<string>("");
  const [visitOptions, setVisitOptions] = useState<{label: string, value: string}[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);

  const positionOptions = [
    { label: "All positions", value: "" },
    ...Array.from({ length: 6 }).map((_, i) => ({
      label: `Position ${i + 1}`,
      value: `${i + 1}`,
    })),
  ];

  const genderOptions = [
    { label: "All gender", value: "" },
    { label: "Female", value: "1" },
    { label: "Male", value: "2" },
  ];

  const sideOptions = [
    { label: "All sides", value: "" },
    { label: "Right", value: "1" },
    { label: "Left", value: "2" },
    { label: "Bilateral", value: "3" },
  ];

  const ageOptions = [
    { label: "All ages", value: "" },
    { label: "0 - 20", value: "0-20" },
    { label: "20 - 40", value: "20-40" },
    { label: "40 - 60", value: "40-60" },
    { label: "60 - 100", value: "60-100" },
  ];

  const bmiOptions = [
    { label: "All BMI", value: "" },
    { label: "< 20", value: "<20" },
    { label: "20 - 25", value: "20-25" },
    { label: "25 - 30", value: "25-30" },
    { label: "> 30", value: ">30" },
  ];

  function sortVisits(a: { value: string }, b: { value: string }) {
    const order = (v: string) => {
      if (v === "pre_op") return 1;
      if (v === "post_op") return 2;
      if (v.endsWith("d") && !v.includes("after")) return 3;
      if (v.endsWith("m") && !v.includes("after")) return 4;
      if (v.endsWith("y") && !v.includes("after")) return 5;
      if (v.startsWith("pre_op_")) return 6;
      if (v.startsWith("post_op_") && !v.includes("after")) return 7;
      if (v.includes("after_op2")) return 8;
      return 9;
    };

    const oa = order(a.value);
    const ob = order(b.value);

    if (oa !== ob) return oa - ob;

    const na = parseInt(a.value);
    const nb = parseInt(b.value);

    if (!isNaN(na) && !isNaN(nb)) return na - nb;

    return a.value.localeCompare(b.value);
  }

  const loadVisits = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/operations/utils/unique-names`);
      if (!res.ok) throw new Error("Failed to load operation names");

      const data: string[] = await res.json();

      const normalized = data.map((raw) => normalizeVisit(raw));

      const uniqueMap = new Map();
      normalized.forEach((item) => {
        if (!uniqueMap.has(item.value)) {
          uniqueMap.set(item.value, item);
        }
      });
      const unique = Array.from(uniqueMap.values());

      unique.sort(sortVisits);

      setVisitOptions(unique);
      setLoading(false);
    } catch (err) {
      console.error("Error loading visits:", err);
      setLoading(false);
    }
  };

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

  const filteredPatients = patients
    .filter(p => !genderFilter || p.gender === parseInt(genderFilter))
    .filter(p => !sideFilter || p.lymphedema_side === parseInt(sideFilter))
    .filter(p => {
      if (!ageFilter) return true;
      const [min, max] = ageFilter.split("-").map(Number);
      return p.age >= min && p.age <= max;
    })
    .filter(p => {
      if (!bmiFilter) return true;
      if (bmiFilter === "<20") return p.bmi < 20;
      if (bmiFilter === ">30") return p.bmi > 30;
      const [min, max] = bmiFilter.split("-").map(Number);
      return p.bmi >= min && p.bmi <= max;
    })

  const toggleSelect = (id: string) => {
    setSelectedPatients(prev => {
      const already = prev.includes(id);

      if (already) {
        return prev.filter(p => p !== id);
      }

      if (prev.length >= 10) {
        showAlert("Limit reached", "You can select a maximum of 10 patients.");
        return prev; 
      }

      return [...prev, id];
    });
  };

  const deselectAll = () => {
    if (selectedPatients.length > 0) {
      setSelectedPatients([]);
    } 
  };

  useFocusEffect(
    useCallback(() => {
      loadVisits();
      loadPatients();
    }, [positionFilter, visitFilter, genderFilter, sideFilter])
  );

  if (loading) return <LoadingScreen text="Loading outcomes..." />;

  return (
    <View style={commonStyles.container}>
      <View style={[commonStyles.header, width >= 700 && { justifyContent: "center" }]}>
        <Text style={[commonStyles.headerTitle, width >= 700 && { width: 700 }]}>
          Outcomes
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[commonStyles.form, width >= 700 && { width: 700, alignSelf: "center" }]}>
          <View style={[styles.filterRow, {marginTop : 20}]}>
            <DropDownPicker
              open={openPosition}
              value={positionFilter}
              items={positionOptions}
              setOpen={setOpenPosition}
              setValue={setPositionFilter}
              placeholder="Select position"
              style={commonStyles.input}
              listMode="MODAL"
              modalContentContainerStyle={{
                backgroundColor: COLORS.background,
                paddingVertical: 50,
                paddingHorizontal: "10%",
              }}
              modalTitle="Select position"
              modalTitleStyle={{
                fontSize: 20,
                fontWeight: "bold",
                color: COLORS.text,
                textAlign: "center",
                marginBottom: 10,
              }}
              listItemContainerStyle={{
                borderBottomWidth: 1,
                paddingVertical: 10,
                borderBottomColor: COLORS.grayLight,
              }}
            />

            <DropDownPicker
              open={openVisit}
              value={visitFilter}
              items={visitOptions}
              setOpen={setOpenVisit}
              setValue={setVisitFilter}
              placeholder="Select visit"
              style={commonStyles.input}
              listMode="MODAL"
              modalProps={{
                animationType: "slide",
              }}
              scrollViewProps={{
                nestedScrollEnabled: true,
              }}
              modalContentContainerStyle={{
                backgroundColor: COLORS.background,
                paddingVertical: 50,
                paddingHorizontal: "10%",
                flex: 1,
              }}
              modalTitle="Select visit"
              modalTitleStyle={{
                fontSize: 20,
                fontWeight: "bold",
                color: COLORS.text,
                textAlign: "center",
                marginBottom: 10,
              }}
              listItemContainerStyle={{
                borderBottomWidth: 1,
                paddingVertical: 10,
                borderBottomColor: COLORS.grayLight,
              }}
            />
          </View>
          
          <View style={[styles.filterRow, {width : "24.1%"}]}>
            <DropDownPicker
              open={openGender}
              value={genderFilter}
              items={genderOptions}
              setOpen={setOpenGender}
              setValue={setGenderFilter}
              placeholder="Select gender"
              style={[commonStyles.input, {
                height: 38,
                minHeight: 38,
                paddingVertical: 0,
                borderRadius: 16,
              }]}
              listMode="MODAL"
              modalContentContainerStyle={{
                backgroundColor: COLORS.background,
                paddingVertical: 50,
                paddingHorizontal: "10%",
              }}
              modalTitle="Select gender"
              modalTitleStyle={{
                fontSize: 20,
                fontWeight: "bold",
                color: COLORS.text,
                textAlign: "center",
                marginBottom: 10,
              }}
              listItemContainerStyle={{
                borderBottomWidth: 1,
                paddingVertical: 10,
                borderBottomColor: COLORS.grayLight,
              }}
            />
            
            <DropDownPicker
              open={openSide}
              value={sideFilter}
              items={sideOptions}
              setOpen={setOpenSide}
              setValue={setSideFilter}
              style={[commonStyles.input, {
                height: 38,
                minHeight: 38,
                paddingVertical: 0,
                borderRadius: 16,
              }]}
              listMode="MODAL"
              modalContentContainerStyle={{
                backgroundColor: COLORS.background,
                paddingVertical: 50,
                paddingHorizontal: "10%",
              }}
              modalTitle="Select side"
              modalTitleStyle={{
                fontSize: 20,
                fontWeight: "bold",
                color: COLORS.text,
                textAlign: "center",
                marginBottom: 10,
              }}
              listItemContainerStyle={{
                borderBottomWidth: 1,
                paddingVertical: 10,
                borderBottomColor: COLORS.grayLight,
              }}
            />
            
            <DropDownPicker
              open={openAge}
              value={ageFilter}
              items={ageOptions}
              setOpen={setOpenAge}
              setValue={setAgeFilter}
              placeholder="Select age range"
              style={[commonStyles.input, {
                height: 38,
                minHeight: 38,
                paddingVertical: 0,
                borderRadius: 16,
              }]}
              listMode="MODAL"
              modalContentContainerStyle={{
                backgroundColor: COLORS.background,
                paddingVertical: 50,
                paddingHorizontal: "10%",
              }}
              modalTitle="Select age range"
              modalTitleStyle={{
                fontSize: 20,
                fontWeight: "bold",
                color: COLORS.text,
                textAlign: "center",
                marginBottom: 10,
              }}
              listItemContainerStyle={{
                borderBottomWidth: 1,
                paddingVertical: 10,
                borderBottomColor: COLORS.grayLight,
              }}
            />

            <DropDownPicker
              open={openBMI}
              value={bmiFilter}
              items={bmiOptions}
              setOpen={setOpenBMI}
              setValue={setBMIFilter}
              placeholder="Select BMI range"
              style={[commonStyles.input, {
                height: 38,
                minHeight: 38,
                paddingVertical: 0,
                borderRadius: 16,
              }]}
              listMode="MODAL"
              modalContentContainerStyle={{
                backgroundColor: COLORS.background,
                paddingVertical: 50,
                paddingHorizontal: "10%",
              }}
              modalTitle="Select BMI range"
              modalTitleStyle={{
                fontSize: 20,
                fontWeight: "bold",
                color: COLORS.text,
                textAlign: "center",
                marginBottom: 10,
              }}
              listItemContainerStyle={{
                borderBottomWidth: 1,
                paddingVertical: 10,
                borderBottomColor: COLORS.grayLight,
              }}
            />
          </View>
          <View style={styles.containerPatientCount}>
            <Text style={styles.containerPatientCountText}>
              Patients: {filteredPatients.length}
              {selectedPatients.length > 0 && 
                `   •   Selected: ${selectedPatients.length} / 10`
              }
            </Text>
          </View>

          <FlatList
            data={filteredPatients}
            keyExtractor={(item) => item.patient_id}
            contentContainerStyle={{ marginTop: 20, paddingBottom: 50 }}
            renderItem={({ item }) => {
              const isSelected = selectedPatients.includes(item.patient_id);

              return (
                <View style={[commonStyles.card, { flexDirection: "row", alignItems: "center" }]}>
                  
                  <TouchableOpacity
                    onPress={() => toggleSelect(item.patient_id)}
                    style={{ marginRight: 12 }}
                  >
                    {isSelected ? (
                      <CheckCircle2 size={26} color={COLORS.primary} />
                    ) : (
                      <Circle size={26} color={COLORS.inputBorderColor} />
                    )}
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.title, { color: COLORS.primary }]}>
                      ID: {item.patient_id}
                    </Text>

                    <Text style={commonStyles.subtitle}>
                      Age: {item.age ?? "?"} • 
                      BMI: {item.bmi != null ? item.bmi.toFixed(1) : "?"} • {item.gender === 1 ? "Female" : "Male"}
                    </Text>
                  </View>

                </View>
              );
            }}

          />
        </View>
      </ScrollView>
          {selectedPatients.length > 0 && (
              <View style={styles.showResultContainer}>
                <TouchableOpacity style={[commonStyles.button,{width : 150}]}>
                  <Text style={commonStyles.buttonText}>Show results</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={deselectAll}
                  style={[
                    commonStyles.button,
                    {
                      width : 150,
                  }]}     
                >
                  <Text style={commonStyles.buttonText}>Deselect All</Text>
                </TouchableOpacity>
              </View>
          )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    marginBottom: -5,
    flexDirection:"row", 
    gap : 10, 
    width : "50%"
  },
  containerPatientCount : {
    alignItems: "flex-end", 
    marginRight: 10,
  },
  containerPatientCountText : {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.primary,
    fontStyle : 'italic',
  },
  showResultContainer :{
    flexDirection:"row",
    gap : 15,
    backgroundColor:"white",
    width:"100%", 
    paddingBottom: 15,
    justifyContent:"center", 
    alignSelf:"center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  filterColumn : {
    flexDirection:"column",
    minWidth : 200,
    marginRight : 25,
    width : "30%",
    maxWidth : 300,
  },
});
