import { useState, useCallback } from "react";
import {View,Text,TouchableOpacity,ScrollView,StyleSheet,useWindowDimensions,} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { useFocusEffect } from "@react-navigation/native";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";
import { API_URL } from "@/constants/api";
import { LoadingScreen } from "@/components/loadingScreen";
import { normalizeVisit } from "@/utils/normalizeVisits";

export default function OutcomesScreen() {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [openPosition, setOpenPosition] = useState(false);
  const [openVisit, setOpenVisit] = useState(false);
  const [openGender, setOpenGender] = useState(false);
  const [openSide, setOpenSide] = useState(false);
  const [positionFilter, setPositionFilter] = useState<string>("");
  const [visitFilter, setVisitFilter] = useState<string>("");
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [sideFilter, setSideFilter] = useState<string>("");
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
    } catch (err) {
      console.error("Error loading visits:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadVisits();
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
                modalProps={{
                  animationType: "slide",
                }}
                modalContentContainerStyle={{
                  flex: 1,
                }}
                scrollViewProps={{
                  nestedScrollEnabled: true,
                }}
              />
            </View>

            <View style={styles.filterRow}>
                <DropDownPicker
                  open={openGender}
                  value={genderFilter}
                  items={genderOptions}
                  setOpen={setOpenGender}
                  setValue={setGenderFilter}
                  placeholder="Select gender"
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    marginBottom: 15,
  },
});
