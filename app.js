const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const bodyParser = require('body-parser');
require('dotenv').config();

puppeteer.use(StealthPlugin());
const app = express();
app.use(bodyParser.json());

const PORT = 3000;
const API_KEY = process.env.API_KEY || 'api_live_676';

// 🛡️ Middleware to check API key
function apiKeyMiddleware(req, res, next) {
    const clientKey = req.headers['api-key'];
    if (!clientKey || clientKey !== API_KEY) {
        console.warn('❌ Unauthorized access attempt.');
        return res.status(401).json({ error: 'Unauthorized. Missing or invalid API key.' });
    }
    next();
}

// 🟢 Extract emails, Facebook, Instagram from website
async function extractContactInfoFromWebsite(url) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        const page = await browser.newPage();
        console.log(`🌐 Visiting website: ${url}`);

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'font'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 5000));

        const html = await page.content();

        // 📧 Extract emails and remove duplicates
        let emails = [...new Set(
            (html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g) || [])
                .filter(email => !email.toLowerCase().endsWith('.png'))
        )];

        console.log(`📧 Emails found: ${emails.length}`);

        // 🌐 Extract and clean Facebook links
        let facebook = [...new Set(
            (html.match(/https:\/\/(www\.)?facebook\.com\/[^\s"'<>]+/gi) || [])
                .filter(link => !link.includes('/login'))
        )];
        console.log(`📘 Facebook links found: ${facebook.length}`);

        // 📸 Extract and clean Instagram links
        let instagramLinks = [...new Set(
            html.match(/https:\/\/(www\.)?instagram\.com\/[^\s"'<>]+/gi) || []
        )];

        const profiles = instagramLinks.filter(link => 
            !link.includes('/p/') && !link.includes('/reel/')
        );
        console.log(`📸 Instagram profiles found: ${profiles.length}`);

        let instagram = profiles;
        if (profiles.length === 0 && instagramLinks.length > 0) {
            // Fallback: include 1 post or reel if no profile found
            instagram = [instagramLinks[0]];
            console.log('⚠️ No profiles, added 1 fallback Instagram link.');
        }

        return { emails, facebook, instagram };
    } catch (err) {
        console.error(`⚠️ Failed to extract website info: ${err.message}`);
        return { emails: [], facebook: [], instagram: [] };
    } finally {
        await browser.close();
    }
}

// 🟢 Scrape Google Maps businesses
async function scrapeGoogleMaps(searchQuery, targetCount) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        const page = await browser.newPage();
        console.log(`🌐 Navigating to Google Maps for: ${searchQuery}`);

        await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`, {
            waitUntil: 'networkidle2',
            timeout: 90000
        });

        console.log('📜 Scrolling left panel to load businesses...');
        const MAX_SCROLLS = 20;
        let lastCount = 0;
        let noNewResultsCount = 0;

        for (let i = 0; i < MAX_SCROLLS; i++) {
            const panel = await page.$('div[role="feed"]');
            if (!panel) {
                console.log('❌ Left panel not found!');
                break;
            }

            await page.evaluate(el => el.scrollBy(0, el.scrollHeight), panel);
            console.log(`🔽 Scrolled panel: ${i + 1}`);

            const delay = targetCount < 20 ? 3000 : 15000;
            await new Promise(resolve => setTimeout(resolve, delay));

            const currentCount = await page.evaluate(() =>
                document.querySelectorAll('a.hfpxzc').length
            );
            console.log(`📦 Businesses loaded: ${currentCount}`);

            if (currentCount >= targetCount) {
                console.log(`✅ Target of ${targetCount} businesses reached.`);
                break;
            }

            if (currentCount === lastCount) {
                noNewResultsCount++;
                if (noNewResultsCount >= 2) {
                    console.log('⚠️ No more new results. Stopping scroll.');
                    break;
                }
                console.log('⏳ No new results. Waiting 30s...');
                await new Promise(resolve => setTimeout(resolve, 30000));
            } else {
                noNewResultsCount = 0;
            }

            lastCount = currentCount;
        }

        const businesses = await page.evaluate(() => {
            const anchors = [...document.querySelectorAll('a.hfpxzc')];
            return anchors.map(a => ({
                name: a.getAttribute('aria-label') || '',
                link: a.href
            }));
        });

        console.log(`📦 Total businesses found: ${businesses.length}`);

        const results = [];
        for (let business of businesses.slice(0, targetCount)) {
            console.log(`🔍 Processing: ${business.name}`);
            try {
                const mapPage = await browser.newPage();
                await mapPage.setRequestInterception(true);
                mapPage.on('request', (req) => {
                    if (['image', 'font'].includes(req.resourceType())) req.abort();
                    else req.continue();
                });

                await mapPage.goto(business.link, { waitUntil: 'domcontentloaded', timeout: 60000 });
                await new Promise(resolve => setTimeout(resolve, 3000));

                const phone = await mapPage.evaluate(() => {
                    const span = Array.from(document.querySelectorAll('button, span'))
                        .find(el => /\+?\d[\d\s\-().]{7,}/.test(el.textContent));
                    return span ? span.textContent.replace(/[^\d+()\-\s]/g, '').trim() : '';
                });

                const website = await mapPage.evaluate(() => {
                    const link = document.querySelector('a[data-item-id="authority"]');
                    return link ? link.href : '';
                });

                const { rating, reviews } = await mapPage.evaluate(() => {
                    const ratingEl = Array.from(document.querySelectorAll('span')).find(el =>
                        el.getAttribute('aria-hidden') === 'true' && /^\d+(\.\d+)?$/.test(el.textContent.trim())
                    );
                    const reviewsEl = Array.from(document.querySelectorAll('span')).find(el =>
                        /\(\d{1,3}(,\d{3})*\)/.test(el.textContent.trim())
                    );
                    return {
                        rating: ratingEl ? ratingEl.textContent.trim() : '',
                        reviews: reviewsEl ? reviewsEl.textContent.replace(/[()]/g, '').trim() : ''
                    };
                });

                results.push({
                    name: business.name,
                    maps_link: business.link,
                    phone,
                    website,
                    rating,
                    reviews
                });

                await mapPage.close();
            } catch (err) {
                console.log(`⚠️ Error processing ${business.name}: ${err.message}`);
            }
        }

        console.log(`✅ Done scraping ${results.length} businesses`);
        return { results };
    } finally {
        await browser.close();
    }
}

// 🌟 API Endpoints
app.get('/gmap', apiKeyMiddleware, async (req, res) => {
    const searchQuery = req.query.query;
    const count = parseInt(req.query.count) || 5;

    if (!searchQuery) {
        return res.status(400).json({ error: 'Missing query parameter ?query=hotels+in+los+angeles' });
    }

    try {
        const { results } = await scrapeGoogleMaps(searchQuery, count);
        res.json(results);
    } catch (err) {
        console.error(`❌ API Error: ${err.message}`);
        res.status(500).json({ error: 'Something went wrong during scraping.' });
    }
});

app.get('/website', apiKeyMiddleware, async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'Missing query parameter ?url=https://example.com' });
    }

    try {
        const data = await extractContactInfoFromWebsite(url);
        res.json({ success: true, url, ...data });
    } catch (err) {
        console.error(`❌ API Error: ${err.message}`);
        res.status(500).json({ error: 'Something went wrong during website scraping.' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Contact Hunter API live at http://0.0.0.0:${PORT}`);
});
