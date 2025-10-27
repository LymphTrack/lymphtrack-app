import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";

interface LoadingScreenProps {
  active?: boolean;
  text?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  active = true,
  text = "Loading...",
}) => {
  if (!active) return null;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
    paddingHorizontal: 30,
  },
});

