export type Grade = 'FY1' | 'SHO' | 'Registrar' | 'Consultant';

export type ShiftType = 'D' | 'LD' | 'N' | 'OFF' | 'L';

export interface Doctor {
  id: string;
  name: string;
  grade: Grade;
  hoursWorked: number;
}

export interface Shift {
  id: string;
  doctorId: string;
  dayIndex: number;
  type: ShiftType;
  violation?: string;
}
