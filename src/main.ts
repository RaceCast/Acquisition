import fs from 'fs';
import puppeteer, { Browser, BrowserContext, Page } from "puppeteer-core";
import { getLiveKitToken } from './libs/livekit';

const TLS = process.env.LIVEKIT_TLS === 'true';
const HTTP_URL = `http${TLS ? 's' : ''}://${process.env.LIVEKIT_DOMAIN}`;
const WS_URL = `ws${TLS ? 's' : ''}://${process.env.LIVEKIT_DOMAIN}`;

(async () => {
    const browser: Browser = await puppeteer.launch({
        executablePath: "/usr/bin/google-chrome",
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

    await page.goto('https://minarox.fr');
    await page.addScriptTag({ content: fs.readFileSync(`${__dirname}/libs/livekit-client.min.js`, 'utf8') });
    await page.exposeFunction('getLiveKitToken', getLiveKitToken);

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
        // let room = null;

        async function startLiveKit() {
            const token = await window.getLiveKitToken();
            console.log(token);
        }

        async function startApp() {
            try {
                setTimeout(startLiveKit);
            } catch {
                // room = null;
                setTimeout(startApp);
            }
        }

        setTimeout(startApp);
    });


    // await page.goto('chrome://gpu', { waitUntil: 'networkidle0' });
    // await page.pdf({path: './gpu.pdf'});

    await browser.close();
})();
