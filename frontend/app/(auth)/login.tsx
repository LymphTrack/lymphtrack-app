import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Platform, useWindowDimensions, } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from '@/constants/colors';
import { LoadingScreen } from '@/components/loadingScreen';
import { showAlert} from '@/utils/alertUtils';
import { commonStyles } from '@/constants/styles';

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const saveUserId = async (id: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem("userId", id);
    } else {
      await AsyncStorage.setItem("userId", id);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        showAlert('Login Failed', error.message);
      } else if (data.user) {
        await saveUserId(data.user.id);
        router.replace('/(tabs)/patients');
      }
    } catch (error) {
      showAlert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      showAlert('Email Required', 'Please enter your email address');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      showAlert('Error', error.message);
    } else {
      showAlert('Success', 'Password reset email sent');
    }
  };

  if (loading) return <LoadingScreen text="Sign In..."/>;

  return (
    <View style={[commonStyles.container,{justifyContent: "center"}]}>
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/LymphTrack_Logo_no_background.png")}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Secure Medical Data Management</Text>
      </View>

      <View style={[commonStyles.card, width >=500 && { width : 450, alignSelf: 'center' }]}>
        <TextInput
          style={commonStyles.input}
          placeholder="Email Address"
          placeholderTextColor={COLORS.inputText}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={commonStyles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.inputText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            {showPassword 
              ? <EyeOff size={20} color={COLORS.subtitle} /> 
              : <Eye size={20} color={COLORS.subtitle} />}
          </TouchableOpacity>
        </View>

        <View style={styles.optionsRow}>
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.subtitle,
    textAlign: 'center',
    marginBottom: -20,
  },
  image : { 
    width: 400, 
    height: 300, 
    marginBottom : -100 , 
    marginTop : -100
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -18 }], 
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: -23,
  },
  forgotPassword: {
    marginLeft : 15,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    width: '50%',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  loginButtonText: {
    color: COLORS.textButton,
    fontSize: 16,
    fontWeight: '600',
  },
});