import { $ } from "bun";
import colors from "colors";
import fs from 'fs';
import puppeteer, { Browser, BrowserContext, Page } from "puppeteer-core";
import { getLiveKitToken } from './libs/livekit';
import { logger } from './libs/winston';

const TLS = process.env.LIVEKIT_TLS === 'true';
const HTTP_URL = `http${TLS ? 's' : ''}://${process.env.LIVEKIT_DOMAIN}`;
const MODEM_ID = await $`mmcli -L | grep 'QUECTEL' | sed -n 's#.*/Modem/\([0-9]\+\).*#\1#p' | tr -d '\n'`.text();
let oldModemInfo: any = {};
let browser: Browser | null = null;
let cleanUpCalled: boolean = false;

async function cleanUp(): Promise<void> {
    if (cleanUpCalled) {
        return
    }
    cleanUpCalled = true;

    if (browser) {
        logger.verbose("Closing browser...");
        await browser.close();
    }

    logger.verbose("Exit...");
    process.exit();
}

["exit", "SIGINT", "SIGUSR1", "SIGUSR2", "uncaughtException"]
    .forEach((type: string): void => {
        process.on(type, cleanUp);
    });

export function getEnv(name: string): string {
    return process.env[name] || '';
}

export async function getModemInfo(): Promise<any> {
    logger.debug("Get modem info...");

    const global = await $`mmcli -m ${MODEM_ID} -J`.json();
    const location = await $`sudo mmcli -m ${MODEM_ID} --location-get -J`.json();
    let modemInfo = {};

    if (global) {
        modemInfo = {
            ...modemInfo,
            tech: global.modem?.generic['access-technologies'],
            signal: Number(global.modem?.generic['signal-quality']?.value)
        }
    }

    if (location) {
        modemInfo = {
            ...modemInfo,
            longitude: Number(location.modem?.location?.gps?.longitude?.replace(',', '.')),
            latitude: Number(location.modem?.location?.gps?.latitude?.replace(',', '.')),
            altitude: Number(location.modem?.location?.gps?.altitude?.replace(',', '.')),
            speed: Number(location.modem?.location?.gps?.nmea?.find((nmea) => nmea.startsWith('$GPVTG'))?.split(',')?.[7])
        }
    }

    if (JSON.stringify(oldModemInfo) !== JSON.stringify(modemInfo)) {
        oldModemInfo = modemInfo;
        logger.verbose("Update modem info");
        logger.debug(`New modem info: ${JSON.stringify(modemInfo)}`);
        return modemInfo;
    }
}

logger.debug(`TLS: ${TLS ? colors.green('enabled') : colors.red('disabled')}`);
logger.debug(`Domain: ${process.env.LIVEKIT_DOMAIN}`);
logger.debug(`Modem ID: ${MODEM_ID}`);
logger.debug("------------------");
logger.info('Starting browser...');

(async () => {
    browser = await puppeteer.launch({
        dumpio: process.env.LOG_LEVEL === 'debug',
        executablePath: "/usr/bin/chromium",
        headless: true,
        ignoreDefaultArgs: true,
        args:  [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--headless=new',
            '--use-angle=vulkan',
            '--enable-gpu-rasterization',
            '--use-vulkan',
            '--enable-gpu',
            '--disable-vulkan-surface',
            '--enable-unsafe-webgpu',
            '--disable-search-engine-choice-screen',
            '--ash-no-nudges',
            '--no-first-run',
            '--disable-features=Translate',
            '--no-default-browser-check',
            '--window-size=1280,720',
            '--allow-chrome-scheme-url',
            '--use-fake-ui-for-media-stream',
            '--autoplay-policy=no-user-gesture-required',
            '--ignore-gpu-blocklist'
        ]
    });
    const context: BrowserContext = browser.defaultBrowserContext();
    await context.overridePermissions(HTTP_URL, ['microphone', 'camera']);

    logger.info('Opening new page...');
    const page: Page = await browser.newPage();

    logger.info(`Loading ${HTTP_URL}...`);
    await page.goto(HTTP_URL);
    await page.addScriptTag({ content: fs.readFileSync(`${__dirname}/libs/livekit-client.umd.min.js`, 'utf8') });
    await page.exposeFunction('getLiveKitToken', getLiveKitToken);
    await page.exposeFunction('getEnv', getEnv);
    await page.exposeFunction('logInfo', (message: string) => { logger.info(message) });

    page.on('pageerror', error => {
        console.log(error.message);
    });

    page.on('requestfailed', request => {
        console.log(`Request Failed: ${request.failure()?.errorText}, ${request.url()}`);
    });

    page.on('console', async (msg: any): Promise<void> => {
        const msgArgs = msg.args();
        for (let i = 0; i < msgArgs.length; ++i) {
            console.log(await msgArgs[i].jsonValue());
        }
    });

    await page.evaluate(async (): Promise<void> => {
        await window.logInfo("Starting LiveKit...");

        const TLS = await window.getEnv('LIVEKIT_TLS') === 'true';
        const WS_URL = `ws${TLS ? 's' : ''}://${await window.getEnv('LIVEKIT_DOMAIN')}`;
        const TOKEN = await window.getLiveKitToken();

        // @ts-ignore
        const room = new LivekitClient.Room({
            reconnectPolicy: {
                nextRetryDelayInMs: () => {
                    return 1000;
                }
            }
        });

        await room.prepareConnection(WS_URL, TOKEN);

        room
            // @ts-ignore
            .on(LivekitClient.RoomEvent.Connected, async () => {
                await window.logInfo("Connected");
            })
            // @ts-ignore
            .on(LivekitClient.RoomEvent.Reconnecting, async () => {
                await window.logInfo("Reconnecting...");
            })
            // @ts-ignore
            .on(LivekitClient.RoomEvent.Reconnected, async () => {
                await window.logInfo("Reconnected");
            })
            // @ts-ignore
            .on(LivekitClient.RoomEvent.Disconnected, async () => {
                await window.logInfo("Disconnected");
            })
            // @ts-ignore
            .on(LivekitClient.RoomEvent.MediaDevicesChanged, async () => {
                await window.logInfo("Media devices changed");
            })
            // @ts-ignore
            .on(LivekitClient.RoomEvent.MediaDevicesError, async () => {
                await window.logInfo("Media devices error");
            });

        await window.logInfo("Connecting to LiveKit...");
        await room.connect(WS_URL, TOKEN);
    });
})();
