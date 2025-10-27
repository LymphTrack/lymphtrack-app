import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps, Platform, Switch } from "react-native";
import { COLORS } from "@/constants/colors";
import { commonStyles } from "@/constants/styles";

interface InputFieldProps extends TextInputProps {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  withSwitch?: boolean;
  switchLabel?: string; 
  switchDefault?: boolean; 
  onSwitchChange?: (val: boolean) => void; 
  belowElement?: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  icon,
  required,
  optional,
  withSwitch = false,
  switchLabel = "Activate",
  switchDefault = false,
  onSwitchChange,
  belowElement,
  style,
  ...textInputProps
}) => {
  const [switchValue, setSwitchValue] = useState(switchDefault);

  const handleToggleSwitch = (val: boolean) => {
    setSwitchValue(val);
    onSwitchChange?.(val);
  };

  const hideInput = withSwitch && switchValue;

  return (
    <View style={styles.container}>
      <Text style={commonStyles.inputTitle}>
        {icon} {label}{" "}
        {required && <Text style={{ color: "red" }}>*</Text>}
        {optional && <Text style={{ color: COLORS.subtitle }}>(optional)</Text>}
      </Text>

      {!hideInput && !belowElement && (
        <TextInput
          style={[commonStyles.input, style]}
          placeholderTextColor={COLORS.inputText}
          {...textInputProps}
        />
      )}

      {belowElement && <View style={{ marginTop: 8 }}>{belowElement}</View>}
      
      {withSwitch && (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{switchLabel}</Text>
          <Switch
            value={switchValue}
            onValueChange={handleToggleSwitch}
            {...(Platform.OS === "web"
              ? ({
                  activeThumbColor: COLORS.butonText,
                  activeTrackColor: COLORS.primary,
                  thumbColor: "#f4f3f4",
                  trackColor: "#D1D5DB",
                } as any)
              : {
                  trackColor: { false: "#D1D5DB", true: "#93C5FD" },
                  thumbColor: switchValue ? "#2563EB" : "#f4f3f4",
                  ios_backgroundColor: "#D1D5DB",
                })}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 5,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft : 10,
  },
  switchLabel: {
    color: COLORS.subtitle,
    marginRight: 8,
  },
});
