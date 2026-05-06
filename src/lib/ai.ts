
export async function generateAIResponse(prompt: string, options: { jsonMode?: boolean, model?: string } = {}) {
  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt, 
        jsonMode: options.jsonMode,
        model: options.model 
      })
    });
    
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error("O serviço de Inteligência Artificial não está configurado (Chave de API ausente).");
      }
      const err = await response.json();
      throw new Error(err.error || "Erro na análise por IA");
    }
    
    return await response.json();
  } catch (error: any) {
    console.error("AI Service Error:", error);
    throw error;
  }
}

export async function isAIEnabled() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const data = await response.json();
      return !!data.aiEnabled;
    }
    return false;
  } catch {
    return false;
  }
}
