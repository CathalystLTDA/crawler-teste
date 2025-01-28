import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';

interface Product {
    name: string;
    price: string;
    imageUrl: string;
    category?: string;
}

const baseUrl = 'https://www.ifood.com.br/delivery/porto-alegre-rs/bistek---poa-astir-bela-vista/ece0c803-b8a8-4f6d-bb66-28c58b054b31'; // Replace with the actual URL

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
    const productsWithCategory = products.map((product) => ({ ...product, category }));
    const dataset = await Actor.openDataset(category);
    await dataset.pushData(productsWithCategory);
    // Save the scraped data
    //await Actor.pushData(products);
}

Actor.main(async () => {
    const requestQueue = await Actor.openRequestQueue();
    await requestQueue.addRequest({ url: baseUrl });

    const crawler = new PlaywrightCrawler({
        requestQueue,
        launchContext: {
            launchOptions: {
                headless: true,
            },
        },
        requestHandler: async ({ page, request }) => {
            console.log(`Processing ${request.url}...`);
            await page.waitForTimeout(5000);

            if (request.url === baseUrl) {
                // Collect category links on the main page
                await collectCategoryLinks(page, requestQueue);
            } else {
                // Scrape products on category pages
                await scrapeProducts(page);
            }
        },
        maxConcurrency: 5, // Adjust concurrency based on your needs
    });

    await crawler.run();
});
