import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Config Check for Frontend
  app.get("/api/config", (req, res) => {
    res.json({ 
      aiEnabled: !!process.env.GEMINI_API_KEY 
    });
  });

  // Generic AI Generation Route
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { prompt, model: modelName = "gemini-3.5-flash", jsonMode = false } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.warn("GEMINI_API_KEY not found in environment");
        return res.status(503).json({ error: "AI service not configured" });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const response = await ai.models.generateContent({
        model: modelName === "gemini-3-flash-preview" ? "gemini-3.5-flash" : modelName,
        contents: prompt,
        config: jsonMode ? { responseMimeType: "application/json" } : undefined
      });

      const text = response.text || "";
      
      if (jsonMode) {
        try {
          let cleanText = text;
          // Attempt to parse just in case it returned a code block
          if (cleanText.includes("```json")) {
            cleanText = cleanText.split("```json")[1].split("```")[0];
          } else if (cleanText.includes("```")) {
            cleanText = cleanText.split("```")[1].split("```")[0];
          }
          res.json(JSON.parse(cleanText));
        } catch (e) {
          res.json({ result: text });
        }
      } else {
        res.json({ result: text });
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: error.message || "Internal AI Error" });
    }
  });

  // AI Analysis Route (Legacy simplified route)
  app.post("/api/analyze-report", async (req, res) => {
    try {
      const { message } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.warn("GEMINI_API_KEY not found in environment");
        return res.json({ level: 'PENDENTE', isEmergency: false, category: 'outro' });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const prompt = `Analise este relato escolar anônimo: "${message}". Classifique o relato conforme as regras: 
      - CRÍTICO: Risco imediato à vida ou integridade física grave. 
      - MODERADO: Bullying persistente, brigas frequentes, comportamento preocupante. 
      - NORMAL: Reclamações comuns, relatos sem urgência.
      
      Retorne um JSON com: { "level": "CRÍTICO" | "MODERADO" | "NORMAL", "isEmergency": boolean, "category": string }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("AI Analysis Error:", error);
      res.json({ level: 'PENDENTE', isEmergency: false, category: 'outro' });
    }
  });

  // Dummy seed route for compatibility
  app.post("/api/seed", (req, res) => {
    res.json({ message: "Seed disabled (using Firebase)" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
