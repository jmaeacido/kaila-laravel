import { io } from "socket.io-client";
import {
    cfg,
    loadDirectMessages,
    loadFeed,
    loadJobMessages,
    refreshState,
    store,
} from "./kaila-api.js";

let socket = null;

export function getSocket() {
    return socket;
}

export function initRealtime(handlers = {}) {
    const url = cfg.socketUrl;
    const userId = cfg.user?.id;
    if (!url || !userId) return null;

    if (socket) {
        socket.disconnect();
        socket = null;
    }

    socket = io(url, {
        path: cfg.socketPath || "/socket.io",
        transports: ["websocket", "polling"],
        withCredentials: true,
    });

    socket.on("connect", () => {
        socket.emit("subscribe", "kaila-mvp");
        socket.emit("identify", String(userId));
    });

    socket.on("kaila.state.updated", () => refreshState());
    socket.on("kaila.stateUpdated", () => refreshState());
    socket.on("kaila.request.created", () => refreshState());
    socket.on("kaila.request.action", (payload) => {
        refreshState();
        if (payload?.requestId && store.selectedRequestId === payload.requestId) {
            loadJobMessages(payload.requestId).catch(() => {});
        }
    });

    socket.on("kaila.message.saved", (payload) => {
        if (payload?.requestId && store.selectedRequestId === payload.requestId) {
            loadJobMessages(payload.requestId).catch(() => {});
        }
        refreshState();
    });

    socket.on("kaila.direct-message.saved", (payload) => {
        const peerId = payload?.message?.sender_id === userId
            ? payload?.message?.recipient_id
            : payload?.message?.sender_id;
        if (peerId && store.supportDesk?.id === peerId) {
            loadDirectMessages(peerId).catch(() => {});
        }
    });

    socket.on("kaila.feed.updated", () => loadFeed().catch(() => {}));

    socket.on("kaila.call.signal", (signal) => handlers.onCallSignal?.(signal));

    return socket;
}
