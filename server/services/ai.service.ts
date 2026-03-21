import { GoogleGenAI } from '@google/genai';
import { logger } from '../config/logger.js';

let aiClient: GoogleGenAI | null = null;

export const getAiClient = (): GoogleGenAI => {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

export const processCommand = async (command: string, context: any) => {
  try {
    const ai = getAiClient();
    
    const prompt = `
      You are a medical rota assistant.
      
      Inputs:
      - Current Context: ${JSON.stringify(context || {})}
      
      User request:
      "${command}"
      
      Your job:
      1. Interpret intent
      2. Identify affected areas
      3. Suggest safe adjustments
      4. Ensure compliance
      
      Return a structured JSON response with the following format:
      {
        "intent": "string",
        "affectedShifts": ["shiftId1", "shiftId2"],
        "suggestedActions": [{"action": "reassign", "shiftId": "...", "newDoctorId": "..."}],
        "explanation": "string",
        "fairnessImpact": "string"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    if (!response.text) {
      throw new Error('No response from AI');
    }

    return JSON.parse(response.text);
  } catch (error) {
    logger.error('AI Service Error', { error });
    throw new Error('Failed to process AI command');
  }
};
