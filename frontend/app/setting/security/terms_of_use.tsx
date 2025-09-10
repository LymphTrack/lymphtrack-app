import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function TermsOfUseScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Use</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to LymphTrack. By using our mobile application, you agree to these Terms of Use. 
          Please read them carefully. If you do not agree, you should stop using the application immediately.
        </Text>

        <Text style={styles.sectionTitle}>2. Purpose of the Application</Text>
        <Text style={styles.paragraph}>
          LymphTrack is designed for healthcare professionals, researchers, and students involved in the monitoring 
          and study of lymphedema. It provides tools for storing, analyzing, and visualizing patient follow-up data 
          in a secure and compliant manner. The application is not intended for direct use by patients.
        </Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          To access the application, you must create an account. You agree to provide accurate and complete 
          information during registration and to keep your login credentials secure. You are responsible for all 
          activities carried out under your account.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Privacy & Security</Text>
        <Text style={styles.paragraph}>
          We take data privacy seriously. All medical data is encrypted at rest and in transit. LymphTrack complies 
          with GDPR (Europe) and HIPAA (USA) requirements. Access to patient data is restricted to authorized users only.
        </Text>

        <Text style={styles.sectionTitle}>5. Medical Disclaimer</Text>
        <Text style={styles.paragraph}>
          LymphTrack is a medical data management tool intended to assist healthcare professionals. It does not 
          replace professional medical judgment, diagnosis, or treatment. Users remain fully responsible for the 
          medical decisions they make.
        </Text>

        <Text style={styles.sectionTitle}>6. Acceptable Use</Text>
        <Text style={styles.paragraph}>
          You agree not to misuse the application, including but not limited to:
          {"\n"}• Attempting to gain unauthorized access
          {"\n"}• Sharing patient data without consent
          {"\n"}• Using the application for non-medical or unlawful purposes
        </Text>

        <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          The content, design, and code of LymphTrack are protected by copyright and intellectual property laws. 
          You may not copy, modify, or distribute any part of the application without prior written consent.
        </Text>

        <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          LymphTrack and its developers are not liable for damages resulting from the use or inability to use 
          the application, including data loss, unauthorized access, or incorrect medical decisions made 
          by users.
        </Text>

        <Text style={styles.sectionTitle}>9. Termination</Text>
        <Text style={styles.paragraph}>
          We reserve the right to suspend or terminate your access to the application if you violate these Terms of Use 
          or engage in unauthorized activities.
        </Text>

        <Text style={styles.sectionTitle}>10. Updates to Terms</Text>
        <Text style={styles.paragraph}>
          These Terms of Use may be updated periodically. Users will be informed of significant changes, and continued 
          use of the application implies acceptance of the updated terms.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Information</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms of Use, please contact us at:
          {"\n"}📧 support@lymphtrack.com
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
