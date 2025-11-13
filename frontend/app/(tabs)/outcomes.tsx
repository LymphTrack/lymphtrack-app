import { useState, useCallback } from "react";
import {View,Text,TouchableOpacity,ScrollView,StyleSheet,useWindowDimensions,} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { useFocusEffect } from "@react-navigation/native";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { API_URL } from "@/constants/api";
import { LoadingScreen } from "@/components/loadingScreen";
import { showAlert } from "@/utils/alertUtils";
import { normalizeVisit } from "@/utils/normalizeVisits";

export default function OutcomesScreen() {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"position" | "visits" | "groups">("position");
  const [openPosition, setOpenPosition] = useState(false);
  const [openVisit, setOpenVisit] = useState(false);
  const [openGender, setOpenGender] = useState(false);
  const [openSide, setOpenSide] = useState(false);
  const [openSurgery, setOpenSurgery] = useState(false);
  const [positionFilter, setPositionFilter] = useState<string>("");
  const [visitFilter, setVisitFilter] = useState<string>("");
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [sideFilter, setSideFilter] = useState<string>("");
  const [surgeryFilter, setSurgeryFilter] = useState<string>("");
  const [visitOptions, setVisitOptions] = useState<{label: string, value: string}[]>([]);

  const positionOptions = Array.from({ length: 6 }).map((_, i) => ({
    label: `Position ${i + 1}`,
    value: `${i + 1}`,
  }));

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

  const surgeryOptions = [
    { label: "All", value: "" },
    { label: "LVA", value: "LVA" },
    { label: "LNT", value: "LNT" },
  ];

  const loadComparison = async () => {
    try {
      setLoading(true);

      let url = `${API_URL}/results/outcomes?mode=${mode}`;
      if (positionFilter) url += `&position=${positionFilter}`;
      if (visitFilter) url += `&visit=${visitFilter}`;
      if (genderFilter) url += `&gender=${genderFilter}`;
      if (sideFilter) url += `&side=${sideFilter}`;
      if (surgeryFilter) url += `&surgery=${surgeryFilter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load outcomes");

      const json = await res.json();
    } catch (err) {
      console.error(err);
      showAlert("Error", "Unable to load comparison data.");
    } finally {
      setLoading(false);
    }
  };

  const loadVisits = async () => {
    try {
      const res = await fetch(`${API_URL}/operations/utils/unique-names`);
      if (!res.ok) throw new Error("Failed to load operation names");

      const data: string[] = await res.json();

      const normalized = [...new Set(data.map((raw) => normalizeVisit(raw)))];

      const options = normalized.map((value) => ({
        label: value.replace(/_/g, " ").toUpperCase(),
        value,
      }));

      setVisitOptions(options);
    } catch (err) {
      console.error("Error loading visits:", err);
    }
  };


  useFocusEffect(
    useCallback(() => {
      loadVisits();
      loadComparison();
    }, [mode, positionFilter, visitFilter, genderFilter, sideFilter, surgeryFilter])
  );

  const ModeButton = ({ label, value}: any) => (
    <TouchableOpacity
      style={[
        styles.modeButton,
        mode === value && { backgroundColor: COLORS.primary },
      ]}
      onPress={() => setMode(value)}
    >
      <Text
        style={[
          styles.modeButtonText,
          mode === value && { color: COLORS.textButton },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
          <View style={[commonStyles.row, { justifyContent: "center", marginTop : 25, marginBottom: 10 }]}>
            <ModeButton label="Position" value="position" />
            <ModeButton label="Visits" value="visits" />
            <ModeButton label="Groups" value="groups" />
          </View>

          {mode === "position" && (
            <>
            <View style={styles.filterRow}>
              <DropDownPicker
                open={openPosition}
                value={positionFilter}
                items={positionOptions}
                setOpen={setOpenPosition}
                setValue={setPositionFilter}
                placeholder="Select position"
                style={commonStyles.input}
                listMode="MODAL"
              />
            </View>

            <View style={styles.filterRow}>
              <DropDownPicker
                open={openVisit}
                value={visitFilter}
                items={visitOptions}
                setOpen={setOpenVisit}
                setValue={setVisitFilter}
                placeholder="Select visit"
                style={commonStyles.input}
                listMode="MODAL"
              />
            </View>
            </>
          )}

          {mode === "visits" && (
            <View style={styles.filterRow}>
              <DropDownPicker
                open={openVisit}
                value={visitFilter}
                items={visitOptions}
                setOpen={setOpenVisit}
                setValue={setVisitFilter}
                placeholder="Select visit"
                style={commonStyles.input}
                listMode="MODAL"
              />
            </View>
          )}

          {mode === "groups" && (
            <>
              <View style={styles.filterRow}>
                <DropDownPicker
                  open={openGender}
                  value={genderFilter}
                  items={genderOptions}
                  setOpen={setOpenGender}
                  setValue={setGenderFilter}
                  placeholder="Gender"
                  style={commonStyles.input}
                  listMode="MODAL"
                />
              </View>

              <View style={styles.filterRow}>
                <DropDownPicker
                  open={openSide}
                  value={sideFilter}
                  items={sideOptions}
                  setOpen={setOpenSide}
                  setValue={setSideFilter}
                  placeholder="Side"
                  style={commonStyles.input}
                  listMode="MODAL"
                />
              </View>

              <View style={styles.filterRow}>
                <DropDownPicker
                  open={openSurgery}
                  value={surgeryFilter}
                  items={surgeryOptions}
                  setOpen={setOpenSurgery}
                  setValue={setSurgeryFilter}
                  placeholder="Surgery"
                  style={commonStyles.input}
                  listMode="MODAL"
                />
              </View>
            </>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.grayMedium,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 6,
  },
  modeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  filterRow: {
    marginBottom: 15,
  },
});
