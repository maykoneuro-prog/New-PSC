
import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("O serviço de Inteligência Artificial não está configurado (Chave de API ausente).");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function generateAIResponse(prompt: string, options: { jsonMode?: boolean, model?: string } = {}) {
  try {
    const ai = getAI();
    const modelName = options.model || "gemini-3-flash-preview";
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: options.jsonMode ? { responseMimeType: "application/json" } : undefined
    });
    
    const text = response.text || "";
    
    if (options.jsonMode) {
      try {
        let cleanText = text;
        // Attempt to parse just in case it returned a code block
        if (cleanText.includes("```json")) {
          cleanText = cleanText.split("```json")[1].split("```")[0];
        } else if (cleanText.includes("```")) {
          cleanText = cleanText.split("```")[1].split("```")[0];
        }
        return JSON.parse(cleanText);
      } catch (e) {
        return { result: text };
      }
    }
    
    return { result: text };
  } catch (error: any) {
    console.error("AI Service Error:", error);
    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("not configured")) {
      throw new Error("O serviço de Inteligência Artificial não está configurado corretamente. Verifique sua chave de API.");
    }
    throw error;
  }
}

export async function isAIEnabled() {
  return !!process.env.GEMINI_API_KEY;
}
