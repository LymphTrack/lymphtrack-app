import { Platform, View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function TermsOfUseScreen() {
  const router = useRouter();
  const {width} = useWindowDimensions();

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
          <TouchableOpacity onPress={ () => router.back()}>
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
          Terms of Use</Text>
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 20,
    paddingTop : Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#1F2937" },
  content: { padding: 20 },
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
  footer: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 40,
  },
});
