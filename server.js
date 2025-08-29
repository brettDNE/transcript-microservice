import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/transcript', async (req, res) => {
  try {
    const { videoId, lang = 'en' } = req.body;
    const url = videoId.startsWith('http') ? videoId : `https://www.youtube.com/watch?v=${videoId}`;
    
    console.log(`Getting transcript for: ${url}`);
    
    const lines = await YoutubeTranscript.fetchTranscript(url, { lang });
    const items = (lines || []).map(l => ({
      text: l.text,
      duration: (l.duration || 0) / 1000,
      start: (l.offset || 0) / 1000
    }));
    
    if (!items.length) {
      return res.status(404).json({ items: [], error: 'no_transcript' });
    }
    
    res.json({ items });
  } catch (e) {
    console.error('Transcript error:', e.message);
    res.status(500).json({ error: 'server_error', message: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Transcript service running on :${PORT}`));