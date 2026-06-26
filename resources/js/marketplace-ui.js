import { cfg, onStoreChange, patchStore, store } from "./kaila-api.js";
import { initClientApp } from "./client-ui.js";
import { initProviderApp } from "./provider-ui.js";
import { initStaffApp } from "./staff-ui.js";
import { initRealtime } from "./kaila-realtime.js";
import { handleRemoteSignal } from "./kaila-webrtc.js";
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
            patchStore({ incomingCall: signal });
            toast(`Incoming call from ${signal.senderName || "KAILA user"}`);
            app.navigate?.("call");
            return;
        }
        await handleRemoteSignal(signal);
    },
});

onStoreChange(() => {
    if (store.incomingCall && window.location.hash !== "#call") {
        app.navigate?.("call");
    }
});

export default app;
