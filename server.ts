import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
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

interface RoomClient {
  ws: WebSocket;
  id: string;
  username: string;
  role: string;
  roomId: string;
  score: number;
}

interface RoomState {
  id: string;
  mode: string;
  host: string;
  clients: Map<string, RoomClient>;
  relayTurnIndex: number;
  songQueue: { title: string; requester: string }[];
  currentSongTitle?: string;
  currentSongNotes?: any[];
}

const activeRooms = new Map<string, RoomState>();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

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

  // Storage Paths for Community Songs & Musical Postcards (Audio-Lettere)
  const dataDir = path.join(__dirname, "data");
  const communitySongsFile = path.join(dataDir, "community_songs.json");
  const postcardsFile = path.join(dataDir, "musical_postcards.json");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(communitySongsFile)) {
    fs.writeFileSync(communitySongsFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(postcardsFile)) {
    fs.writeFileSync(postcardsFile, JSON.stringify([], null, 2));
  }

  // --- API ROUTE: COMMUNITY SONGS ---
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

  // --- API ROUTE: MUSICAL POSTCARDS (Audio-Lettere) ---
  app.get("/api/postcards", (req, res) => {
    try {
      const recipient = String(req.query.recipient || "").trim().toLowerCase();
      if (fs.existsSync(postcardsFile)) {
        const raw = fs.readFileSync(postcardsFile, "utf-8");
        const list = JSON.parse(raw || "[]");
        if (recipient) {
          const filtered = list.filter((p: any) => p.recipient && p.recipient.toLowerCase() === recipient);
          return res.json(filtered);
        }
        return res.json(list);
      }
      res.json([]);
    } catch (e: any) {
      res.json([]);
    }
  });

  app.post("/api/postcards", (req, res) => {
    try {
      const card = req.body;
      if (!card || !card.title || !card.melody) {
        return res.status(400).json({ error: "Titolo e melodia obbligatori" });
      }

      let list = [];
      if (fs.existsSync(postcardsFile)) {
        const raw = fs.readFileSync(postcardsFile, "utf-8");
        list = JSON.parse(raw || "[]");
      }

      const newCard = {
        id: `card_${Date.now()}`,
        sender: card.sender || "Un Amico",
        recipient: card.recipient || "Tutti",
        title: card.title,
        message: card.message || "Ti ho inviato una cartolina musicale!",
        melody: card.melody,
        bpm: card.bpm || 100,
        createdAt: new Date().toISOString()
      };

      list.unshift(newCard);
      fs.writeFileSync(postcardsFile, JSON.stringify(list, null, 2));

      // Broadcast to WebSocket clients if listening for postcards
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "postcard:new", postcard: newCard }));
        }
      });

      res.json({ success: true, postcard: newCard });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to send postcard" });
    }
  });

  // --- API ROUTE: NATIVE DOWNLOAD EXPORT ---
  app.post("/api/download-export", (req, res) => {
    try {
      const { filename, content, mimeType, isBase64 } = req.body;
      if (!filename || !content) {
        return res.status(400).send("Parametri mancanti");
      }
      const safeFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
      res.setHeader("Content-Type", mimeType || "application/octet-stream");

      if (isBase64) {
        const buffer = Buffer.from(content, "base64");
        return res.send(buffer);
      } else {
        return res.send(content);
      }
    } catch (e: any) {
      console.error("Download export error:", e);
      res.status(500).send("Download fallito");
    }
  });

  // --- API ROUTE: AI MUSIC COMPOSER ---
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
6. melody (array of objects with { note: string (e.g. "C4"), duration: string ("4n" or "8n"), time: number })
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

  // --- WEBSOCKET REAL-TIME MULTIPLAYER SERVER ---
  wss.on("connection", (ws) => {
    let currentClient: RoomClient | null = null;

    ws.on("message", (messageRaw) => {
      try {
        const msg = JSON.parse(messageRaw.toString());
        const { type, roomId, username, mode, role } = msg;

        if (type === "room:join") {
          const rId = roomId || "lobby";
          if (!activeRooms.has(rId)) {
            activeRooms.set(rId, {
              id: rId,
              mode: mode || "pianobar",
              host: username || "Host",
              clients: new Map(),
              relayTurnIndex: 0,
              songQueue: [],
            });
          }

          const room = activeRooms.get(rId)!;
          const clientId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          currentClient = {
            ws,
            id: clientId,
            username: username || "Maestro",
            role: role || "player",
            roomId: rId,
            score: 0,
          };

          room.clients.set(clientId, currentClient);

          // Broadcast user joined & room status to everyone in the room
          broadcastRoomState(room);
          return;
        }

        if (!currentClient) return;
        const room = activeRooms.get(currentClient.roomId);
        if (!room) return;

        // 1. Masterclass & Piano Key Press Broadcast (Real-time live piano)
        if (type === "piano:key_event") {
          broadcastToRoom(room, currentClient.id, {
            type: "piano:key_event",
            sender: currentClient.username,
            senderId: currentClient.id,
            note: msg.note,
            eventType: msg.eventType, // 'down' | 'up'
            channel: msg.channel || "melody", // 'melody' | 'bassline'
            role: currentClient.role,
          });
        }

        // 2. Staffetta Musicale (Turn-based relay measure advance)
        else if (type === "piano:relay_advance") {
          const clientList = Array.from(room.clients.values());
          room.relayTurnIndex = (room.relayTurnIndex + 1) % Math.max(1, clientList.length);
          const activeUser = clientList[room.relayTurnIndex];
          broadcastToRoom(room, "", {
            type: "piano:relay_state",
            activeUser: activeUser ? activeUser.username : currentClient.username,
            activeUserId: activeUser ? activeUser.id : currentClient.id,
            measure: msg.measure || 1,
            success: msg.success ?? true,
          });
        }

        // 3. Duelli Musicali / Piano Battle (Real-time score & combos)
        else if (type === "piano:battle_score") {
          currentClient.score = msg.score || 0;
          broadcastToRoom(room, "", {
            type: "piano:battle_scores",
            scores: Array.from(room.clients.values()).map((c) => ({
              id: c.id,
              username: c.username,
              score: c.score,
              combo: msg.combo || 0,
            })),
          });
        }

        // 4. Indovina la Canzone (Name That Tune)
        else if (type === "piano:guess_submit") {
          const correctTitle = (room.currentSongTitle || "").toLowerCase().trim();
          const guess = (msg.guess || "").toLowerCase().trim();
          const isCorrect = correctTitle.length > 0 && (guess.includes(correctTitle) || correctTitle.includes(guess));

          if (isCorrect) {
            currentClient.score += 100;
          }

          broadcastToRoom(room, "", {
            type: "piano:guess_result",
            guesser: currentClient.username,
            guess: msg.guess,
            isCorrect,
            winner: isCorrect ? currentClient.username : null,
            score: currentClient.score,
          });
        }

        // 5. Piano Bar & Virtual Audience Floating Reactions (👏 🎹 🔥 🌟 ❤️ 🎵)
        else if (type === "piano:reaction") {
          broadcastToRoom(room, "", {
            type: "piano:reaction",
            emoji: msg.emoji || "👏",
            sender: currentClient.username,
          });
        }

        // 6. Piano Bar Song Queue Requests
        else if (type === "piano:queue_add") {
          if (msg.songTitle) {
            room.songQueue.push({ title: msg.songTitle, requester: currentClient.username });
            broadcastToRoom(room, "", {
              type: "piano:queue_updated",
              queue: room.songQueue,
            });
          }
        }

        // 7. Set active song for room
        else if (type === "piano:set_song") {
          room.currentSongTitle = msg.songTitle;
          room.currentSongNotes = msg.songNotes;
          broadcastToRoom(room, "", {
            type: "piano:song_changed",
            songTitle: msg.songTitle,
            songNotes: msg.songNotes,
            bpm: msg.bpm || 100,
          });
        }

      } catch (err) {
        console.warn("WebSocket message error:", err);
      }
    });

    ws.on("close", () => {
      if (currentClient) {
        const room = activeRooms.get(currentClient.roomId);
        if (room) {
          room.clients.delete(currentClient.id);
          if (room.clients.size === 0) {
            activeRooms.delete(room.id);
          } else {
            broadcastRoomState(room);
          }
        }
      }
    });
  });

  function broadcastRoomState(room: RoomState) {
    const members = Array.from(room.clients.values()).map((c) => ({
      id: c.id,
      username: c.username,
      role: c.role,
      score: c.score,
    }));

    broadcastToRoom(room, "", {
      type: "room:state",
      roomId: room.id,
      mode: room.mode,
      host: room.host,
      members,
      queue: room.songQueue,
      currentSongTitle: room.currentSongTitle,
    });
  }

  function broadcastToRoom(room: RoomState, excludeClientId: string, payload: any) {
    const jsonStr = JSON.stringify(payload);
    room.clients.forEach((client, id) => {
      if (id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(jsonStr);
      }
    });
  }

  // Direct endpoint for raw script files
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
    app.get(["/song", "/Song", "/piano", "/sheet", "/jam", "/ai", "/social"], (req, res, next) => {
      if (!req.originalUrl.endsWith("/")) {
        return res.redirect(301, req.originalUrl + "/");
      }
      next();
    });

    app.use("/assets", express.static(path.join(distPath, "assets")));
    app.use("/Song/assets", express.static(path.join(distPath, "assets")));
    app.use("/song/assets", express.static(path.join(distPath, "assets")));
    app.use("/Song", express.static(distPath));
    app.use("/song", express.static(distPath));
    app.use(express.static(distPath));

    app.get(["/song", "/song/*", "/Song", "/Song/*", "/piano", "/piano/*", "/sheet", "/sheet/*", "/jam", "/jam/*", "/ai", "/ai/*", "/social", "/social/*"], (req, res, next) => {
      if (path.extname(req.path)) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });

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
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server & WebSockets running on http://localhost:${PORT}`);
  });
}

startServer();
