import type { getLiveKitToken } from "./src/libs/livekit";
import type { getEnv } from "./src/main";

declare module "bun" {
    interface Env {
        LIVEKIT_TLS: string;
        LIVEKIT_DOMAIN: string;
        LIVEKIT_KEY: string;
        LIVEKIT_SECRET: string;
        LIVEKIT_ROOM: string;
        LIVEKIT_IDENTITY: string;
    }
}

declare global {
    interface Window {
        getLiveKitToken: typeof getLiveKitToken;
        getEnv: typeof getEnv;
    }
}
