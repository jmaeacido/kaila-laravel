const crypto = require("crypto");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = Number(process.env.KAILA_SOCKET_PORT || process.env.PORT || 6002);
const BEARER = String(process.env.KAILA_SOCKET_BEARER_TOKEN || "").trim();
const CALL_RING_TIMEOUT_MS = Number(process.env.KAILA_CALL_RING_TIMEOUT_MS || 45000);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
  path: process.env.KAILA_SOCKET_CLIENT_PATH || "/socket.io",
});

const activeCalls = new Map();
const onlineUsers = new Map();

function authBearer(req, res, next) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!BEARER || token !== BEARER) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "kaila-socket" }));

app.post("/internal/broadcast", authBearer, (req, res) => {
  const event = String(req.body?.event || "");
  const payload = req.body?.payload ?? {};
  const rooms = Array.isArray(req.body?.rooms) ? req.body.rooms : ["kaila-mvp"];
  if (!event) return res.status(422).json({ error: "Event required" });
  rooms.forEach((room) => io.to(room).emit(event, payload));
  res.json({ ok: true, event, rooms });
});

function userSocketCount(userId) {
  return onlineUsers.get(String(userId)) || 0;
}

function relayCallSignal(targetUserId, signal) {
  io.to(`user:${targetUserId}`).emit("kaila.call.signal", signal);
}

function scheduleCallRingExpiry(callId) {
  setTimeout(() => {
    const call = activeCalls.get(callId);
    if (!call || call.answeredByUserId) return;
    activeCalls.delete(callId);
    relayCallSignal(call.callerId, { callId, type: "reject", reason: "no-answer" });
    relayCallSignal(call.targetUserId, { callId, type: "reject", reason: "no-answer" });
  }, CALL_RING_TIMEOUT_MS);
}

io.on("connection", (socket) => {
  socket.on("subscribe", (channel) => {
    if (!channel) return;
    socket.join(channel);
    socket.emit("kaila.socket.ready", { channel, socketId: socket.id });
  });

  socket.on("identify", (userId, acknowledge = () => {}) => {
    const id = String(userId || "").trim();
    if (socket.data.userId) {
      const prev = String(socket.data.userId);
      onlineUsers.set(prev, Math.max(0, (onlineUsers.get(prev) || 1) - 1));
      socket.leave(`user:${prev}`);
    }
    socket.data.userId = id;
    if (!id) {
      acknowledge({ ok: false, error: "User id required" });
      return;
    }
    socket.join(`user:${id}`);
    onlineUsers.set(id, (onlineUsers.get(id) || 0) + 1);
    socket.emit("kaila.socket.identified", { userId: id });
    acknowledge({ ok: true, userId: id });
  });

  socket.on("kaila.call.check", (payload = {}, acknowledge = () => {}) => {
    const targetUserId = String(payload.targetUserId || payload.directUserId || "");
    acknowledge({ ok: Boolean(targetUserId && userSocketCount(targetUserId)) });
  });

  socket.on("kaila.call.signal", (payload = {}, acknowledge = () => {}) => {
    try {
      const userId = String(socket.data.userId || "");
      if (!userId) throw new Error("Identify socket before calling");
      const type = String(payload.type || "");
      const callId = String(payload.callId || "");
      const targetUserId = String(payload.targetUserId || payload.directUserId || "");
      if (!callId || !type) throw new Error("Invalid call signal");

      if (type === "offer") {
        if (!targetUserId) throw new Error("Call recipient required");
        activeCalls.set(callId, {
          callerId: userId,
          targetUserId,
          requestId: String(payload.requestId || ""),
          withVideo: Boolean(payload.withVideo),
          callerName: String(payload.senderName || "KAILA user"),
          offerDescription: payload.description || null,
          answeredByUserId: "",
        });
        scheduleCallRingExpiry(callId);
        relayCallSignal(targetUserId, { ...payload, senderId: userId, type: "offer" });
        return acknowledge({ ok: true });
      }

      const call = activeCalls.get(callId);
      if (!call) return acknowledge({ ok: true, code: "call_expired" });

      const peerId = call.callerId === userId ? call.targetUserId : call.callerId;
      if (type === "answer") {
        call.answeredByUserId = userId;
      }
      if (["hangup", "reject", "busy"].includes(type)) {
        activeCalls.delete(callId);
      }
      relayCallSignal(peerId, { ...payload, senderId: userId });
      acknowledge({ ok: true });
    } catch (error) {
      acknowledge({ ok: false, error: error.message || "Call signal failed" });
    }
  });

  socket.on("disconnect", () => {
    const userId = String(socket.data.userId || "");
    if (!userId) return;
    onlineUsers.set(userId, Math.max(0, (onlineUsers.get(userId) || 1) - 1));
  });
});

server.listen(PORT, () => {
  console.log(`KAILA socket listening on ${PORT}`);
});
