import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Bootstrap User Route (requested for Bianca Moura)
  app.post("/api/bootstrap-user", async (req, res) => {
    try {
      const { email, password, name, role = "psychologist", units = ["ADMINISTRAÇÃO CENTRAL"] } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password and name are required" });
      }

      console.log(`[Bootstrap] Creating user: ${email}`);

      // 1. Create in Firebase Auth
      let authUser;
      try {
        authUser = await admin.auth().getUserByEmail(email);
        console.log(`[Bootstrap] User already exists in Auth: ${authUser.uid}`);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          authUser = await admin.auth().createUser({
            email,
            password,
            displayName: name,
          });
          console.log(`[Bootstrap] User created in Auth: ${authUser.uid}`);
        } else {
          throw err;
        }
      }

      // 2. Create in Firestore
      const db = getFirestore(firebaseConfig.firestoreDatabaseId);
      const userRef = db.collection("users").doc(authUser.uid);
      
      const userData = {
        name,
        email,
        role,
        status: "active",
        units,
        permissions: ['dashboard', 'reports', 'appointments', 'scheduling_requests', 'documents', 'psychological_listening', 'instructions', 'settings', 'students', 'schools'],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        planId: "professional"
      };

      await userRef.set(userData, { merge: true });
      console.log(`[Bootstrap] Firestore profile created/updated for ${authUser.uid}`);

      res.json({ 
        message: "User bootstrapped successfully", 
        uid: authUser.uid,
        email: email
      });
    } catch (error: any) {
      console.error("Bootstrap error:", error);
      res.status(500).json({ error: error.message || String(error) });
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
