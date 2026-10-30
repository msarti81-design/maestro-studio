// server.ts
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
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "mock-key",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var activeRooms = /* @__PURE__ */ new Map();
async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.use((req, res, next) => {
    if (req.url.startsWith("/Song/")) {
      req.url = req.url.substring(5);
    } else if (req.url.startsWith("/song/")) {
      req.url = req.url.substring(5);
    }
    next();
  });
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (request, socket, head) => {
    try {
      const pathname = new URL(request.url || "", `http://${request.headers.host || "localhost"}`).pathname;
      if (pathname === "/ws" || pathname.endsWith("/ws")) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (err) {
      socket.destroy();
    }
  });
  app.use((req, res, next) => {
    const rawUrl = (req.originalUrl || req.url || req.path || "").toLowerCase();
    if (rawUrl.includes("update") || rawUrl.includes("deploy")) {
      console.log("Serving update script for URL:", rawUrl);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      const targetScript = fs.existsSync(path.join(__dirname, "update_5000_full.sh")) ? path.join(__dirname, "update_5000_full.sh") : path.join(__dirname, "update.sh");
      return res.status(200).sendFile(targetScript);
    }
    if (rawUrl.includes("update_song.py")) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).sendFile(path.join(__dirname, "update_song.py"));
    }
    if (rawUrl.includes("maestro-studio.tar.gz")) {
      const tarPath = path.join(__dirname, "public", "maestro-studio.tar.gz");
      if (fs.existsSync(tarPath)) {
        res.setHeader("Content-Type", "application/gzip");
        return res.status(200).sendFile(tarPath);
      }
    }
    next();
  });
  app.get(["/api/version", "/Song/api/version", "/song/api/version"], (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({
      success: true,
      version: "1.0.170",
      buildDate: "2026-10-30 06:20",
      commit: "5b204e6",
      server: "freeserv.it/Song",
      status: "online",
      features: [
        "High-Pass Filter at 35Hz & Anti-Crackle Master Chain for Clean Fast Bass",
        "Extreme Maximum Loudness (Gain x2.8, Sampler +6dB, Compressor -20dB, Limiter -0.2dB)",
        "Professional Mastering Chain",
        "Dual-Stream Voice Engine (WebSocket + WebRTC)"
      ]
    });
  });
  const dataDir = path.join(__dirname, "data");
  const communitySongsFile = path.join(dataDir, "community_songs.json");
  const postcardsFile = path.join(dataDir, "musical_postcards.json");
  const usersFile = path.join(dataDir, "users.json");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(communitySongsFile)) {
    fs.writeFileSync(communitySongsFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(postcardsFile)) {
    fs.writeFileSync(postcardsFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
  }
  app.post("/api/user/register-or-verify", (req, res) => {
    try {
      const { username, deviceId } = req.body;
      if (!username || !deviceId) {
        return res.status(400).json({ success: false, error: "Nome utente e ID dispositivo obbligatori" });
      }
      const cleanName = String(username).trim();
      const nameKey = cleanName.toLowerCase();
      let users = [];
      if (fs.existsSync(usersFile)) {
        users = JSON.parse(fs.readFileSync(usersFile, "utf-8") || "[]");
      }
      const existingUser = users.find((u) => u.usernameKey === nameKey || u.username.toLowerCase() === nameKey);
      if (existingUser) {
        if (existingUser.deviceId === deviceId) {
          return res.json({
            success: true,
            verified: true,
            username: existingUser.username,
            transferCode: existingUser.transferCode,
            isOwner: true
          });
        } else {
          return res.status(403).json({
            success: false,
            error: "\u26D4 Questo nome utente appartiene a un altro dispositivo! Se \xE8 il tuo account, usa il Codice di Trasferimento per importarlo.",
            requiresTransferCode: true
          });
        }
      } else {
        const transferCode = `PASS-${Math.floor(1e5 + Math.random() * 9e5)}`;
        const newUser = {
          username: cleanName,
          usernameKey: nameKey,
          deviceId,
          transferCode,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        users.push(newUser);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        return res.json({
          success: true,
          verified: true,
          username: cleanName,
          transferCode,
          isOwner: true
        });
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || "Errore di registrazione dell'utente" });
    }
  });
  app.post("/api/user/transfer-profile", (req, res) => {
    try {
      const { username, transferCode, newDeviceId } = req.body;
      if (!username || !transferCode || !newDeviceId) {
        return res.status(400).json({ success: false, error: "Parametri mancanti per il trasferimento" });
      }
      const nameKey = String(username).trim().toLowerCase();
      const codeKey = String(transferCode).trim().toUpperCase();
      let users = [];
      if (fs.existsSync(usersFile)) {
        users = JSON.parse(fs.readFileSync(usersFile, "utf-8") || "[]");
      }
      const userIdx = users.findIndex(
        (u) => (u.usernameKey === nameKey || u.username.toLowerCase() === nameKey) && u.transferCode.toUpperCase() === codeKey
      );
      if (userIdx >= 0) {
        users[userIdx].deviceId = newDeviceId;
        users[userIdx].lastTransferredAt = (/* @__PURE__ */ new Date()).toISOString();
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        return res.json({
          success: true,
          message: "\u2713 Account trasferito con successo su questo dispositivo!",
          username: users[userIdx].username,
          transferCode: users[userIdx].transferCode
        });
      } else {
        return res.status(401).json({
          success: false,
          error: "\u274C Nome utente o Codice di Trasferimento errato! Impossibile trasferire l'account."
        });
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message || "Errore di trasferimento dell'account" });
    }
  });
  app.get("/api/community-songs", (req, res) => {
    try {
      if (fs.existsSync(communitySongsFile)) {
        const raw = fs.readFileSync(communitySongsFile, "utf-8");
        const songs = JSON.parse(raw || "[]");
        return res.json(songs);
      }
      res.json([]);
    } catch (e) {
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
      const existingIdx = songs.findIndex((s) => s.id === song.id);
      const songToSave = {
        ...song,
        isPublished: true,
        createdAt: song.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      };
      if (existingIdx >= 0) {
        songs[existingIdx] = songToSave;
      } else {
        songs.unshift(songToSave);
      }
      fs.writeFileSync(communitySongsFile, JSON.stringify(songs, null, 2));
      res.json({ success: true, song: songToSave });
    } catch (e) {
      console.error("Error saving community song:", e);
      res.status(500).json({ error: e.message || "Failed to publish song" });
    }
  });
  app.post("/api/reports/song", (req, res) => {
    try {
      const { songId, songTitle, author, reporter, reason, details } = req.body;
      if (!songId || !songTitle) {
        return res.status(400).json({ error: "Dati della segnalazione incompleti" });
      }
      const reportsFile = path.join(dataDir, "song_reports.json");
      let reports = [];
      if (fs.existsSync(reportsFile)) {
        try {
          reports = JSON.parse(fs.readFileSync(reportsFile, "utf-8") || "[]");
        } catch (e) {
        }
      }
      const newReport = {
        id: `report_${Date.now()}`,
        songId,
        songTitle,
        songAuthor: author || "Sconosciuto",
        reporter: reporter || "Anonimo",
        reason: reason || "Non specificato",
        details: details || "",
        targetEmail: "info@freeserv.it",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "pending_review"
      };
      reports.unshift(newReport);
      fs.writeFileSync(reportsFile, JSON.stringify(reports, null, 2));
      console.log(`[REPORT RECEIVED FOR info@freeserv.it] Song: ${songTitle} (${songId}) | Reason: ${reason}`);
      res.json({
        success: true,
        message: "Segnalazione registrata ed inoltrata a info@freeserv.it",
        report: newReport
      });
    } catch (e) {
      console.error("Error saving song report:", e);
      res.status(500).json({ error: e.message || "Impossibile salvare la segnalazione" });
    }
  });
  app.get("/api/postcards", (req, res) => {
    try {
      const recipient = String(req.query.recipient || "").trim().toLowerCase();
      if (fs.existsSync(postcardsFile)) {
        const raw = fs.readFileSync(postcardsFile, "utf-8");
        const list = JSON.parse(raw || "[]");
        if (recipient) {
          const filtered = list.filter((p) => p.recipient && p.recipient.toLowerCase() === recipient);
          return res.json(filtered);
        }
        return res.json(list);
      }
      res.json([]);
    } catch (e) {
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
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      list.unshift(newCard);
      fs.writeFileSync(postcardsFile, JSON.stringify(list, null, 2));
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "postcard:new", postcard: newCard }));
        }
      });
      res.json({ success: true, postcard: newCard });
    } catch (e) {
      res.status(500).json({ error: e.message || "Failed to send postcard" });
    }
  });
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
    } catch (e) {
      console.error("Download export error:", e);
      res.status(500).send("Download fallito");
    }
  });
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
    } catch (error) {
      console.error("Gemini compose error:", error);
      res.status(500).json({ error: error.message || "Failed to generate composition" });
    }
  });
  function getOrCreateRoom(roomId, mode = "masterclass", host = "Host") {
    const rId = roomId ? String(roomId).trim().toUpperCase() : "LOBBY";
    if (!activeRooms.has(rId)) {
      activeRooms.set(rId, {
        id: rId,
        mode: mode || "masterclass",
        host: host || "Host",
        clients: /* @__PURE__ */ new Map(),
        relayTurnIndex: 0,
        songQueue: [],
        events: []
      });
    }
    return activeRooms.get(rId);
  }
  function getRoom(roomId) {
    const rId = roomId ? String(roomId).trim().toUpperCase() : "LOBBY";
    return activeRooms.get(rId);
  }
  wss.on("connection", (ws) => {
    let currentClient = null;
    ws.on("message", (messageRaw) => {
      try {
        const msg = JSON.parse(messageRaw.toString());
        const { type, roomId, username, mode, role } = msg;
        if (type === "room:join") {
          const rId = roomId ? String(roomId).trim().toUpperCase() : "LOBBY";
          const cleanRole = String(role || "allievo").trim();
          let room2 = getRoom(rId);
          if (!room2) {
            room2 = getOrCreateRoom(rId, mode, username);
          }
          const effectiveId = msg.clientId && String(msg.clientId).trim() || `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          if (room2.clients.has(effectiveId)) {
            currentClient = room2.clients.get(effectiveId);
            currentClient.ws = ws;
            currentClient.username = username || currentClient.username;
            currentClient.role = role || currentClient.role;
            currentClient.lastActive = Date.now();
          } else {
            currentClient = {
              ws,
              id: effectiveId,
              username: username || (role === "maestro" ? "Maestro" : "Allievo"),
              role: role || "player",
              roomId: rId,
              score: 0,
              lastActive: Date.now()
            };
            room2.clients.set(effectiveId, currentClient);
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "room:welcome",
              clientId: effectiveId,
              roomId: rId,
              role: currentClient.role,
              lastTeacherPhrase: room2.lastTeacherPhrase || null,
              lastStudentProgress: room2.lastStudentProgress || null
            }));
          }
          broadcastRoomState(room2);
          return;
        }
        if (!currentClient) return;
        currentClient.lastActive = Date.now();
        const room = activeRooms.get(currentClient.roomId);
        if (!room) return;
        if (type === "piano:key_event") {
          const keyPayload = {
            type: "piano:key_event",
            sender: currentClient.username,
            senderId: currentClient.id,
            note: msg.note,
            eventType: msg.eventType,
            // 'down' | 'up'
            channel: msg.channel || "melody",
            // 'melody' | 'bassline'
            role: currentClient.role
          };
          if (!room.events) room.events = [];
          room.events.push({
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: "piano:key_event",
            sender: currentClient.username,
            timestamp: Date.now(),
            data: keyPayload
          });
          if (room.events.length > 80) room.events.shift();
          broadcastToRoom(room, currentClient.id, keyPayload);
        } else if (type === "piano:relay_advance") {
          const clientList = Array.from(room.clients.values());
          room.relayTurnIndex = (room.relayTurnIndex + 1) % Math.max(1, clientList.length);
          const activeUser = clientList[room.relayTurnIndex];
          broadcastToRoom(room, "", {
            type: "piano:relay_state",
            activeUser: activeUser ? activeUser.username : currentClient.username,
            activeUserId: activeUser ? activeUser.id : currentClient.id,
            measure: msg.measure || 1,
            success: msg.success ?? true
          });
        } else if (type === "piano:battle_score") {
          currentClient.score = msg.score || 0;
          broadcastToRoom(room, "", {
            type: "piano:battle_scores",
            scores: Array.from(room.clients.values()).map((c) => ({
              id: c.id,
              username: c.username,
              score: c.score,
              combo: msg.combo || 0
            }))
          });
        } else if (type === "piano:guess_submit") {
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
            score: currentClient.score
          });
        } else if (type === "piano:reaction") {
          broadcastToRoom(room, "", {
            type: "piano:reaction",
            emoji: msg.emoji || "\u{1F44F}",
            sender: currentClient.username
          });
        } else if (type === "piano:queue_add") {
          if (msg.songTitle) {
            room.songQueue.push({ title: msg.songTitle, requester: currentClient.username });
            broadcastToRoom(room, "", {
              type: "piano:queue_updated",
              queue: room.songQueue
            });
          }
        } else if (type === "piano:set_song") {
          room.currentSongTitle = msg.songTitle;
          room.currentSongNotes = msg.songNotes;
          broadcastToRoom(room, "", {
            type: "piano:song_changed",
            songTitle: msg.songTitle,
            songNotes: msg.songNotes,
            bpm: msg.bpm || 100
          });
        } else if (type === "piano:teacher_phrase") {
          const phrasePayload = {
            sender: currentClient.username,
            notes: msg.notes || [],
            phraseData: msg.phraseData || [],
            openWaterfall: msg.openWaterfall ?? false,
            displayMode: msg.displayMode || "arcade"
          };
          room.lastTeacherPhrase = phrasePayload;
          if (!room.events) room.events = [];
          room.events.push({
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: "piano:teacher_phrase",
            sender: currentClient.username,
            timestamp: Date.now(),
            data: phrasePayload
          });
          if (room.events.length > 80) room.events.shift();
          broadcastToRoom(room, currentClient.id, {
            type: "piano:teacher_phrase",
            ...phrasePayload
          });
        } else if (type === "piano:phrase_progress") {
          const progressPayload = {
            sender: currentClient.username,
            currentIndex: msg.currentIndex || 0,
            totalNotes: msg.totalNotes || 0,
            completed: msg.completed || false
          };
          room.lastStudentProgress = progressPayload;
          if (!room.events) room.events = [];
          room.events.push({
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: "piano:phrase_progress",
            sender: currentClient.username,
            timestamp: Date.now(),
            data: progressPayload
          });
          if (room.events.length > 80) room.events.shift();
          broadcastToRoom(room, currentClient.id, {
            type: "piano:phrase_progress",
            ...progressPayload
          });
        } else if (type === "webrtc:offer" || type === "webrtc:answer" || type === "webrtc:candidate") {
          broadcastToRoom(room, currentClient.id, {
            type,
            sender: currentClient.username,
            senderId: currentClient.id,
            sdp: msg.sdp,
            candidate: msg.candidate
          });
        } else if (type === "piano:audio_chunk") {
          broadcastToRoom(room, currentClient.id, {
            type: "piano:audio_chunk",
            sender: currentClient.username,
            senderId: currentClient.id,
            audio: msg.audio
          });
        } else if (type === "piano:voice_status") {
          broadcastToRoom(room, currentClient.id, {
            type: "piano:voice_status",
            sender: currentClient.username,
            senderId: currentClient.id,
            isMuted: msg.isMuted,
            isActive: msg.isActive
          });
        }
      } catch (err) {
        console.warn("WebSocket message error:", err);
      }
    });
    ws.on("close", () => {
      if (currentClient) {
        currentClient.ws = null;
        currentClient.lastActive = Date.now();
        const room = activeRooms.get(currentClient.roomId);
        if (room) {
          setTimeout(() => {
            const r = activeRooms.get(currentClient.roomId);
            if (r) {
              const c = r.clients.get(currentClient.id);
              if (c && (!c.ws || c.ws.readyState !== WebSocket.OPEN) && Date.now() - (c.lastActive || 0) > 3e4) {
                r.clients.delete(currentClient.id);
                broadcastRoomState(r);
              }
            }
          }, 3e4);
        }
      }
    });
  });
  app.post(["/api/room/join", "/Song/api/room/join", "/song/api/room/join"], (req, res) => {
    try {
      const { roomId, username, role, mode, clientId } = req.body;
      const rId = roomId ? String(roomId).trim().toUpperCase() : "LOBBY";
      const cleanUser = String(username || (role === "maestro" ? "Maestro" : "Allievo")).trim();
      const cleanRole = String(role || "allievo").trim();
      let activeRoom = getRoom(rId);
      if (!activeRoom) {
        activeRoom = getOrCreateRoom(rId, mode || "masterclass", cleanUser);
      }
      const cId = clientId && String(clientId).trim() || `http_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const client = activeRoom.clients.get(cId) || {
        id: cId,
        username: cleanUser,
        role: cleanRole,
        roomId: rId,
        score: 0,
        lastActive: Date.now()
      };
      client.username = cleanUser;
      client.role = cleanRole;
      client.lastActive = Date.now();
      activeRoom.clients.set(cId, client);
      broadcastRoomState(activeRoom);
      const members = Array.from(activeRoom.clients.values()).map((c) => ({
        id: c.id,
        username: c.username,
        role: c.role,
        score: c.score
      }));
      res.json({
        success: true,
        roomId: rId,
        clientId: cId,
        members,
        lastTeacherPhrase: activeRoom.lastTeacherPhrase || null,
        lastStudentProgress: activeRoom.lastStudentProgress || null
      });
    } catch (e) {
      res.status(500).json({ error: e.message || "Failed to join room" });
    }
  });
  app.get(["/api/room/:roomId/state", "/Song/api/room/:roomId/state", "/song/api/room/:roomId/state"], (req, res) => {
    try {
      const rId = String(req.params.roomId || "").trim().toUpperCase();
      const clientId = String(req.query.clientId || "").trim();
      const room = activeRooms.get(rId);
      if (!room) {
        return res.json({ success: true, roomId: rId, members: [], exists: false });
      }
      if (clientId && room.clients.has(clientId)) {
        room.clients.get(clientId).lastActive = Date.now();
      }
      cleanStaleClients(room);
      const members = Array.from(room.clients.values()).map((c) => ({
        id: c.id,
        username: c.username,
        role: c.role,
        score: c.score
      }));
      res.json({
        success: true,
        roomId: rId,
        exists: true,
        mode: room.mode,
        host: room.host,
        members,
        lastTeacherPhrase: room.lastTeacherPhrase || null,
        lastStudentProgress: room.lastStudentProgress || null
      });
    } catch (e) {
      res.status(500).json({ error: e.message || "Failed to get room state" });
    }
  });
  app.post(["/api/room/:roomId/event", "/Song/api/room/:roomId/event", "/song/api/room/:roomId/event"], (req, res) => {
    try {
      const rId = String(req.params.roomId || "").trim().toUpperCase();
      const { type, sender, data } = req.body;
      const room = getOrCreateRoom(rId);
      const eventItem = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        sender: sender || "Anonymous",
        timestamp: Date.now(),
        data: data || req.body
      };
      if (!room.events) room.events = [];
      room.events.push(eventItem);
      if (room.events.length > 80) room.events.shift();
      if (type === "piano:teacher_phrase") {
        room.lastTeacherPhrase = data || req.body;
      } else if (type === "piano:phrase_progress") {
        room.lastStudentProgress = data || req.body;
      }
      broadcastToRoom(room, "", {
        type,
        sender,
        ...data || req.body
      });
      res.json({ success: true, eventId: eventItem.id });
    } catch (e) {
      res.status(500).json({ error: e.message || "Failed to send event" });
    }
  });
  app.get(["/api/room/:roomId/events", "/Song/api/room/:roomId/events", "/song/api/room/:roomId/events"], (req, res) => {
    try {
      const rId = String(req.params.roomId || "").trim().toUpperCase();
      const since = Number(req.query.since || 0);
      const clientId = String(req.query.clientId || "").trim();
      const room = activeRooms.get(rId);
      if (!room) {
        return res.json({ events: [] });
      }
      if (clientId && room.clients.has(clientId)) {
        room.clients.get(clientId).lastActive = Date.now();
      }
      const events = (room.events || []).filter((e) => e.timestamp > since);
      res.json({
        events,
        lastTeacherPhrase: room.lastTeacherPhrase || null,
        lastStudentProgress: room.lastStudentProgress || null
      });
    } catch (e) {
      res.status(500).json({ error: e.message || "Failed to get events" });
    }
  });
  function cleanStaleClients(room) {
    const now = Date.now();
    for (const [id, client] of room.clients.entries()) {
      const isWsDead = !client.ws || client.ws.readyState !== WebSocket.OPEN;
      if (isWsDead && now - (client.lastActive || 0) > 45e3) {
        room.clients.delete(id);
      }
    }
  }
  function broadcastRoomState(room) {
    cleanStaleClients(room);
    const members = Array.from(room.clients.values()).map((c) => ({
      id: c.id,
      username: c.username,
      role: c.role,
      score: c.score
    }));
    broadcastToRoom(room, "", {
      type: "room:state",
      roomId: room.id,
      mode: room.mode,
      host: room.host,
      members,
      queue: room.songQueue,
      currentSongTitle: room.currentSongTitle,
      lastTeacherPhrase: room.lastTeacherPhrase || null,
      lastStudentProgress: room.lastStudentProgress || null
    });
  }
  function broadcastToRoom(room, excludeClientId, payload) {
    const jsonStr = JSON.stringify(payload);
    room.clients.forEach((client, id) => {
      if (id !== excludeClientId && client.ws && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(jsonStr);
      }
    });
  }
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
    const staticOptions = {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    };
    app.use("/assets", express.static(path.join(distPath, "assets"), staticOptions));
    app.use("/Song/assets", express.static(path.join(distPath, "assets"), staticOptions));
    app.use("/song/assets", express.static(path.join(distPath, "assets"), staticOptions));
    app.use("/Song", express.static(distPath, staticOptions));
    app.use("/song", express.static(distPath, staticOptions));
    app.use(express.static(distPath, staticOptions));
    app.get(["/song", "/song/*", "/Song", "/Song/*", "/piano", "/piano/*", "/sheet", "/sheet/*", "/jam", "/jam/*", "/ai", "/ai/*", "/social", "/social/*"], (req, res, next) => {
      if (path.extname(req.path)) {
        return next();
      }
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
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
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "custom"
    });
    app.use((req, res, next) => {
      if (req.path.endsWith(".sh") || req.path.endsWith(".py")) {
        const file = path.join(__dirname, path.basename(req.path));
        if (fs.existsSync(file)) {
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          return res.status(200).sendFile(file);
        }
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
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }
  const PORT = Number(process.env.PORT) || 3e3;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server & WebSockets running on http://localhost:${PORT}`);
  });
}
startServer();
