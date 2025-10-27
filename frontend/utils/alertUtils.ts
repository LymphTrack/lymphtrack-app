import { Alert, Platform } from "react-native";

export const showAlert = (
  title: string,
  messageText: string,
  type: "error" | "success" = "error",
  setMessage?: (msg: { text: string; type: "error" | "success" | null }) => void
) => {
  if (Platform.OS === "web") {
    if (setMessage) {
      setMessage({ text: `${title}: ${messageText}`, type });
    } else {
      console.log(`${title}: ${messageText}`);
    }
  } else {
    Alert.alert(title, messageText);
  }
};


export const confirmAction = (
  title: string,
  message: string,
  confirmText: string = "OK",
  cancelText: string = "Cancel"
): Promise<boolean> => {
  return new Promise((resolve) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      resolve(confirmed);
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: cancelText, style: "cancel", onPress: () => resolve(false) },
          { text: confirmText, style: "destructive", onPress: () => resolve(true) },
        ],
        { cancelable: true }
      );
    }
  });
};