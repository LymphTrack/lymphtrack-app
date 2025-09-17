import { View, Text, StyleSheet } from "react-native";
import { useRouter } from 'expo-router';

export default function OutcomesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.constructionIcon}>🚧</Text>
        <Text style={styles.constructionText}>This page is under construction</Text>
      </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  constructionIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  constructionText: {
    fontSize: 18,
    color: '#6B7280',
  },
});
