/**
 * Data Validation Layer (Step 2 of the Loop)
 *
 * Validates all incoming data before it enters the system:
 * - Bulk imports
 * - Form submissions
 * - API requests
 * - Self-service inputs
 */

import { prisma } from '../config/db.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  cleaned: any;
}

// ==========================================
// DOCTOR / STAFF VALIDATION
// ==========================================

const VALID_GRADES = ['Consultant', 'Associate Specialist', 'Registrar', 'ST1', 'ST2', 'ST3', 'ST4', 'ST5', 'ST6', 'ST7', 'ST8', 'CT1', 'CT2', 'CT3', 'SHO', 'FY2', 'FY1'];
const VALID_STATUSES = ['Active', 'On Leave', 'Training', 'Suspended', 'Inactive', 'Erased'];
const VALID_FATIGUE = ['Low', 'Medium', 'High', 'Critical'];

export function validateDoctor(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  const name = data.name || [data.title, data.first_name, data.last_name].filter(Boolean).join(' ').trim();
  if (!name) errors.push('Name is required');
  if (!data.grade && !data.clinical_role) errors.push('Grade or clinical role is required');

  // Grade validation
  if (data.grade && !VALID_GRADES.includes(data.grade)) {
    warnings.push(`Grade "${data.grade}" is non-standard — accepted but may cause issues`);
  }

  // Email format
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push(`Invalid email: ${data.email}`);
  }
  if (data.nhs_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.nhs_email)) {
    errors.push(`Invalid NHS email: ${data.nhs_email}`);
  }

  // GMC number format (7 digits)
  if (data.gmc_number && !/^GMC\d{7}$/.test(data.gmc_number) && !/^\d{7}$/.test(data.gmc_number)) {
    warnings.push(`GMC number "${data.gmc_number}" format may be incorrect (expected 7 digits)`);
  }

  // Max hours range
  const maxHours = parseFloat(data.max_weekly_hours || data.maxHours);
  if (maxHours && (maxHours < 0 || maxHours > 80)) {
    errors.push(`Max weekly hours ${maxHours} is out of range (0-80)`);
  }

  // Contract hours
  const contractHours = parseFloat(data.contract_hours);
  if (contractHours && (contractHours < 0 || contractHours > 168)) {
    warnings.push(`Contract hours ${contractHours} seems unusual`);
  }

  // Employment dates
  if (data.employment_start_date) {
    const start = new Date(data.employment_start_date);
    if (isNaN(start.getTime())) errors.push(`Invalid employment start date: ${data.employment_start_date}`);
  }
  if (data.employment_end_date) {
    const end = new Date(data.employment_end_date);
    if (isNaN(end.getTime())) errors.push(`Invalid employment end date: ${data.employment_end_date}`);
    if (data.employment_start_date && new Date(data.employment_end_date) < new Date(data.employment_start_date)) {
      errors.push('Employment end date is before start date');
    }
  }

  return { valid: errors.length === 0, errors, warnings, cleaned: { ...data, name } };
}

// ==========================================
// LEAVE REQUEST VALIDATION
// ==========================================

const VALID_LEAVE_TYPES = ['annual', 'study', 'sick', 'compassionate', 'maternity', 'paternity', 'unpaid'];

export function validateLeaveRequest(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.doctor_id && !data.staff_id && !data.doctorId) errors.push('Staff ID is required');
  if (!data.start_date && !data.startDate) errors.push('Start date is required');
  if (!data.end_date && !data.endDate) errors.push('End date is required');

  const startDate = new Date(data.start_date || data.startDate);
  const endDate = new Date(data.end_date || data.endDate);

  if (isNaN(startDate.getTime())) errors.push('Invalid start date');
  if (isNaN(endDate.getTime())) errors.push('Invalid end date');
  if (startDate > endDate) errors.push('End date is before start date');

  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (durationDays > 365) warnings.push(`Leave duration of ${durationDays} days is unusually long`);

  const leaveType = (data.leave_type || data.type || 'annual').toLowerCase();
  if (!VALID_LEAVE_TYPES.includes(leaveType)) {
    warnings.push(`Leave type "${leaveType}" is non-standard`);
  }

  return { valid: errors.length === 0, errors, warnings, cleaned: data };
}

// ==========================================
// SHIFT VALIDATION
// ==========================================

const VALID_SHIFT_TYPES = ['Day', 'Night', 'Long Day', 'Weekend', 'On-call', 'Twilight'];

export function validateShift(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.doctorId) errors.push('Doctor ID is required');
  if (data.dayIdx === undefined || data.dayIdx === null) errors.push('Day index is required');
  if (!data.type) errors.push('Shift type is required');
  if (!data.time) errors.push('Shift time is required');

  if (data.type && !VALID_SHIFT_TYPES.includes(data.type)) {
    warnings.push(`Shift type "${data.type}" is non-standard`);
  }

  // Validate time format
  if (data.time && !/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/.test(data.time)) {
    warnings.push(`Time format "${data.time}" should be "HH:MM - HH:MM"`);
  }

  return { valid: errors.length === 0, errors, warnings, cleaned: data };
}

// ==========================================
// AVAILABILITY VALIDATION
// ==========================================

export function validateAvailability(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.doctorId) errors.push('Doctor ID is required');
  if (!data.startDate) errors.push('Start date is required');
  if (!data.endDate) errors.push('End date is required');

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start > end) errors.push('End date is before start date');
    if (end < new Date()) warnings.push('Availability block is in the past');
  }

  return { valid: errors.length === 0, errors, warnings, cleaned: data };
}

// ==========================================
// BATCH VALIDATION (for imports)
// ==========================================

export function validateBatch(records: any[], validator: (data: any) => ValidationResult): {
  validRecords: any[];
  invalidRecords: { index: number; record: any; errors: string[] }[];
  warnings: string[];
  summary: { total: number; valid: number; invalid: number; warnings: number };
} {
  const validRecords: any[] = [];
  const invalidRecords: { index: number; record: any; errors: string[] }[] = [];
  const allWarnings: string[] = [];

  records.forEach((record, index) => {
    const result = validator(record);
    if (result.valid) {
      validRecords.push(result.cleaned);
    } else {
      invalidRecords.push({ index: index + 1, record, errors: result.errors });
    }
    if (result.warnings.length > 0) {
      allWarnings.push(...result.warnings.map(w => `Row ${index + 1}: ${w}`));
    }
  });

  return {
    validRecords,
    invalidRecords,
    warnings: allWarnings,
    summary: {
      total: records.length,
      valid: validRecords.length,
      invalid: invalidRecords.length,
      warnings: allWarnings.length,
    },
  };
}

// ==========================================
// DUPLICATE DETECTION
// ==========================================

export async function checkDuplicates(organizationId: string | null, records: any[]): Promise<{
  duplicates: { index: number; field: string; value: string; existingId: string }[];
}> {
  const duplicates: { index: number; field: string; value: string; existingId: string }[] = [];

  // Check for duplicate doctor codes
  const codes = records.map(r => r.doctor_id || r.staff_id).filter(Boolean);
  if (codes.length > 0) {
    const existing = await prisma.doctor.findMany({
      where: { doctorCode: { in: codes }, organizationId: organizationId || undefined },
      select: { id: true, doctorCode: true },
    });

    existing.forEach(doc => {
      const idx = records.findIndex(r => (r.doctor_id || r.staff_id) === doc.doctorCode);
      if (idx >= 0 && doc.doctorCode) {
        duplicates.push({ index: idx + 1, field: 'doctor_id', value: doc.doctorCode, existingId: doc.id });
      }
    });
  }

  // Check for duplicate emails
  const emails = records.map(r => r.nhs_email || r.email).filter(Boolean);
  if (emails.length > 0) {
    const existingEmails = await prisma.doctor.findMany({
      where: { email: { in: emails }, organizationId: organizationId || undefined },
      select: { id: true, email: true },
    });

    existingEmails.forEach(doc => {
      if (doc.email) {
        const idx = records.findIndex(r => (r.nhs_email || r.email) === doc.email);
        if (idx >= 0) {
          duplicates.push({ index: idx + 1, field: 'email', value: doc.email, existingId: doc.id });
        }
      }
    });
  }

  return { duplicates };
}
