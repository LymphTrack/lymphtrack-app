import { showAlert, confirmAction } from "@/utils/alertUtils";

export const deleteItem = async (
  url: string,
  itemLabel: string,
  onSuccess?: () => Promise<void> | void,
  method: "DELETE" | "POST" = "DELETE",
  body?: any
) => {
  try {
    const confirmed = await confirmAction(
      `Delete ${itemLabel}`,
      `Are you sure you want to delete this ${itemLabel}?`,
      "Delete",
      "Cancel"
    );
    if (!confirmed) return;

    const options: RequestInit = { method };
    if (method === "POST" && body) {
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.status !== "success") {
      showAlert("Error", data.message || `Failed to delete ${itemLabel}.`);
      return;
    }

    showAlert("Success", `${itemLabel} deleted successfully.`);
    if (onSuccess) await onSuccess();
  } catch (error) {
    console.error("Delete error:", error);
    showAlert("Error", `Unexpected error while deleting ${itemLabel}.`);
  }
};

