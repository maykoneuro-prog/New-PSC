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

  // AI Analysis Route
  app.post("/api/analyze-report", async (req, res) => {
    try {
      const { message } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.warn("GEMINI_API_KEY not found in environment");
        return res.json({ level: 'PENDENTE', isEmergency: false, category: 'outro' });
      }

      const genAI = new GoogleGenAI(apiKey as any);
      const model = (genAI as any).getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const prompt = `Analise este relato escolar anônimo: "${message}". Classifique o relato conforme as regras: 
      - CRÍTICO: Risco imediato à vida ou integridade física grave. 
      - MODERADO: Bullying persistente, brigas frequentes, comportamento preocupante. 
      - NORMAL: Reclamações comuns, relatos sem urgência.
      
      Retorne um JSON com: { "level": "CRÍTICO" | "MODERADO" | "NORMAL", "isEmergency": boolean, "category": string }`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
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
