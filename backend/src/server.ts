import express from 'express';
import cors from 'cors';
import db from './db';

const app = express();

app.use(cors());
app.use(express.json());

// GET / - Health check / Welcome
app.get('/', (req, res) => {
    res.send('<h1>BeyondChats API is running with Better-SQLite3</h1><p><a href="/articles">View Articles JSON</a></p>');
});

// GET / - Health check / Welcome
app.get('/', (req, res) => {
    res.send('<h1>BeyondChats API is running with Better-SQLite3</h1><p><a href="/articles">View Articles JSON</a></p>');
});

// GET /articles
app.get('/articles', (req, res) => {
    try {
        const articles = db.prepare('SELECT * FROM Article ORDER BY createdAt DESC').all();
        res.json(articles);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});

// GET /articles/:id
app.get('/articles/:id', (req, res) => {
    const { id } = req.params;
    const article = db.prepare('SELECT * FROM Article WHERE id = ?').get(id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
});

// POST /articles
app.post('/articles', (req, res) => {
    const { originalTitle, originalContent, url } = req.body;
    try {
        const info = db.prepare(`
      INSERT INTO Article (originalTitle, originalContent, url, isProcessed)
      VALUES (?, ?, ?, 0)
    `).run(originalTitle, originalContent, url);
        res.json({ id: info.lastInsertRowid, originalTitle, originalContent, url, isProcessed: 0 });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// PATCH /articles/:id
app.patch('/articles/:id', (req, res) => {
    const { id } = req.params;
    const { updatedContent, referenceLinks, isProcessed } = req.body;

    // Dynamic update query
    const updates: string[] = [];
    const params: any[] = [];

    if (updatedContent !== undefined) {
        updates.push('updatedContent = ?');
        params.push(updatedContent);
    }
    if (referenceLinks !== undefined) {
        updates.push('referenceLinks = ?');
        params.push(JSON.stringify(referenceLinks));
    }
    if (isProcessed !== undefined) {
        updates.push('isProcessed = ?');
        params.push(isProcessed ? 1 : 0);
    }

    if (updates.length > 0) {
        updates.push('updatedAt = datetime("now")');
        params.push(id);
        const sql = `UPDATE Article SET ${updates.join(', ')} WHERE id = ?`;
        try {
            db.prepare(sql).run(...params);
            const article = db.prepare('SELECT * FROM Article WHERE id = ?').get(id);
            res.json(article);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Failed' });
        }
    } else {
        res.json({ message: 'No changes' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
