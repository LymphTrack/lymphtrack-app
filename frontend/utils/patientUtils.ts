export type Gender = "Male" | "Female";
export type LymphedemaSide = "Right" | "Left" | "Both";

export const mapGenderToDb = (gender: Gender): number => {
  return gender === "Female" ? 1 : 2;
};

export const mapDbToGender = (gender: number): Gender => {
  return gender === 1 ? "Female" : "Male";
};

export const mapSideToDb = (side: LymphedemaSide): number => {
  return side === "Right" ? 1 : side === "Left" ? 2 : 3;
};

export const mapDbToSide = (side: number): LymphedemaSide => {
  return side === 1 ? "Right" : side === 2 ? "Left" : "Both";
};

export const validatePatientData = (ageStr: string, bmiStr: string): { valid: boolean; error?: string; age?: number; bmi?: number } => {
  const age = parseInt(ageStr, 10);
  const bmi = parseFloat(bmiStr.replace(",", "."));

  if (!ageStr || !bmiStr) {
    return { valid: false, error: "Please fill in all required fields" };
  }

  if (isNaN(age) || age < 10 || age > 100) {
    return { valid: false, error: "Incorrect age" };
  }

  if (isNaN(bmi) || bmi < 10 || bmi > 60) {
    return { valid: false, error: "Incorrect BMI" };
  }

  return { valid: true, age, bmi };
};
