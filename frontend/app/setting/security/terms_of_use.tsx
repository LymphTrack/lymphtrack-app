import { Platform, View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";

export default function TermsOfUseScreen() {
  const router = useRouter();
  const {width} = useWindowDimensions();

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.secondaryHeader}>
        <View
          style={{
            width: width >= 700 ? 700 : "100%",
             alignSelf: "center",
            flexDirection: "row",
            paddingHorizontal: width >= 700 ? 30 : 10,
            position: "relative",
          }}
        >
          <TouchableOpacity onPress={ () => router.back()}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text
            pointerEvents="none"
            style={commonStyles.secondaryHeaderTitle}
          >
          Terms of use</Text>
        </View>
      </View>

      <ScrollView style={[styles.content, width >= 700 && {width : 700, alignSelf:"center"}]} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>1. First paragraph</Text>
        <Text style={styles.paragraph}>
          Notes
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { 
    padding: 20 
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
    marginBottom: 8,
  },
});
