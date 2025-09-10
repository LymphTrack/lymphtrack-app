import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          LymphTrack values your privacy and is committed to protecting personal and medical data. 
          This Privacy Policy explains what information we collect, how we use it, and how we safeguard it.
        </Text>

        <Text style={styles.sectionTitle}>2. Data We Collect</Text>
        <Text style={styles.paragraph}>
          • User account information (name, email, institution, role){"\n"}
          • Patient follow-up records (age, sex, BMI, lymphedema details, surgery date, follow-up milestones){"\n"}
          • Technical data such as device type, operating system, and app usage logs
        </Text>

        <Text style={styles.sectionTitle}>3. Purpose of Data Collection</Text>
        <Text style={styles.paragraph}>
          We collect data to:{"\n"}
          • Provide a secure platform for medical data management{"\n"}
          • Facilitate clinical follow-up of lymphedema patients{"\n"}
          • Support research and improve medical knowledge{"\n"}
          • Ensure compliance with legal and ethical standards
        </Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.paragraph}>
          All patient data is encrypted at rest and in transit (AES-256 / TLS). 
          Access is restricted to authorized users only. 
          We follow HIPAA (USA) and GDPR (Europe) guidelines to ensure confidentiality and integrity of data.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Sharing</Text>
        <Text style={styles.paragraph}>
          LymphTrack does not sell or rent your data. 
          Data may be shared only:{"\n"}
          • With authorized healthcare professionals linked to a patient{"\n"}
          • When legally required (court orders, legal investigations){"\n"}
          • For anonymized research purposes, with explicit consent
        </Text>

        <Text style={styles.sectionTitle}>6. User Rights</Text>
        <Text style={styles.paragraph}>
          Under GDPR and HIPAA, you have the right to:{"\n"}
          • Access your personal data{"\n"}
          • Request correction of inaccurate data{"\n"}
          • Request deletion of data{"\n"}
          • Export your data in a readable format{"\n"}
          • Withdraw consent for data processing
        </Text>

        <Text style={styles.sectionTitle}>7. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain medical data only as long as necessary for clinical or research purposes, or as required by law. 
          Users can request deletion of their account and associated data at any time.
        </Text>

        <Text style={styles.sectionTitle}>8. Cookies & Analytics</Text>
        <Text style={styles.paragraph}>
          LymphTrack may use technical tools (analytics, performance monitoring) to improve the app. 
          We do not use advertising cookies or tracking for commercial purposes.
        </Text>

        <Text style={styles.sectionTitle}>9. Updates to Policy</Text>
        <Text style={styles.paragraph}>
          This Privacy Policy may be updated periodically. Users will be informed of significant changes. 
          Continued use of the app implies acceptance of the updated policy.
        </Text>

        <Text style={styles.sectionTitle}>10. Contact Information</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy, please contact us at:{"\n"}
          📧 support@lymphtrack.com
        </Text>

        <Text style={styles.footer}>Last updated: August 28, 2025</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
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
