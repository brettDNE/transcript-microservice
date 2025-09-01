import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/transcript', async (req, res) => {
  console.log('Full request body:', req.body);
  console.log('VideoId from request:', req.body.videoId);
  console.log('VideoId type:', typeof req.body.videoId);
  
  try {
    const { videoId, lang = 'en' } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }
    
    const url = videoId.startsWith('http') ? videoId : `https://www.youtube.com/watch?v=${videoId}`;
    
    console.log(`Getting transcript for: ${url}`);
    
    // Add retry logic for captcha/rate limiting
    const maxRetries = 3;
    let lines = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        lines = await YoutubeTranscript.fetchTranscript(url, { lang });
        break; // Success - exit retry loop
      } catch (error) {
        console.log(`Attempt ${attempt + 1} failed:`, error.message);
        
        if (error.message.includes('captcha') || error.message.includes('too many requests')) {
          if (attempt < maxRetries - 1) {
            const delay = 5000 * (attempt + 1); // Increasing delay
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        throw error; // Re-throw if not retryable or max attempts reached
      }
    }
    
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Transcript service running on :${PORT}`));
