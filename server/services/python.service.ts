import { logger } from '../config/logger.js';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export const callOptimizationEngine = async (payload: any) => {
  try {
    logger.info('Calling Python Optimization Service...');
    
    // Mocking the Python service response for the sandbox environment
    // In production, this would be an actual fetch call:
    /*
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/v1/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Optimization service failed: ${response.statusText}`);
    }
    
    return await response.json();
    */

    // MOCK RESPONSE
    logger.info('Returning mocked optimization results');
    return [
      {
        doctorId: payload.doctors[0]?.id || 'mock-doc-1',
        shiftId: payload.shifts[0]?.id || 'mock-shift-1',
        date: payload.startDate,
      }
    ];
  } catch (error) {
    logger.error('Error calling Python service', { error });
    throw new Error('Failed to generate optimized rota');
  }
};
