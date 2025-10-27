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
  bmiStr: string | null,
  idStr?: string | null,
  checkId: boolean = true, 
): {
  valid: boolean;
  error?: string;
  age?: number | null;
  bmi?: number | null;
  id?: string | null;
} => {
  if (checkId && idStr && idStr.trim() !== "") {
    const id = idStr.trim().toUpperCase();

    const idPattern = /^MV\d{3,}$/;
    if (!idPattern.test(id)) {
      return {
        valid: false,
        error: "Patient ID must start with 'MV' followed by at least 3 digits (e.g., MV025)",
      };
    }
  }

  let age: number | null = null;
  if (ageStr && ageStr !== "") {
    const parsedAge = parseInt(ageStr, 10);
    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 100) {
      return { valid: false, error: "Incorrect age" };
    }
    age = parsedAge;
  }

  let bmi: number | null = null;
  if (bmiStr && bmiStr !== "") {
    const parsedBmi = parseFloat(bmiStr.replace(",", "."));
    if (isNaN(parsedBmi) || parsedBmi < 10 || parsedBmi > 60) {
      return { valid: false, error: "Incorrect BMI" };
    }
    bmi = parsedBmi;
  }

  return {
    valid: true,
    age,
    bmi,
    id: idStr ? idStr.trim().toUpperCase() : null,
  };
};


