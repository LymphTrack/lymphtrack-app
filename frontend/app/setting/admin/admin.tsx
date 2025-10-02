import { View, Text, StyleSheet, Alert,TouchableOpacity, Platform, ActivityIndicator, FlatList, useWindowDimensions, } from "react-native";
import { Mail, Briefcase, Building, Trash, Plus,ArrowLeft} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback} from 'react';
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from '@/constants/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  institution: string;
  user_type: string;
}

export default function AdminScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {width} = useWindowDimensions();

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/users/`);
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteUser = (id: string) => {
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        "Confirm deletion\n\nAre you sure you want to delete this user?"
      );
      if (confirm) {
        deleteUser(id);
      }
    } else {
      Alert.alert(
        "Confirm deletion",
        "Are you sure you want to delete this user?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteUser(id),
          },
        ]
      );
    }
  };

  const deleteUser = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        if (Platform.OS === "web") {
          window.alert("Error\n\nFailed to delete patient");
        } else {
          Alert.alert("Error", "Failed to delete patient");
        }
      } else {
        if (Platform.OS === "web") {
          window.alert("Success\n\nPatient deleted successfully");
        } else {
          Alert.alert("Success", "Patient deleted successfully");
        }
        loadUsers();
      }
    } catch (err) {
      console.error("Erreur:", err);
      if (Platform.OS === "web") {
        window.alert(
          "Error\n\nUnable to delete patient. Please check your internet connection."
        );
      } else {
        Alert.alert(
          "Error",
          "Unable to delete patient. Please check your internet connection."
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6a90db" />
      </View>
    );
  } 

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      onPress={() => router.push(`../admin/user/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name || "Unnamed User"}</Text>
          </View>

          <View
            style={[
              styles.badge,
              item.user_type === "admin" ? styles.adminBadge : styles.userBadge,
            ]}
          >
            <Text
              style={[
                styles.badge,
                item.user_type === "admin" ? styles.adminBadgeText : styles.userBadgeText,
              ]}
            >
              {item.user_type}
            </Text>
          </View>

          <TouchableOpacity
            disabled={deletingId === item.id}
            onPress={() => confirmDeleteUser(item.id)}
          >
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color="#6a90db" />
            ) : (
              <Trash size={20} color="#6a90db" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.detailRow}>
          <Mail size={16} color="#6B7280" />
          <Text style={styles.userDetail}> {item.email}</Text>
        </View>

        <View style={styles.detailRow}>
          <Briefcase size={16} color="#6B7280" />
          <Text style={styles.userDetail}> {item.role || "N/A"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Building size={16} color="#6B7280" />
          <Text style={styles.userDetail}> {item.institution || "N/A"}</Text>
        </View>
        
      </View>
    </TouchableOpacity>
  );


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View
          style={{
            width: width >= 700 ? 700 : "100%",
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: width >= 700 ? 30 : 10,
            position: "relative",
          }}
        >
          <TouchableOpacity onPress={() => router.push("../../(tabs)/settings")}>
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
            Admin
          </Text>

          <TouchableOpacity
            style={[styles.addButton, { marginLeft: "auto" }]}
            onPress={() => router.push("../admin/user/create_user")}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
   
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContainer, width>=700 && {width : 700, alignSelf: "center"}]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>Add your first user to get started</Text>
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
    paddingHorizontal: 20,
    paddingTop : Platform.OS === 'web' ? 20 : 60,
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
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 20,
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
   userCard: {
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

  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userId: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6a90db',
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  userDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  userBody: {
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6a90db',
  },
  userRole: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: '#fee2e2',
  },
  userBadge: {
    backgroundColor: '#e0f2fe',
  },
  adminBadgeText: {
    color: '#b91c1c',
    fontWeight: '600',
    fontSize: 12,
  },
  userBadgeText: {
    color: '#0369a1',
    fontWeight: '600',
    fontSize: 12,
  },

});
