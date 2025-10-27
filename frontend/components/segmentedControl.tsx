import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";

export const SegmentedControl = ({
  options,
  value,
  onValueChange,
}: {
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
}) => (
  <View style={styles.segmentedControl}>
    {options.map((option) => (
      <TouchableOpacity
        key={option}
        style={[styles.segment, value === option && styles.segmentActive]}
        onPress={() => onValueChange(option)}
      >
        <Text
          style={[styles.segmentText, value === option && styles.segmentTextActive]}
        >
          {option.toUpperCase()}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.subtitle,
  },
  segmentTextActive: {
    color: COLORS.textButton,
  },
});
