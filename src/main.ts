import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';

interface Product {
    name: string;
    price: string;
    imageUrl: string;
    category?: string;
    market?: string;
}

const baseUrl = 'https://www.ifood.com.br/mercados'; // Replace with the actual URL


async function getMarkets(page: any, requestQueue: any): Promise<void>{
    console.log(`Processing ${page.url()}...`);

    await page.click('.address-search-input__button');
    // Step 1: Type the address in the input field
    await page.type('.address-search-input__field', 'Rua Ernesto Fontoura 1401 São Geraldo');
    await page.waitForTimeout(1000);
    console.log('waited 1s')
    await page.waitForTimeout(1000);
    console.log('waited 2s')

    // Step 2: Wait for the dropdown options to appear
    await page.waitForSelector('.btn-address--full-size', { state: 'visible' });
    await page.waitForTimeout(1000);
    console.log('waited 1s')

   // Get the data-test-id of the first li element
    const liId = await page.$$eval('li .btn-address--full-size', (elements: any) => {
        const firstElement = elements[0]?.closest('li'); // Find the closest li element
        return firstElement ? firstElement.getAttribute('data-test-id') : null; // Get data-test-id of the li element
    });
    console.log(liId)

    // Click on the button inside the li element
    await page.click(`li[data-test-id=${liId}] .btn-address--full-size`);
    console.log('clicked address')

    // Wait for the button to appear and be clickable
    await page.waitForSelector('button.btn--default.btn--size-m.address-maps__submit');
    console.log('red button is visible')
    await page.waitForTimeout(2000);
    console.log('waited 2s')
    // Click on the button
    await page.click('button.btn--default.btn--size-m.address-maps__submit');
    console.log('clicked red button')

    await page.waitForTimeout(2000);
    console.log('waited 2s')

    await page.mouse.move(100, 100);
    console.log('moved mouse')


    // Wait for the button to appear and be clickable
    await page.waitForSelector('.complete-address--save-btn');
    console.log('red button is visible')
    await page.waitForTimeout(2000);
    console.log('waited 2s')
    // Click on the button
    await page.click('.complete-address--save-btn');
    console.log('clicked red button')
    await page.waitForTimeout(5000);
    console.log('waited 5s')
    // const atacados = await page.$('//span[contains(text(), "Atacados")]');
    // console.log('procurou o span')
    // if (atacados) {
    //     console.log('span found')
    //     await atacados.click();
    // }
    const link = await page.locator('//a[span[contains(text(), "Atacados")]]');
    const href = await link.getAttribute('href');

    console.log('Found href:', href);
    const fullUrl = new URL(href, page.url()).href; // Make the href absolute by resolving against the current page URL
    console.log(`Adding ${fullUrl} to the queue...`);
    await requestQueue.addRequest({ url: fullUrl });

    // const marketsLinks = await page.$$eval('.merchant-content__link', (links: any) =>
    //     links.map((link: any) => link.getAttribute('href')?.replace(/&amp;/g, '&')) // Replace &amp; with & if necessary
    // )
    // console.log(`Found ${marketsLinks.length} markets links.`);

    // // Add each category URL to the queue
    // for (const link of marketsLinks) {
    //     if (link) {
    //         const fullUrl = new URL(link, page.url()).href; // Make the href absolute by resolving against the current page URL
    //         console.log(`Adding ${fullUrl} to the queue...`);
    //         await requestQueue.addRequest({ url: fullUrl });
    //     }
    // }
}

async function getAtacados(page: any, requestQueue: any): Promise<void>{
    console.log(`Processing ${page.url()}...`);
    const marketsLinks = await page.$$eval('.merchant-v2__link', (links: any) =>
        links.map((link: any) => link.getAttribute('href')?.replace(/&amp;/g, '&')) // Replace &amp; with & if necessary
    )
    console.log(`Found ${marketsLinks.length} markets links.`);

    // Add each category URL to the queue
    for (const link of marketsLinks) {
        if (link) {
            const fullUrl = new URL(link, page.url()).href; // Make the href absolute by resolving against the current page URL
            console.log(`Adding ${fullUrl} to the queue...`);
            await requestQueue.addRequest({ url: fullUrl });
        }
    }
}
// Function to collect category links
async function collectCategoryLinks(page: any, requestQueue: any): Promise<void> {
    console.log(`Processing ${page.url()}...`);
    
    const scrollToBottom = async () => {
        let previousHeight: number;
        while (true) {
            previousHeight = await page.evaluate(() => document.body.scrollHeight);
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(1000);
            const currentHeight = await page.evaluate(() => document.body.scrollHeight);
            if (currentHeight === previousHeight) break;
        }
    };

    await scrollToBottom();  // Scroll to ensure all products are loaded


   // Collect all "See All Items" links, excluding those with span content "Loja Toda"
   const categoryLinks: string[] = await page.$$eval('.aisle-menu__item__link', (links: any) =>
    links
        .filter((link: any) => {
            const span = link.querySelector('span');
            return span && span.textContent.trim() !== 'Loja Toda'; // Exclude if the span content is "Loja Toda"
        })
        .map((link: any) => link.getAttribute('href')?.replace(/&amp;/g, '&')) // Replace &amp; with & if necessary
    );
    console.log(`Found ${categoryLinks.length} category links.`);

    // Add each category URL to the queue
    for (const link of categoryLinks) {
        if (link) {
            const fullUrl = new URL(link, page.url()).href; // Make the href absolute by resolving against the current page URL
            console.log(`Adding ${fullUrl} to the queue...`);
            await requestQueue.addRequest({ url: fullUrl });
        }
    }
}


// Function to scrape products from a category page
async function scrapeProducts(page: any): Promise<void> {
    // Scroll to load all products on the category page
    const scrollToBottom = async () => {
        let previousHeight: number;
        while (true) {
            previousHeight = await page.evaluate(() => document.body.scrollHeight);
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(1000);
            const currentHeight = await page.evaluate(() => document.body.scrollHeight);
            if (currentHeight === previousHeight) break;
        }
    };

    await scrollToBottom();  // Scroll to ensure all products are loaded

    const category: string = await page.$eval('.breadcrumbs-container__title', (el:any) => el.textContent?.trim() || '');
    const marketTitle: string = await page.$eval('.market-header__title', (el:any) => el.textContent?.trim() || 'sem nome');

    // Extract product data
    const products: Product[] = await page.evaluate(( ) => {
        const items: Product[] = [];
        const productElements = document.querySelectorAll('a.product-card-content'); // Selector for product cards

        productElements.forEach((el) => {
            const name = el.querySelector('.product-card__description')?.getAttribute('title') || '';
            const price = el.querySelector('.product-card__price')?.textContent?.trim() || '';
            const imageUrl = el.querySelector('img.product-card-image__content')?.getAttribute('src') || '';
            if (name && price) {
                items.push({ name, price, imageUrl});
            }
        });

        return items;
    });

    console.log(`Scraped ${products.length} products from ${page.url()}.`);
    //console.table(products);
    const productsWithCategory = products.map((product) => ({ ...product, category, market: marketTitle }));
    // const path = marketTitle + '/' + category;
    // const dataset = await Actor.openDataset(path);
    // await dataset.pushData(productsWithCategory);
    // Save the scraped data
    await Actor.pushData(productsWithCategory);
}

Actor.main(async () => {
    const requestQueue = await Actor.openRequestQueue();
    await requestQueue.addRequest({ url: baseUrl });

    const crawler = new PlaywrightCrawler({
        requestHandlerTimeoutSecs: 120,
        requestQueue,
        launchContext: {
            launchOptions: {
                headless: false,
            },
        },
        requestHandler: async ({ page, request }) => {
            console.log(`Processing ${request.url}...`);
            await page.waitForTimeout(5000);

            if (request.url === baseUrl) {
                await getMarkets(page, requestQueue);
            } else if (request.url.includes('corredor')) {
                // Scrape products on category pages
                await scrapeProducts(page);
            }
            else if (request.url.includes('atacados')) {
                // Scrape products on category pages
                await getAtacados(page, requestQueue);
            }
            else {
                // Collect category links on the main page
                await collectCategoryLinks(page, requestQueue);
            }
        },
        maxConcurrency: 5, // Adjust concurrency based on your needs
    });

    await crawler.run();
});
