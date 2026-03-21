import { prisma } from '../config/db.js';
import * as pythonService from './python.service.js';

export const generateRota = async (startDate: string, endDate: string, rules: any) => {
  // 1. Fetch all doctors
  const doctors = await prisma.doctor.findMany({ include: { leaves: true } });
  
  // 2. Clear existing shifts for the period (simplified for prototype)
  await prisma.shift.deleteMany();

  // 3. Generate new shifts (Mocking the Python engine for now)
  // In a real app, this would call pythonService.callOptimizationEngine
  
  const newShifts = [];
  const shiftTypes = ['Day', 'Night', 'Long Day', 'Weekend'];
  const shiftTimes = ['08:00 - 20:00', '20:00 - 08:00', '08:00 - 22:00', '08:00 - 20:00'];
  
  // Generate a somewhat realistic schedule
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    // Assign 2-3 doctors per day
    const numDocs = Math.floor(Math.random() * 2) + 2;
    const shuffledDocs = [...doctors].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < numDocs; i++) {
      const doc = shuffledDocs[i];
      if (!doc) continue;
      
      const typeIdx = Math.floor(Math.random() * shiftTypes.length);
      
      newShifts.push({
        doctorId: doc.id,
        dayIdx,
        type: shiftTypes[typeIdx],
        time: shiftTimes[typeIdx],
        isLocum: doc.contract === 'Locum',
        violation: false
      });
    }
  }

  // 4. Save the new shifts to the database
  const createdShifts = [];
  for (const shift of newShifts) {
    const created = await prisma.shift.create({
      data: shift
    });
    createdShifts.push(created);
  }

  return createdShifts;
};

export const updateRota = async (shifts: any[]) => {
  // Update multiple shifts
  const results = [];
  for (const shift of shifts) {
    const updated = await prisma.shift.update({
      where: { id: shift.id },
      data: {
        doctorId: shift.doctorId,
        type: shift.type,
        time: shift.time,
        dayIdx: shift.dayIdx
      }
    });
    results.push(updated);
  }
  return results;
};
