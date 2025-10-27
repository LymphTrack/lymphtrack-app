import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, useWindowDimensions, } from "react-native";
import { Mail, Briefcase, Building, Trash, Plus,ArrowLeft} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback} from 'react';
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from '@/constants/api';
import { LoadingScreen } from "@/components/loadingScreen";
import { showAlert, confirmAction } from "@/utils/alertUtils";
import { commonStyles } from "@/constants/styles";
import { COLORS } from "@/constants/colors";

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
  const {width} = useWindowDimensions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
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
      console.error("Error loading users:", error);
      showAlert("Error", "Unable to load users. Please check your internet connection or try again later.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteUser = async (id: string) => {
    const confirmed = await confirmAction(
      "Confirm deletion",
      "Are you sure you want to delete this user?",
      "Delete",
      "Cancel"
    );

    if (confirmed) {
      await deleteUser(id);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      setDeletingId(id);

      const res = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        showAlert("Error", "Failed to delete user");
      } else {
        showAlert("Success", "User deleted successfully");
        loadUsers();
      }
    } catch (err) {
      console.error("Error:", err);
      showAlert("Error","Unable to delete user. Please check your internet connection.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <LoadingScreen text="Loading ..." />; 

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      onPress={() => router.push(`../admin/user/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={commonStyles.card}>
        <View style={styles.userHeader}>
          <View style={{flexDirection:"row", gap: 15}}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name || "Unnamed User"}</Text>
            </View>
              <Text
                style={[
                  styles.badgeText,
                  { color: item.user_type === "admin" ? COLORS.darkRed : COLORS.darkGreen },
                ]}
              >
                ({item.user_type})
              </Text>
          </View>
          <TouchableOpacity
            disabled={deletingId === item.id}
            onPress={() => confirmDeleteUser(item.id)}
          >
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Trash size={20} color={COLORS.primary}  />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.detailRow}>
          <Mail size={16} color={COLORS.text}  />
          <Text style={commonStyles.subtitle}> {item.email}</Text>
        </View>

        <View style={styles.detailRow}>
          <Briefcase size={16} color={COLORS.text} />
          <Text style={commonStyles.subtitle}> {item.role || "N/A"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Building size={16} color={COLORS.text} />
          <Text style={commonStyles.subtitle}> {item.institution || "N/A"}</Text>
        </View>
        
      </View>
    </TouchableOpacity>
  );


  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.secondaryHeader}>
        <View 
          style={{
            width: width >= 700 ? 700 : "100%",
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: width >= 700 ? 30 : 10,
          }}
        >
          <TouchableOpacity onPress={() => router.push("../../(tabs)/settings")}>
            <ArrowLeft size={24} color={COLORS.text}/>
          </TouchableOpacity>

          <Text
            pointerEvents="none"
            style={commonStyles.secondaryHeaderTitle}
          >
            Admin
          </Text>

          <TouchableOpacity
            style={commonStyles.addButton}
            onPress={() => router.push("../admin/user/create_user")}
          >
            <Plus size={24} color={COLORS.textButton} />
          </TouchableOpacity>
        </View>
      </View>
   
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, width>=700 && {width : 700, alignSelf: "center"}]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={commonStyles.title}>No users found</Text>
            <Text style={commonStyles.subtitle}>Add your first user to get started</Text>
          </View>
        }
      />      
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal:24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    color: COLORS.primary,
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap : 7,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 14,
    marginTop: 2,
  },

});
