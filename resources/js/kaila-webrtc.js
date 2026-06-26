import { api, cfg } from "./kaila-api.js";
import { getSocket } from "./kaila-realtime.js";

let rtcConfig = null;
let activeCall = null;

function randomCallId() {
    return `call-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function loadRtcConfig() {
    if (rtcConfig) return rtcConfig;
    rtcConfig = await api("/api/rtc-config");
    return rtcConfig;
}

function emitSignal(payload) {
    const socket = getSocket();
    if (!socket?.connected) throw new Error("Realtime connection unavailable.");
    return new Promise((resolve, reject) => {
        socket.emit("kaila.call.signal", payload, (response) => {
            if (response?.ok) resolve(response);
            else reject(new Error(response?.error || "Call signal failed."));
        });
    });
}

export function getActiveCall() {
    return activeCall;
}

export async function startCall({ targetUserId, requestId = "", withVideo = false, senderName = "" }) {
    await loadRtcConfig();
    const callId = randomCallId();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
    const pc = new RTCPeerConnection({ iceServers: rtcConfig.iceServers || [] });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        emitSignal({
            callId,
            type: "candidate",
            targetUserId,
            candidate: event.candidate,
        }).catch(() => {});
    };

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

    activeCall = { callId, pc, stream, role: "caller", targetUserId, withVideo };
    return activeCall;
}

export async function acceptCall(signal) {
    await loadRtcConfig();
    const callId = signal.callId;
    const withVideo = Boolean(signal.withVideo);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
    const pc = new RTCPeerConnection({ iceServers: rtcConfig.iceServers || [] });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        emitSignal({
            callId,
            type: "candidate",
            targetUserId: signal.senderId,
            candidate: event.candidate,
        }).catch(() => {});
    };

    await pc.setRemoteDescription(signal.description);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await emitSignal({
        callId,
        type: "answer",
        targetUserId: signal.senderId,
        description: answer,
    });

    activeCall = { callId, pc, stream, role: "callee", targetUserId: signal.senderId, withVideo };
    return activeCall;
}

export async function handleRemoteSignal(signal) {
    if (!signal?.type) return activeCall;

    if (signal.type === "offer") {
        return { incoming: signal };
    }

    if (!activeCall || activeCall.callId !== signal.callId) return activeCall;

    if (signal.type === "answer" && signal.description) {
        await activeCall.pc.setRemoteDescription(signal.description);
    } else if (signal.type === "candidate" && signal.candidate) {
        await activeCall.pc.addIceCandidate(signal.candidate);
    } else if (signal.type === "reject" || signal.type === "hangup") {
        endCall();
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
}

export async function hangupCall() {
    if (!activeCall) return;
    await emitSignal({
        callId: activeCall.callId,
        type: "hangup",
        targetUserId: activeCall.targetUserId,
    }).catch(() => {});
    endCall();
}

export function endCall() {
    if (!activeCall) return;
    activeCall.stream?.getTracks()?.forEach((track) => track.stop());
    activeCall.pc?.close();
    activeCall = null;
}

export function bindRemoteMedia(container, stream) {
    if (!container || !stream) return;
    let video = container.querySelector("video[data-call-video]");
    if (!video) {
        video = document.createElement("video");
        video.dataset.callVideo = "1";
        video.autoplay = true;
        video.playsInline = true;
        container.prepend(video);
    }
    video.srcObject = stream;
}
