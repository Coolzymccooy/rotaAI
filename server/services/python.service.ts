import { logger } from '../config/logger.js';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export const callOptimizationEngine = async (payload: any) => {
  try {
    logger.warn(`Calling Python Optimization Service at ${PYTHON_SERVICE_URL}...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${PYTHON_SERVICE_URL}/api/v1/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Optimization service returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('Optimization engine response received', {
        fairnessScore: result.fairness_score,
        coverageScore: result.coverage_score,
        violations: result.violations?.length || 0,
      });

      return result;
    } catch (fetchError: any) {
      clearTimeout(timeout);

      if (fetchError.name === 'AbortError') {
        logger.warn('Python service timed out, falling back to built-in scheduler');
      } else {
        logger.warn('Python service unavailable, falling back to built-in scheduler', { error: fetchError.message });
      }

      // Fallback: use built-in scheduling logic
      return fallbackScheduler(payload);
    }
  } catch (error) {
    logger.error('Error in optimization service', { error });
    return fallbackScheduler(payload);
  }
};

function fallbackScheduler(payload: any) {
  const { doctors, shifts: existingShifts, startDate, numDays = 7 } = payload;

  if (!doctors || doctors.length === 0) {
    return { assignments: [], fairness_score: 0, coverage_score: 0, violations: [] };
  }

  const assignments: any[] = [];
  const shiftTypes = ['Day', 'Night', 'Long Day', 'Weekend'];
  const shiftTimes: Record<string, string> = {
    'Day': '08:00 - 20:00',
    'Night': '20:00 - 08:00',
    'Long Day': '08:00 - 22:00',
    'Weekend': '08:00 - 20:00',
  };

  // Track hours per doctor to enforce EWTD
  const hoursWorked: Record<string, number> = {};
  doctors.forEach((d: any) => { hoursWorked[d.id] = 0; });

  const shiftHours: Record<string, number> = { 'Day': 12, 'Night': 12, 'Long Day': 14, 'Weekend': 12 };

  for (let dayIdx = 0; dayIdx < numDays; dayIdx++) {
    const isWeekend = dayIdx >= 5;
    const docsPerDay = Math.min(Math.max(2, Math.ceil(doctors.length * 0.4)), doctors.length);

    // Sort doctors by fewest hours worked (fairness)
    const sorted = [...doctors].sort((a: any, b: any) => (hoursWorked[a.id] || 0) - (hoursWorked[b.id] || 0));

    for (let i = 0; i < docsPerDay; i++) {
      const doc = sorted[i];
      if (!doc) continue;

      const type = isWeekend ? 'Weekend' : (i % 3 === 2 ? 'Night' : (i % 3 === 1 ? 'Long Day' : 'Day'));
      const hours = shiftHours[type];

      // Check EWTD: 48 hours max
      if ((hoursWorked[doc.id] || 0) + hours > 48) continue;

      hoursWorked[doc.id] = (hoursWorked[doc.id] || 0) + hours;

      assignments.push({
        doctorId: doc.id,
        dayIdx,
        type,
        time: shiftTimes[type],
        isLocum: doc.contract === 'Locum',
        violation: false,
      });
    }
  }

  // Calculate scores
  const hoursValues = Object.values(hoursWorked).filter((h) => h > 0);
  const avgHours = hoursValues.reduce((a, b) => a + b, 0) / (hoursValues.length || 1);
  const variance = hoursValues.reduce((sum, h) => sum + Math.pow(h - avgHours, 2), 0) / (hoursValues.length || 1);
  const fairnessScore = Math.max(0, 100 - variance);
  const coverageScore = Math.min(100, (assignments.length / (numDays * 3)) * 100);

  return {
    assignments,
    fairness_score: Math.round(fairnessScore),
    coverage_score: Math.round(coverageScore),
    violations: [],
  };
}
