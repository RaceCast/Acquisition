import { $ } from "bun";
import fs from 'fs';
import puppeteer, { Browser, BrowserContext, Page } from "puppeteer-core";
import { getLiveKitToken } from './libs/livekit';

const TLS = process.env.LIVEKIT_TLS === 'true';
const HTTP_URL = `http${TLS ? 's' : ''}://${process.env.LIVEKIT_DOMAIN}`;
const MODEM_ID = await $`mmcli -L | grep 'QUECTEL' | sed -n 's#.*/Modem/\([0-9]\+\).*#\1#p' | tr -d '\n'`.text();

export function getEnv(name: string): string {
    const value = process.env[name] || '';
    return value;
}

export async function getModemInfo(): Promise<any> {
    const datas = await $`mmcli -m ${MODEM_ID} -J`.json();
    if (datas) {
        return {
            tech: datas.modem.generic['access-technologies'],
            signal: datas.modem.generic['signal-quality'].value
        }
    }
}

(async () => {
    const browser: Browser = await puppeteer.launch({
        executablePath: "/usr/bin/chromium",
        headless: true,
        ignoreDefaultArgs: true,
        args:  [
            '--no-sandbox',
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
    const page: Page = await browser.newPage();

    await page.goto(HTTP_URL);
    await page.addScriptTag({ content: fs.readFileSync(`${__dirname}/libs/livekit-client.min.js`, 'utf8') });
    await page.exposeFunction('getLiveKitToken', getLiveKitToken);
    await page.exposeFunction('getEnv', getEnv);

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
            .on(LivekitClient.RoomEvent.Connected, () => {
                console.log('Connected');
            })
            // @ts-ignore
            .on(LivekitClient.RoomEvent.Reconnecting, () => {
                console.log('Reconnecting...');
            })
            // @ts-ignore
            .on(LivekitClient.RoomEvent.Reconnected, () => {
                console.log('Reconnected');
            })
            // @ts-ignore
            .on(LivekitClient.RoomEvent.Disconnected, () => {
                console.log('Disconnected.');
            })
            // @ts-ignore
            .on(LivekitClient.RoomEvent.MediaDevicesChanged, () => {
                console.log('Media devices changed');
            })
            // @ts-ignore
            .on(LivekitClient.RoomEvent.MediaDevicesError, () => {
                console.log('Media devices error');
            });

            await room.connect(WS_URL, TOKEN);
    });


    // await page.goto('chrome://gpu', { waitUntil: 'networkidle0' });
    // await page.pdf({path: './gpu.pdf'});

    await browser.close();
})();
