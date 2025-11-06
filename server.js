import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
const app = express();
app.use(express.json());
app.use(cors());

const dataFile = path.join(process.cwd(), 'public', 'results.json');

// Read results
app.get('/results.json', (req, res) => {
    fs.readFile(dataFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Cannot read results file' });
        res.json(JSON.parse(data || '{}'));
    });
});

// Append vote
app.post('/api/update-results', (req, res) => {
    const { person, color, user } = req.body;
    if (!person || !color) return res.status(400).json({ error: 'Missing data' });

    fs.readFile(dataFile, 'utf-8', (err, data) => {
        let results = {};
        if (!err && data) results = JSON.parse(data);

        if (!results[person]) results[person] = [];
        results[person].push({ color, user });

        fs.writeFile(dataFile, JSON.stringify(results, null, 2), err2 => {
            if (err2) return res.status(500).json({ error: 'Cannot save results' });
            res.json({ success: true });
        });
    });
});

app.listen("0.0.0.0", 30001, () => console.log('Server running on http://localhost:30001'));
