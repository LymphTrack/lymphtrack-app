import { Platform } from "react-native";
import * as FileSaver from "file-saver";
import { showAlert } from "@/utils/alertUtils";

let FileSystem: any = null;
let Sharing: any = null;
let captureRef: any = null;

if (Platform.OS !== "web") {
  FileSystem = require("expo-file-system");
  Sharing = require("expo-sharing");
  captureRef = require("react-native-view-shot").captureRef;
}

let html2canvas: any = null;
if (Platform.OS === "web") {
  html2canvas = require("html2canvas");
}

export const exportGraph = async (
  data: any[],
  filename: string,
  format: "csv" | "png" = "csv",
  ref?: any
) => {
  try {
    if (format === "csv") {
      if (!data || data.length === 0) {
        showAlert("Error", "No graph data to export.");
        return;
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(","),
        ...data.map((row) => headers.map((h) => row[h]).join(",")),
      ];
      const csvContent = csvRows.join("\n");

      if (Platform.OS === "web") {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        FileSaver.saveAs(blob, `${filename}.csv`);
      } else {
        const fileUri = FileSystem.documentDirectory + `${filename}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          showAlert("Error", "Sharing is not available on this device.");
        }
      }
      return;
    }

    if (format === "png") {
      if (Platform.OS === "web") {
        const element =
          ref?.current?.container || ref?.current || document.querySelector("svg");
        if (!element) {
          showAlert("Error", "Graph element not found for PNG export.");
          return;
        }

        try {
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          });
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve)
          );
          if (blob) FileSaver.saveAs(blob, `${filename}.png`);
          else showAlert("Error", "Failed to generate PNG file.");
        } catch (error) {
          console.error("[EXPORT GRAPH ERROR] Web PNG capture failed:", error);
          showAlert("Error", "Error exporting PNG on web.");
        }
        return;
      }

      if (!ref) {
        showAlert("Error", "Graph reference missing for PNG export.");
        return;
      }

      try {
        const uri = await captureRef(ref, { format: "png", quality: 1 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          showAlert("Error", "Sharing not available on this device.");
        }
      } catch (error) {
        console.error("[EXPORT GRAPH ERROR] Mobile PNG capture failed:", error);
        showAlert("Error", "Error exporting PNG on mobile.");
      }
    }
  } catch (error) {
    console.error("[EXPORT GRAPH ERROR]", error);
    showAlert("Error", "Unexpected error during graph export.");
  }
};
