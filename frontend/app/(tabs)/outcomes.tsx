import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { supabase } from "@/lib/supabase";

export default function OutcomesScreen() {
  const { width } = useWindowDimensions();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAIL = "simon.pimprenelle@gmail.com";

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error || !user) {
          setIsAuthorized(false);
        } else {
          setIsAuthorized(user.email === ADMIN_EMAIL);
        }
      } catch (e) {
        console.error("Error verifying user:", e);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4c54bc" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <View style={styles.container}>
        <View
          style={[styles.header, width >= 700 && { justifyContent: "center" }]}
        >
          <Text
            style={[styles.headerTitle, width >= 700 && { width: 700 }]}
          >
            Outcomes
          </Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.constructionIcon}>🚧</Text>
          <Text style={styles.constructionText}>
            This page is under construction
          </Text>
        </View>
      </View>
    );
  }

  // 👉 Contenu réel (réservé à toi)
  return (
    <View style={styles.container}>
      <View
        style={[styles.header, width >= 700 && { justifyContent: "center" }]}
      >
        <Text style={[styles.headerTitle, width >= 700 && { width: 700 }]}>
          Outcomes
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator
      >
        <View style={[styles.realContent, width >= 700 && { alignSelf: "center", width: 700 }]}>
          <Text style={styles.title}>ML Model Outcomes</Text>
          <Text style={styles.subtitle}>
            Overview of the machine learning models developed for lymphedema
            detection and classification.
          </Text>

          {/* === STEP 1 – DETECTION === */}
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>
              Step 1 — Detection (Healthy vs Lymphedema)
            </Text>
            <Text style={styles.stepSubtitle}>
              Model comparison for binary classification (presence of lymphedema).
            </Text>

            {/* Tableau comparatif */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colHeader}>Model</Text>
                <Text style={styles.colHeader}>F1</Text>
                <Text style={styles.colHeader}>AUC</Text>
                <Text style={styles.colHeader}>Accuracy</Text>
              </View>
              {[
                { model: "AdaBoost", f1: 0.92, auc: 0.96, acc: 0.89 },
                { model: "Gradient Boosting", f1: 0.89, auc: 0.95, acc: 0.86 },
                { model: "Random Forest", f1: 0.90, auc: 0.91, acc: 0.86 },
              ].map((m, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.cell}>{m.model}</Text>
                  <Text style={styles.cell}>{m.f1}</Text>
                  <Text style={styles.cell}>{m.auc}</Text>
                  <Text style={styles.cell}>{m.acc}</Text>
                </View>
              ))}
            </View>

            {/* ROC Placeholder */}
            <View style={styles.graphBox}>
              <Text style={styles.graphPlaceholder}>ROC Curve (placeholder)</Text>
            </View>

            {/* Confusion matrix Placeholder */}
            <View style={styles.graphBox}>
              <Text style={styles.graphPlaceholder}>Confusion Matrix (AdaBoost)</Text>
            </View>
          </View>

          {/* === STEP 2 – SIDE IDENTIFICATION === */}
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>
              Step 2 — Lateral Classification (Right vs Left)
            </Text>
            <Text style={styles.stepSubtitle}>
              Predicting the affected side in lymphedema patients.
            </Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colHeader}>Model</Text>
                <Text style={styles.colHeader}>F1</Text>
                <Text style={styles.colHeader}>AUC</Text>
                <Text style={styles.colHeader}>Accuracy</Text>
              </View>
              {[
                { model: "Gradient Boosting", f1: 0.77, auc: 0.76, acc: 0.84 },
                { model: "Random Forest", f1: 0.71, auc: 0.66, acc: 0.79 },
                { model: "AdaBoost", f1: 0.67, auc: 0.82, acc: 0.79 },
              ].map((m, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.cell}>{m.model}</Text>
                  <Text style={styles.cell}>{m.f1}</Text>
                  <Text style={styles.cell}>{m.auc}</Text>
                  <Text style={styles.cell}>{m.acc}</Text>
                </View>
              ))}
            </View>

            <View style={styles.graphBox}>
              <Text style={styles.graphPlaceholder}>ROC Curve (Step 2)</Text>
            </View>

            <View style={styles.graphBox}>
              <Text style={styles.graphPlaceholder}>
                Confusion Matrix / Feature Importance
              </Text>
            </View>
          </View>

          {/* === STEP 3 – CLUSTERING === */}
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>
              Step 3 — Clustering (Anderson Stages)
            </Text>
            <Text style={styles.stepSubtitle}>
              Unsupervised clustering of patients by severity/stage using K-Means (PCA visualization).
            </Text>

            <View style={styles.graphBox}>
              <Text style={styles.graphPlaceholder}>PCA Scatter Plot (4 clusters)</Text>
            </View>

            <View style={styles.graphBox}>
              <Text style={styles.graphPlaceholder}>
                Cluster vs Operation Stage Distribution
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  constructionIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  constructionText: {
    fontSize: 18,
    color: "#6B7280",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  realContent: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6a90db",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  stepSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6a90db",
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  table: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 6,
  },
  colHeader: {
    flex: 1,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  tableRow: { flexDirection: "row", paddingVertical: 6 },
  cell: {
    flex: 1,
    color: "#1F2937",
    textAlign: "center",
  },
  graphBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  graphPlaceholder: {
    fontSize: 16,
    color: "#6B7280",
    fontStyle: "italic",
  },
});
