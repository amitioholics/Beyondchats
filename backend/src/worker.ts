import OpenAI from 'openai';
import puppeteer from 'puppeteer';
import db from './db';
import 'dotenv/config';

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function searchAndScrape(query: string) {
    console.log(`Searching Web for: ${query}`);
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Use DuckDuckGo HTML version
        console.log("Using DuckDuckGo HTML...");
        await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });

        // Extract links
        const links = await page.evaluate(() => {
            const results = [];

            // DDG HTML selectors
            const anchors = document.querySelectorAll('.result__a');

            for (const a of anchors) {
                if (results.length >= 2) break;
                const url = a.href;
                const title = a.innerText;

                if (url && !url.includes('duckduckgo.com') && !url.includes('google.com') && !url.includes('yandex')) {
                    results.push({ title, url });
                }
            }
            return results;
        });

        console.log(`Found links: ${JSON.stringify(links)}`);

        const scrapedData = [];

        for (const link of links) {
            let newPage;
            try {
                console.log(`Scraping: ${link.url}`);
                newPage = await browser.newPage();
                await newPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
                await newPage.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Extract main content
                const content = await newPage.evaluate(() => {
                    const selectors = ['article', 'main', '.content', '.post-content', '#content', 'body'];
                    for (const sel of selectors) {
                        const el = document.querySelector(sel);
                        if (el && el.innerText.length > 500) {
                            return el.innerText;
                        }
                    }
                    return document.body.innerText;
                });

                if (content && content.length > 200) {
                    scrapedData.push(`Source: ${link.url}\nTitle: ${link.title}\nContent: ${content.slice(0, 5000)}...`);
                }
                if (newPage) await newPage.close();
            } catch (e) {
                console.error(`Failed to scrape ${link.url}`, e);
                if (newPage) await newPage.close().catch(() => { });
            }
        }

        return { links, content: scrapedData.join('\n\n---\n\n') };

    } catch (e) {
        console.error("Search failed", e);
        return { links: [], content: "" };
    } finally {
        await browser.close();
    }
}

async function rewriteArticle(originalTitle, originalContent, newContent) {
    if (!newContent) {
        console.log("No new content to rewrite with.");
        return originalContent + "\n\n(No external sources found to update this article)";
    }

    console.log('Asking OpenAI to rewrite...');
    const prompt = `
    You are an expert content writer. 
    Original Article Title: "${originalTitle}"
    Original Content: "${originalContent.slice(0, 500)}..." (truncated)
    
    Top Ranking Competitor Content:
    ${newContent.slice(0, 15000)}
    
    Task: Rewrite the original article to be better, more comprehensive, and similar in formatting to the competitor content. 
    Make it professional and engaging.
    Ensure to cite the sources at the bottom as a list of links.
    
    Return ONLY the markdown content of the new article.
    `;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-4-turbo', // or gpt-3.5-turbo
        });
        return completion.choices[0].message.content || 'Failed to generate content';
    } catch (e) {
        console.error("OpenAI failed", e);
        return "Failed to update content via AI.";
    }
}

async function processArticles() {
    // Fetch unprocessed articles
    const articles = db.prepare('SELECT * FROM Article WHERE isProcessed = 0 LIMIT 1').all();

    if (articles.length === 0) {
        console.log('No unprocessed articles found.');
        return;
    }

    for (const article of articles) {
        console.log(`Processing article ID: ${article.id}: ${article.originalTitle}`);

        try {
            // 1. Search & Scrape
            const { links, content } = await searchAndScrape(article.originalTitle);

            if (links.length === 0) {
                console.log("No links found. Marking as processed but not updated.");
                // Mark as processed so we don't loop forever, but maybe with a flag?
                // For this assignment, just mark processed.
                db.prepare('UPDATE Article SET isProcessed = 1 WHERE id = ?').run(article.id);
                continue;
            }

            // 2. Rewrite
            const updatedContent = await rewriteArticle(article.originalTitle, article.originalContent, content);

            // 3. Update DB
            db.prepare(`
                UPDATE Article 
                SET updatedContent = ?, referenceLinks = ?, isProcessed = 1, updatedAt = datetime('now')
                WHERE id = ?
            `).run(updatedContent, JSON.stringify(links.map(l => l.url)), article.id);

            console.log(`Article ${article.id} updated successfully.`);

        } catch (error) {
            console.error(`Error processing article ${article.id}:`, error);
        }
    }
}

if (require.main === module) {
    processArticles();
}
