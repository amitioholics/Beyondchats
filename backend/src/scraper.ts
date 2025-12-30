import axios from 'axios';
import * as cheerio from 'cheerio';
import db from './db';

const BASE_URL = 'https://beyondchats.com/blogs/';

async function getValuesFromPage(url: string) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        return $;
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return null;
    }
}

async function getLastPageUrl(): Promise<string> {
    const $ = await getValuesFromPage(BASE_URL);
    if (!$) return BASE_URL;

    let maxPage = 1;
    $('a[href*="/page/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
            const match = href.match(/\/page\/(\d+)\//);
            if (match) {
                const pageNum = parseInt(match[1]);
                if (pageNum > maxPage) maxPage = pageNum;
            }
        }
    });

    console.log(`Detected last page: ${maxPage}`);
    return `${BASE_URL}page/${maxPage}/`;
}

async function scrapeArticles() {
    console.log('Starting scrape...');

    // 1. Find Last Page
    const lastPageUrl = await getLastPageUrl();
    console.log(`Fetching articles from: ${lastPageUrl}`);

    const $ = await getValuesFromPage(lastPageUrl);
    if (!$) {
        console.error('Failed to load last page');
        return;
    }

    const articles: any[] = [];

    // Strategy: Select headings links inside articles
    let items = $('article');
    if (items.length === 0) items = $('.post');

    items.each((_, el) => {
        const titleEl = $(el).find('h2 a, h3 a, .entry-title a').first();
        const title = titleEl.text().trim();
        const link = titleEl.attr('href');
        const contentSnippet = $(el).find('.entry-content, .post-excerpt').text().trim();

        if (title && link) {
            articles.push({ title, link, contentSnippet });
        }
    });

    // Fallback search
    if (articles.length === 0) {
        console.log("Fallback search for articles...");
        $('h2 a').each((_, el) => {
            const link = $(el).attr('href');
            const title = $(el).text().trim();
            if (link && title && link.includes('/blogs/') && !link.includes('/page/')) {
                articles.push({ title, link, contentSnippet: "" });
            }
        });
    }

    console.log(`Found ${articles.length} articles on last page.`);

    const insertStmt = db.prepare(`
        INSERT INTO Article (originalTitle, originalContent, url, isProcessed)
        VALUES (@originalTitle, @originalContent, @url, 0)
        ON CONFLICT(url) DO UPDATE SET
        originalTitle=@originalTitle,
        originalContent=@originalContent,
        updatedAt=datetime('now')
    `);

    for (const art of articles) {
        console.log(`Scraping content for: ${art.title}`);
        const $art = await getValuesFromPage(art.link);
        if (!$art) continue;

        let content = $art('.entry-content, .post-content, article .content').text().trim();
        if (!content) content = $art('p').text().trim();

        try {
            insertStmt.run({
                originalTitle: art.title,
                originalContent: content || 'No content found',
                url: art.link
            });
            console.log(`Saved: ${art.title}`);
        } catch (e) {
            console.error(`Failed to save ${art.title}`, e);
        }
    }
}

async function main() {
    await scrapeArticles();
}

if (require.main === module) {
    main();
}
