export function validateFollowUpDate(date: Date): { valid: boolean; message?: string } {
  const today = new Date();
  const selectedDate = new Date(date);

  if (selectedDate > today) {
    return { valid: false, message: "Follow-up date cannot be in the future" };
  }

  if (selectedDate.getFullYear() < 2000) {
    return { valid: false, message: "Follow-up date is too old" };
  }

  return { valid: true };
}