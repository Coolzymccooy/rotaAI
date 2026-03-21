/**
 * NEWS2 (National Early Warning Score 2) Calculator
 *
 * Used by NHS hospitals to assess patient acuity.
 * Score 0-4: Low risk, 5-6: Medium, 7+: High/Critical.
 *
 * Drives the acuity scoring on the Live Acuity Map.
 */

export interface News2Observations {
  respirationRate: number;       // breaths per minute
  spO2: number;                  // oxygen saturation %
  isOnSupplementalO2: boolean;   // on oxygen?
  temperature: number;           // degrees Celsius
  systolicBP: number;            // mmHg
  heartRate: number;             // beats per minute
  consciousness: 'alert' | 'confusion' | 'voice' | 'pain' | 'unresponsive';
}

export interface News2Result {
  totalScore: number;
  riskLevel: 'low' | 'low-medium' | 'medium' | 'high';
  breakdown: Record<string, number>;
  escalation: string;
}

function scoreRespirationRate(rate: number): number {
  if (rate <= 8) return 3;
  if (rate <= 11) return 1;
  if (rate <= 20) return 0;
  if (rate <= 24) return 2;
  return 3;
}

function scoreSpO2Scale1(spo2: number): number {
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

function scoreSupplementalO2(isOn: boolean): number {
  return isOn ? 2 : 0;
}

function scoreTemperature(temp: number): number {
  if (temp <= 35.0) return 3;
  if (temp <= 36.0) return 1;
  if (temp <= 38.0) return 0;
  if (temp <= 39.0) return 1;
  return 2;
}

function scoreSystolicBP(bp: number): number {
  if (bp <= 90) return 3;
  if (bp <= 100) return 2;
  if (bp <= 110) return 1;
  if (bp <= 219) return 0;
  return 3;
}

function scoreHeartRate(hr: number): number {
  if (hr <= 40) return 3;
  if (hr <= 50) return 1;
  if (hr <= 90) return 0;
  if (hr <= 110) return 1;
  if (hr <= 130) return 2;
  return 3;
}

function scoreConsciousness(level: News2Observations['consciousness']): number {
  return level === 'alert' ? 0 : 3;
}

export function calculateNews2(obs: News2Observations): News2Result {
  const breakdown: Record<string, number> = {
    respirationRate: scoreRespirationRate(obs.respirationRate),
    spO2: scoreSpO2Scale1(obs.spO2),
    supplementalO2: scoreSupplementalO2(obs.isOnSupplementalO2),
    temperature: scoreTemperature(obs.temperature),
    systolicBP: scoreSystolicBP(obs.systolicBP),
    heartRate: scoreHeartRate(obs.heartRate),
    consciousness: scoreConsciousness(obs.consciousness),
  };

  const totalScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  let riskLevel: News2Result['riskLevel'] = 'low';
  let escalation = 'Continue routine monitoring.';

  // Check for single parameter score of 3 (medium risk)
  const hasScore3 = Object.values(breakdown).some(v => v >= 3);

  if (totalScore >= 7) {
    riskLevel = 'high';
    escalation = 'URGENT: Emergency assessment by clinical team. Consider ICU transfer.';
  } else if (totalScore >= 5 || hasScore3) {
    riskLevel = 'medium';
    escalation = 'Urgent review by ward doctor. Increase monitoring frequency to at least hourly.';
  } else if (totalScore >= 1) {
    riskLevel = 'low-medium';
    escalation = 'Inform registered nurse. Increase monitoring frequency to 4-6 hourly.';
  }

  return { totalScore, riskLevel, breakdown, escalation };
}

/**
 * Calculate aggregate ward acuity from multiple patient NEWS2 scores.
 */
export function calculateWardAcuity(scores: number[]): {
  averageScore: number;
  maxScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  wardAcuityLevel: 'critical' | 'high' | 'medium' | 'low';
} {
  if (scores.length === 0) {
    return { averageScore: 0, maxScore: 0, highRiskCount: 0, mediumRiskCount: 0, wardAcuityLevel: 'low' };
  }

  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxScore = Math.max(...scores);
  const highRiskCount = scores.filter(s => s >= 7).length;
  const mediumRiskCount = scores.filter(s => s >= 5 && s < 7).length;

  let wardAcuityLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
  if (highRiskCount >= 2 || averageScore >= 5) {
    wardAcuityLevel = 'critical';
  } else if (highRiskCount >= 1 || averageScore >= 3) {
    wardAcuityLevel = 'high';
  } else if (mediumRiskCount >= 2 || averageScore >= 2) {
    wardAcuityLevel = 'medium';
  }

  return { averageScore: Math.round(averageScore * 10) / 10, maxScore, highRiskCount, mediumRiskCount, wardAcuityLevel };
}
