import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { showAlert, confirmAction } from "@/utils/alertUtils";


export const exportFolder = async (url: string, filename: string) => {
  try {
    if (Platform.OS === "web") {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);

      showAlert("Download complete", "The export has been saved successfully.");
    } else {
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      const res = await FileSystem.downloadAsync(url, fileUri);

      if (res.status !== 200) throw new Error(`Download failed: ${res.status}`);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(res.uri);
      } else {
        showAlert("Download complete", `Saved to ${res.uri}`);
      }
    }
  } catch (error) {
    console.error("Export error:", error);
    const retry = await confirmAction(
      "Error",
      "Unable to export folder.\nDo you want to retry?",
      "Retry",
      "Cancel"
    );
    if (retry) exportFolder(url, filename);
  }
};
