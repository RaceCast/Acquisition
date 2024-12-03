import fs from 'fs';
import puppeteer, { BrowserContext } from "puppeteer-core";

const TLS = process.env.LIVEKIT_TLS === 'true';
const HTTP_URL = `http${TLS ? 's' : ''}://${process.env.LIVEKIT_DOMAIN}`;
const WS_URL = `ws${TLS ? 's' : ''}://${process.env.LIVEKIT_DOMAIN}`;

(async () => {
    const browser = await puppeteer.launch({
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
    const page = await browser.newPage();

    await page.goto(HTTP_URL);
    await page.addScriptTag({ content: fs.readFileSync(`${__dirname}/libs/livekit-client.min.js`, 'utf8') });

    page.on('pageerror', error => {
        console.log(error.message);
    });

    page.on('response', response => {
        console.log(`URL Response:${response.status()}: ${response.url()}`);
    });

    page.on('requestfailed', request => {
        console.log(`Request Failed: ${request.failure()?.errorText}, ${request.url()}`);
    });

    await page.goto('chrome://gpu', { waitUntil: 'networkidle0' });
    await page.pdf({path: './gpu.pdf'});
    await browser.close();
})();
