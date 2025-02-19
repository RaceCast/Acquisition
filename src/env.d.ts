import type { getLiveKitToken } from "./libs/livekit.ts";
import type { logger } from "./libs/winston.ts";
import type { getEnv } from "./main.ts";

declare module "bun" {
    interface Env {
        LIVEKIT_TLS: string;
        LIVEKIT_DOMAIN: string;
        LIVEKIT_KEY: string;
        LIVEKIT_SECRET: string;
        LIVEKIT_ROOM: string;
        LOG_LEVEL: 'verbose' | 'debug' | 'info' | 'warn' | 'error';
    }
}

declare global {
    interface Window {
        getLiveKitToken: typeof getLiveKitToken;
        getEnv: typeof getEnv;
        logWarn: typeof logger.warn;
        logInfo: typeof logger.info;
        logDebug: typeof logger.debug;
    }
}
