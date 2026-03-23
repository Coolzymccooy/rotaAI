/**
 * Unified Workforce State (Step 3 of the Loop)
 *
 * Builds a real-time picture of:
 * - Who exists in the workforce
 * - Who is available today/this week
 * - Who is on leave
 * - Who is eligible for specific shift types
 * - Historical load (nights, weekends worked YTD)
 * - Current coverage gaps by department
 */

import { prisma } from '../config/db.js';

export interface WorkforceSnapshot {
  timestamp: string;
  totalStaff: number;
  activeStaff: number;
  onLeave: number;
  unavailable: number;
  available: number;
  byDepartment: { department: string; total: number; available: number; onLeave: number; coverage: number }[];
  byGrade: { grade: string; total: number; available: number }[];
  coverageGaps: { department: string; shiftType: string; required: number; filled: number; gap: number }[];
  highFatigue: { name: string; grade: string; department: string; hoursLast7: number; nightsYtd: number }[];
  recentChanges: number;
}

export async function buildWorkforceState(organizationId?: string): Promise<WorkforceSnapshot> {
  const where: any = {};
  if (organizationId) where.organizationId = organizationId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Parallel queries
  const [doctors, leaves, availability, shifts, historicalLoads, serviceReqs, recentAudit] = await Promise.all([
    prisma.doctor.findMany({ where, select: { id: true, name: true, grade: true, department: true, status: true, site: true } }),
    prisma.leave.findMany({ where: { startDate: { lte: weekEnd }, endDate: { gte: today } } }),
    prisma.availability.findMany({ where: { startDate: { lte: weekEnd }, endDate: { gte: today }, status: 'active' } }),
    prisma.shift.findMany({ where }),
    prisma.historicalLoad.findMany(),
    prisma.serviceRequirement.findMany({ where: organizationId ? { organizationId } : {} }),
    prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
  ]);

  // Sets for quick lookup
  const onLeaveIds = new Set(leaves.map(l => l.doctorId));
  const unavailableIds = new Set(availability.filter(a => a.type === 'unavailable').map(a => a.doctorId));

  const activeDoctors = doctors.filter(d => d.status === 'Active');
  const availableDoctors = activeDoctors.filter(d => !onLeaveIds.has(d.id) && !unavailableIds.has(d.id));

  // By department
  const deptMap = new Map<string, { total: number; available: number; onLeave: number }>();
  for (const doc of activeDoctors) {
    const dept = doc.department || 'Unknown';
    if (!deptMap.has(dept)) deptMap.set(dept, { total: 0, available: 0, onLeave: 0 });
    const d = deptMap.get(dept)!;
    d.total++;
    if (!onLeaveIds.has(doc.id) && !unavailableIds.has(doc.id)) d.available++;
    if (onLeaveIds.has(doc.id)) d.onLeave++;
  }

  const byDepartment = Array.from(deptMap.entries()).map(([dept, data]) => ({
    department: dept,
    ...data,
    coverage: data.total > 0 ? Math.round((data.available / data.total) * 100) : 0,
  })).sort((a, b) => a.coverage - b.coverage);

  // By grade
  const gradeMap = new Map<string, { total: number; available: number }>();
  for (const doc of activeDoctors) {
    if (!gradeMap.has(doc.grade)) gradeMap.set(doc.grade, { total: 0, available: 0 });
    const g = gradeMap.get(doc.grade)!;
    g.total++;
    if (!onLeaveIds.has(doc.id) && !unavailableIds.has(doc.id)) g.available++;
  }

  const byGrade = Array.from(gradeMap.entries()).map(([grade, data]) => ({
    grade,
    ...data,
  })).sort((a, b) => b.total - a.total);

  // Coverage gaps — compare service requirements vs actual shifts
  const coverageGaps: WorkforceSnapshot['coverageGaps'] = [];
  for (const req of serviceReqs) {
    const totalRequired = req.minFyCover + req.minShoCover + req.minRegistrarCover + req.minConsultantCover;
    const deptShifts = shifts.filter(s => {
      const doc = doctors.find(d => d.id === s.doctorId);
      return doc?.department === req.department && s.type.toLowerCase().includes(req.shiftType.toLowerCase().slice(0, 3));
    });
    const filled = Math.ceil(deptShifts.length / 7); // Average per day
    if (filled < totalRequired) {
      coverageGaps.push({
        department: req.department,
        shiftType: req.shiftType,
        required: totalRequired,
        filled,
        gap: totalRequired - filled,
      });
    }
  }

  // High fatigue staff
  const loadMap = new Map(historicalLoads.map(h => [h.doctorId, h]));
  const highFatigue = activeDoctors
    .filter(d => {
      const load = loadMap.get(d.id);
      return load && (load.hoursWorkedLast7 > 40 || load.nightsYtd > 20);
    })
    .map(d => {
      const load = loadMap.get(d.id)!;
      return { name: d.name, grade: d.grade, department: d.department, hoursLast7: load.hoursWorkedLast7, nightsYtd: load.nightsYtd };
    })
    .sort((a, b) => b.hoursLast7 - a.hoursLast7)
    .slice(0, 10);

  return {
    timestamp: new Date().toISOString(),
    totalStaff: doctors.length,
    activeStaff: activeDoctors.length,
    onLeave: onLeaveIds.size,
    unavailable: unavailableIds.size,
    available: availableDoctors.length,
    byDepartment,
    byGrade,
    coverageGaps,
    highFatigue,
    recentChanges: recentAudit,
  };
}
