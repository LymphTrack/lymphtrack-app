import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";
import { showAlert } from "@/utils/alertUtils";

export const importAndUploadFiles = async (
  uploadUrl: string,
  expectedCount?: number | [number, number],
  reloadCallback?: () => void
) => {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: true,
      type: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ],
      copyToCacheDirectory: true,
    });

    if (res.canceled || !res.assets?.length) return;

    const assets = res.assets;
    const count = assets.length;

    if (Array.isArray(expectedCount)) {
      const [min, max] = expectedCount;
      if (count < min || count > max) {
        showAlert(
          "Invalid number of files",
          `You selected ${count} files. Please select between ${min} and ${max} Excel or CSV files.`
        );
        return;
      }
    } else if (expectedCount && count !== expectedCount) {
      showAlert(
        "Invalid number of files",
        `You selected ${count} files. You should import ${expectedCount}.`
      );
      return;
    }

    const validExtensions = [".xlsx", ".xls", ".csv"];
    const invalid = assets.filter(
      (a) => !validExtensions.some((ext) => a.name?.toLowerCase().endsWith(ext))
    );

    if (invalid.length) {
      const msg = `Some files are not valid Excel or CSV files:\n\n${invalid
        .map((f) => f.name || "(unnamed)")
        .join("\n")}`;
      showAlert("Invalid file type", msg);
      return;
    }

    const fd = new FormData();
    for (const f of assets) {
      if (Platform.OS === "web") {
        let blob: Blob;
        if ((f as any).file instanceof File) blob = (f as any).file as File;
        else blob = await fetch(f.uri).then((r) => r.blob());
        fd.append("files", blob, f.name || "measurement.csv");
      } else {
        fd.append("files", {
          uri: f.uri,
          name: f.name || "measurement.csv",
          type: f.mimeType || "application/octet-stream",
        } as any);
      }
    }

    const resp = await fetch(uploadUrl, {
      method: "POST",
      body: fd,
      headers: { Accept: "application/json" },
    });

    const text = await resp.text();
    console.log("Backend resp:", resp.status, text);

    if (!resp.ok) throw new Error(text || `HTTP ${resp.status}`);

    const data = JSON.parse(text);

    if (data.status === "error") {
      const msg = data.message || "Processing failed";
      showAlert("Error", msg);
      return;
    }

    showAlert("Success", "Measurements processed and saved!");
    reloadCallback?.();
  } catch (e: any) {
    console.error("Upload error:", e);
    showAlert("Error", e.message || "Unexpected error during upload.");
  }
};
