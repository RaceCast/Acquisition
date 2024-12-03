import puppeteer, { Page } from "puppeteer";

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
    const page: Page = await browser.newPage();

    page.on('pageerror', error => {
      console.log(error.message);
    });

    page.on('response', response => {
      console.log('URL Response:' + response.status() + ": " + response.url());
    });

    page.on('requestfailed', request => {
      console.log('Request Failed: ' + request.failure()?.errorText + ', ' + request.url());
    });

    await page.goto('chrome://gpu', { waitUntil: 'networkidle0' });
    await page.pdf({path: './gpu.pdf'});
    await browser.close();
})();
