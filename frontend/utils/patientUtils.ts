export type Gender = "Male" | "Female" | "Unknown";
export type LymphedemaSide = "Right" | "Left" | "Both" | "Unknown";

export const mapGenderToDb = (gender: Gender): number | null => {
  if (gender === "Unknown") return null;
  return gender === "Female" ? 1 : 2;
};

export const mapDbToGender = (gender: number | null): Gender => {
  if (gender === null) return "Unknown";
  return gender === 1 ? "Female" : "Male";
};

export const mapSideToDb = (side: LymphedemaSide): number | null => {
  if (side === "Unknown") return null;
  if (side === "Right") return 1;
  if (side === "Left") return 2;
  return 3; 
};

export const mapDbToSide = (side: number | null): LymphedemaSide => {
  if (side === null) return "Unknown";
  if (side === 1) return "Right";
  if (side === 2) return "Left";
  return "Both";
};


export const validatePatientData = (
  ageStr: string | null,
  bmiStr: string | null
): { valid: boolean; error?: string; age?: number | null; bmi?: number | null } => {
  if (ageStr === null || ageStr === "") {
    return { valid: true, age: null, bmi: bmiStr ? parseFloat(bmiStr.replace(",", ".")) : null };
  }

  const age = parseInt(ageStr, 10);
  if (isNaN(age) || age < 10 || age > 100) {
    return { valid: false, error: "Incorrect age" };
  }

  if (bmiStr === null || bmiStr === "") {
    return { valid: true, age, bmi: null };
  }

  const bmi = parseFloat(bmiStr.replace(",", "."));
  if (isNaN(bmi) || bmi < 10 || bmi > 60) {
    return { valid: false, error: "Incorrect BMI" };
  }

  return { valid: true, age, bmi };
};

