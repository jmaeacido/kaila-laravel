import { api, cfg, patchStore, store } from "./kaila-api.js";
import { getSocket } from "./kaila-realtime.js";

let rtcConfig = null;
let activeCall = null;

function randomCallId() {
    return `call-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function updateCallSession(patch) {
    patchStore({
        callSession: {
            ...(store.callSession || {}),
            ...patch,
        },
    });
}

function clearCallSession() {
    patchStore({ incomingCall: null, callSession: null });
}

async function loadRtcConfig() {
    if (rtcConfig) return rtcConfig;
    rtcConfig = await api("/api/rtc-config");
    return rtcConfig;
}

export async function ensureRealtimeReady() {
    const socket = getSocket();
    if (!socket) {
        throw new Error("Realtime connection unavailable. Start the KAILA socket server.");
    }
    if (socket.connected && socket.__kailaIdentified) return socket;

    return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
            reject(new Error("Realtime connection timed out."));
        }, 8000);

        const finish = () => {
            window.clearTimeout(timeout);
            resolve(socket);
        };

        if (socket.connected && socket.__kailaIdentified) {
            finish();
            return;
        }

        socket.once("kaila.socket.identified", () => {
            socket.__kailaIdentified = true;
            finish();
        });

        if (!socket.connected) {
            socket.once("connect", () => {
                if (socket.__kailaIdentified) finish();
            });
        }
    });
}

export function markSocketIdentified() {
    const socket = getSocket();
    if (socket) socket.__kailaIdentified = true;
}

async function emitSignal(payload) {
    const socket = await ensureRealtimeReady();
    return new Promise((resolve, reject) => {
        socket.emit("kaila.call.signal", payload, (response) => {
            if (response?.ok) resolve(response);
            else reject(new Error(response?.error || "Call signal failed."));
        });
    });
}

export async function checkCalleeOnline(targetUserId) {
    const socket = await ensureRealtimeReady();
    return new Promise((resolve, reject) => {
        socket.emit("kaila.call.check", { targetUserId }, (response) => {
            if (response?.ok) resolve(true);
            else reject(new Error("The other person is offline right now."));
        });
    });
}

function attachRemoteStream(call, stream) {
    if (!call || !stream) return;
    call.remoteStream = stream;
    updateCallSession({ status: "connected" });
    syncCallMedia();
}

function setupPeerConnection(call) {
    const { pc, callId, targetUserId } = call;
    call.pendingCandidates = call.pendingCandidates || [];

    pc.ontrack = (event) => {
        const stream = event.streams?.[0] || new MediaStream([event.track]);
        attachRemoteStream(call, stream);
    };

    pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        emitSignal({
            callId,
            type: "candidate",
            targetUserId,
            candidate: event.candidate,
        }).catch(() => {});
    };

    pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
            updateCallSession({ status: "connected" });
        }
        if (["failed", "disconnected", "closed"].includes(pc.connectionState) && activeCall?.pc === pc) {
            endCall(true);
        }
    };
}

async function flushPendingCandidates(call) {
    if (!call?.pc?.remoteDescription || !call.pendingCandidates?.length) return;
    const queue = [...call.pendingCandidates];
    call.pendingCandidates = [];
    for (const candidate of queue) {
        await call.pc.addIceCandidate(candidate);
    }
}

async function addRemoteCandidate(call, candidate) {
    if (!call?.pc || !candidate) return;
    if (call.pc.remoteDescription) {
        await call.pc.addIceCandidate(candidate);
        return;
    }
    call.pendingCandidates.push(candidate);
}

export function getActiveCall() {
    return activeCall;
}

export async function startCall({ targetUserId, requestId = "", withVideo = false, senderName = "" }) {
    if (activeCall) throw new Error("You are already in a call.");
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support audio/video calls.");
    }

    await ensureRealtimeReady();
    await checkCalleeOnline(targetUserId);
    await loadRtcConfig();

    const callId = randomCallId();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
    const pc = new RTCPeerConnection({ iceServers: rtcConfig.iceServers || [] });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    activeCall = {
        callId,
        pc,
        stream,
        remoteStream: null,
        pendingCandidates: [],
        role: "caller",
        targetUserId,
        withVideo,
    };
    setupPeerConnection(activeCall);

    updateCallSession({
        status: "ringing",
        role: "caller",
        peerId: targetUserId,
        withVideo,
        callId,
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await emitSignal({
        callId,
        type: "offer",
        targetUserId,
        requestId,
        withVideo,
        senderName: senderName || cfg.user?.name || "KAILA user",
        description: offer,
    });

    syncCallMedia();
    return activeCall;
}

export async function acceptCall(signal) {
    if (!signal?.callId) throw new Error("Invalid incoming call.");
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support audio/video calls.");
    }

    await ensureRealtimeReady();
    await loadRtcConfig();

    const callId = signal.callId;
    const withVideo = Boolean(signal.withVideo);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
    const pc = new RTCPeerConnection({ iceServers: rtcConfig.iceServers || [] });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    activeCall = {
        callId,
        pc,
        stream,
        remoteStream: null,
        pendingCandidates: [],
        role: "callee",
        targetUserId: signal.senderId,
        withVideo,
    };
    setupPeerConnection(activeCall);

    await pc.setRemoteDescription(signal.description);
    await flushPendingCandidates(activeCall);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await emitSignal({
        callId,
        type: "answer",
        targetUserId: signal.senderId,
        description: answer,
    });

    clearCallSession();
    updateCallSession({
        status: "connecting",
        role: "callee",
        peerId: signal.senderId,
        peerName: signal.senderName || "KAILA user",
        withVideo,
        callId,
    });

    syncCallMedia();
    return activeCall;
}

export async function handleRemoteSignal(signal) {
    if (!signal?.type) return activeCall;

    if (signal.type === "offer") {
        return { incoming: signal };
    }

    if (signal.type === "reject") {
        endCall(false);
        clearCallSession();
        return null;
    }

    if (signal.type === "hangup") {
        endCall(false);
        clearCallSession();
        return null;
    }

    if (!activeCall || activeCall.callId !== signal.callId) return activeCall;

    if (signal.type === "answer" && signal.description) {
        await activeCall.pc.setRemoteDescription(signal.description);
        await flushPendingCandidates(activeCall);
        updateCallSession({ status: "connecting" });
    } else if (signal.type === "candidate" && signal.candidate) {
        await addRemoteCandidate(activeCall, signal.candidate);
    }

    return activeCall;
}

export async function rejectCall(signal) {
    await emitSignal({
        callId: signal.callId,
        type: "reject",
        targetUserId: signal.senderId,
        reason: "declined",
    }).catch(() => {});
    clearCallSession();
}

export async function hangupCall() {
    if (!activeCall) return;
    await emitSignal({
        callId: activeCall.callId,
        type: "hangup",
        targetUserId: activeCall.targetUserId,
    }).catch(() => {});
    endCall(false);
    clearCallSession();
}

export function endCall(clearSession = true) {
    if (!activeCall) return;
    activeCall.stream?.getTracks()?.forEach((track) => track.stop());
    activeCall.remoteStream?.getTracks()?.forEach((track) => track.stop());
    activeCall.pc?.close();
    activeCall = null;
    if (clearSession) clearCallSession();
}

export function bindCallMedia(container, call = activeCall) {
    if (!container || !call) return;

    const remoteVideo = container.querySelector("[data-call-remote]");
    const localVideo = container.querySelector("[data-call-local]");
    const remoteAudio = container.querySelector("[data-call-audio]");

    if (call.remoteStream) {
        if (remoteVideo) {
            remoteVideo.srcObject = call.remoteStream;
            remoteVideo.hidden = !call.withVideo;
        }
        if (remoteAudio) {
            remoteAudio.srcObject = call.remoteStream;
        }
    }

    if (call.stream && localVideo) {
        localVideo.srcObject = call.stream;
        localVideo.muted = true;
        localVideo.hidden = !call.withVideo;
    }

    const stage = container.querySelector("[data-call-stage]");
    if (stage) {
        stage.classList.toggle("is-connected", Boolean(call.remoteStream || store.callSession?.status === "connected"));
        stage.classList.toggle("is-video", Boolean(call.withVideo));
    }
}

export function syncCallMedia() {
    bindCallMedia(document.querySelector("[data-call-shell]"));
}

/** @deprecated use bindCallMedia */
export function bindRemoteMedia(container, stream) {
    if (!container || !stream) return;
    if (activeCall) {
        attachRemoteStream(activeCall, stream);
        bindCallMedia(container, activeCall);
        return;
    }
    let video = container.querySelector("[data-call-remote]");
    if (!video) {
        video = document.createElement("video");
        video.dataset.callRemote = "1";
        video.autoplay = true;
        video.playsInline = true;
        container.prepend(video);
    }
    video.srcObject = stream;
}

export function bindCallActions({ navigate, toast }) {
    document.querySelectorAll("[data-start-call]").forEach((button) => {
        button.addEventListener("click", async () => {
            const targetUserId = Number(button.dataset.startCall);
            const withVideo = button.dataset.callVideo === "1" || button.dataset.callVideo === "true";
            const requestId = button.dataset.callRequest || "";
            if (!targetUserId) return toast("Select a conversation before starting a call.");
            try {
                await startCall({
                    targetUserId,
                    requestId,
                    withVideo,
                    senderName: store.user?.name,
                });
                toast(withVideo ? "Starting video call..." : "Calling...");
                navigate?.("call");
            } catch (error) {
                endCall();
                toast(error.message);
            }
        });
    });

    document.querySelector("[data-accept-call]")?.addEventListener("click", async () => {
        try {
            await acceptCall(store.incomingCall);
            toast("Call connected.");
            syncCallMedia();
        } catch (error) {
            endCall();
            toast(error.message);
        }
    });

    document.querySelector("[data-reject-call]")?.addEventListener("click", async () => {
        if (store.incomingCall) await rejectCall(store.incomingCall);
        endCall();
        toast("Call declined.");
    });

    document.querySelector("[data-hangup-call]")?.addEventListener("click", async () => {
        await hangupCall();
        toast("Call ended.");
        navigate?.("chat");
    });

    document.querySelector("[data-call-toggle-mic]")?.addEventListener("click", (event) => {
        const track = activeCall?.stream?.getAudioTracks?.()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        event.currentTarget.classList.toggle("is-muted", !track.enabled);
    });

    document.querySelector("[data-call-toggle-video]")?.addEventListener("click", (event) => {
        const track = activeCall?.stream?.getVideoTracks?.()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        event.currentTarget.classList.toggle("is-muted", !track.enabled);
        syncCallMedia();
    });

    syncCallMedia();
}
