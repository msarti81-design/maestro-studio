import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "mock-key",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // Serve update scripts as raw plain text at top level before any middleware
  app.use((req, res, next) => {
    if (req.path.includes("update.sh") || req.path.includes("deploy.sh")) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).sendFile(path.join(__dirname, "update.sh"));
    }
    if (req.path.includes("update_song.py")) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).sendFile(path.join(__dirname, "update_song.py"));
    }
    if (req.path.includes("maestro-studio.tar.gz")) {
      const tarPath = path.join(__dirname, "public", "maestro-studio.tar.gz");
      if (fs.existsSync(tarPath)) {
        res.setHeader("Content-Type", "application/gzip");
        return res.status(200).sendFile(tarPath);
      }
    }
    next();
  });

  // Community Songs Storage Path
  const dataDir = path.join(__dirname, "data");
  const communitySongsFile = path.join(dataDir, "community_songs.json");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(communitySongsFile)) {
    fs.writeFileSync(communitySongsFile, JSON.stringify([], null, 2));
  }

  app.get("/api/community-songs", (req, res) => {
    try {
      if (fs.existsSync(communitySongsFile)) {
        const raw = fs.readFileSync(communitySongsFile, "utf-8");
        const songs = JSON.parse(raw || "[]");
        return res.json(songs);
      }
      res.json([]);
    } catch (e: any) {
      console.error("Error reading community songs:", e);
      res.json([]);
    }
  });

  app.post("/api/community-songs", (req, res) => {
    try {
      const song = req.body;
      if (!song || !song.title || !song.notes) {
        return res.status(400).json({ error: "Titolo e note obbligatori" });
      }

      let songs = [];
      if (fs.existsSync(communitySongsFile)) {
        const raw = fs.readFileSync(communitySongsFile, "utf-8");
        songs = JSON.parse(raw || "[]");
      }

      const existingIdx = songs.findIndex((s: any) => s.id === song.id);
      const songToSave = {
        ...song,
        isPublished: true,
        createdAt: song.createdAt || new Date().toISOString()
      };

      if (existingIdx >= 0) {
        songs[existingIdx] = songToSave;
      } else {
        songs.unshift(songToSave);
      }

      fs.writeFileSync(communitySongsFile, JSON.stringify(songs, null, 2));
      res.json({ success: true, song: songToSave });
    } catch (e: any) {
      console.error("Error saving community song:", e);
      res.status(500).json({ error: e.message || "Failed to publish song" });
    }
  });

  // API endpoint for AI Music Composer & Arranger
  app.post("/api/gemini/compose", async (req, res) => {
    try {
      const { prompt, style, key } = req.body;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `You are an expert music composer and arranger. The user wants a song or progression with prompt: "${prompt}", style: "${style || "pop"}", musical key: "${key || "C major"}".
Return a JSON object containing:
1. title (string)
2. description (string)
3. key (string)
4. bpm (number, between 60 and 160)
5. chords (array of strings representing chords per measure, e.g. ["C", "Am", "F", "G"])
6. melody (array of objects with { note: string (e.g. "C4"), duration: string ("4n" or "8n"), time: number (beat offset or step index 0-15) })
7. bassline (array of objects with { note: string (e.g. "C2"), duration: string ("4n"), time: number })`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              key: { type: Type.STRING },
              bpm: { type: Type.NUMBER },
              chords: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              melody: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    note: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    time: { type: Type.NUMBER }
                  },
                  required: ["note", "duration", "time"]
                }
              },
              bassline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    note: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    time: { type: Type.NUMBER }
                  },
                  required: ["note", "duration", "time"]
                }
              }
            },
            required: ["title", "description", "key", "bpm", "chords", "melody", "bassline"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch (error: any) {
      console.error("Gemini compose error:", error);
      res.status(500).json({ error: error.message || "Failed to generate composition" });
    }
  });



  // Direct endpoint for raw script files (guaranteed text/plain, bypasses HTML SPA)
  app.get(["/update.sh", "/deploy.sh", "/Song/update.sh", "/song/update.sh"], (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).sendFile(path.join(__dirname, "update.sh"));
  });

  app.get(["/update_song.py", "/Song/update_song.py", "/song/update_song.py"], (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).sendFile(path.join(__dirname, "update_song.py"));
  });

  const distPath = path.join(__dirname, "dist");
  const isProd = process.env.NODE_ENV === "production" || fs.existsSync(distPath);
  if (isProd) {
    // Serve static compiled assets directly
    app.use("/Song/assets", express.static(path.join(distPath, "assets")));
    app.use("/song/assets", express.static(path.join(distPath, "assets")));
    app.use("/assets", express.static(path.join(distPath, "assets")));
    app.use("/Song", express.static(distPath));
    app.use("/song", express.static(distPath));
    app.use(express.static(distPath));

    // SPA fallback: handle all paths EXCEPT raw update scripts
    app.get("*", (req, res) => {
      if (req.path.endsWith(".sh") || req.path.endsWith(".py")) {
        const file = path.join(__dirname, path.basename(req.path));
        if (fs.existsSync(file)) {
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          return res.status(200).sendFile(file);
        }
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Development mode with Vite middlewares - bypass Vite for .sh and .py scripts
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "custom",
    });
    app.use((req, res, next) => {
      if (req.path === "/update.sh" || req.path === "/deploy.sh") {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.status(200).sendFile(path.join(__dirname, "update.sh"));
      }
      if (req.path === "/update_song.py") {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.status(200).sendFile(path.join(__dirname, "update_song.py"));
      }
      if (req.path === "/maestro-studio.tar.gz") {
        const tarPath = path.join(__dirname, "public", "maestro-studio.tar.gz");
        if (fs.existsSync(tarPath)) {
          res.setHeader("Content-Type", "application/gzip");
          return res.status(200).sendFile(tarPath);
        }
      }
      vite.middlewares(req, res, next);
    });
    app.get("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
