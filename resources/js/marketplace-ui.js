import { cfg, onStoreChange, patchStore, store } from "./kaila-api.js";
import { initClientApp } from "./client-ui.js";
import { initProviderApp } from "./provider-ui.js";
import { initStaffApp } from "./staff-ui.js";
import { initRealtime } from "./kaila-realtime.js";
import { endCall, handleRemoteSignal, syncCallMedia } from "./kaila-webrtc.js";
import { toast } from "./kaila-ui-core.js";

function bootApp() {
    const role = cfg.user?.role;
    if (role === "provider") return initProviderApp();
    if (["admin", "customer_service", "ops"].includes(role)) return initStaffApp();
    return initClientApp();
}

const app = bootApp();

initRealtime({
    onCallSignal: async (signal) => {
        if (signal?.type === "offer") {
            patchStore({
                incomingCall: signal,
                callSession: {
                    status: "incoming",
                    peerName: signal.senderName || "KAILA user",
                    peerId: signal.senderId,
                    withVideo: Boolean(signal.withVideo),
                    callId: signal.callId,
                },
            });
            toast(`Incoming ${signal.withVideo ? "video" : "voice"} call from ${signal.senderName || "KAILA user"}`);
            app.navigate?.("call");
            return;
        }

        if (signal?.type === "reject") {
            endCall(false);
            patchStore({ incomingCall: null, callSession: null });
            toast(signal.reason === "no-answer" ? "No answer." : "Call declined.");
            return;
        }

        if (signal?.type === "hangup") {
            endCall(false);
            patchStore({ incomingCall: null, callSession: null });
            toast("Call ended.");
            return;
        }

        await handleRemoteSignal(signal);

        if (signal?.type === "answer") {
            patchStore({
                callSession: {
                    ...(store.callSession || {}),
                    status: "connecting",
                },
            });
        }

        syncCallMedia();
    },
});

onStoreChange(() => {
    if (store.incomingCall && window.location.hash !== "#call") {
        app.navigate?.("call");
    }
});

export default app;
