/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type CategorieAge = 'bébé' | 'enfant' | 'adulte';
export type FrequencyType = '1x' | '2x' | '3x' | 'interval' | 'prn';

export interface MedicationEntry {
  id: string; // Changed to string for frontend compatibility (Math.random IDs)
  name: string;
  frequencyType: FrequencyType;
  times: string[]; // e.g., ["08:00", "20:00"]
  intervalHours?: number;
  durationDays: number;
  doseValue: number;
  unit: string;
}

export interface DoseSchedule {
  id?: number;
  medicationId: string;
  medicationName: string;
  clientName: string;
  patientId: number;
  dose: number;
  unit: string;
  time: string;
  scheduledAt?: string;
  day: number;
  type?: string;
  statusReminderSent: boolean;
  statusTaken: boolean;
}

export type AccountType = "standard" | "professional" | "pharmacist" | "admin";

export interface UserDTO {
  id: number;
  email: string | null;
  phone: string | null;
  type: AccountType;
  name: string;
}

export interface DashboardStats {
  observanceRate: number;
  activeReminders: number;
  plannedReminders: number;
  nearbyPharmacies: number;
  nextDose: DoseSchedule | null;
}
