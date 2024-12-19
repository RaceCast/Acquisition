import type { getLiveKitToken } from "./src/libs/livekit";
import type { logger } from "./src/libs/winston";
import type { getEnv } from "./src/main";

declare module "bun" {
    interface Env {
        LIVEKIT_TLS: string;
        LIVEKIT_DOMAIN: string;
        LIVEKIT_KEY: string;
        LIVEKIT_SECRET: string;
        LIVEKIT_ROOM: string;
        LIVEKIT_IDENTITY: string;
        LOG_LEVEL: 'verbose' | 'debug' | 'info' | 'warn' | 'error';
    }
}

declare global {
    interface Window {
        getLiveKitToken: typeof getLiveKitToken;
        getEnv: typeof getEnv;
        logInfo: typeof logger.info;
    }
}
