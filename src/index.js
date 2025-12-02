import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { generateSummary } from './services/summaryService.js';
import { extractTextFromFile } from './services/extractionService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-summary-service' });
});

// Generate summary from file
app.post('/api/summarize', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, subject, professor, semester } = req.body;

    console.log(`Processing file: ${req.file.originalname}`);

    // Extract text from the uploaded file
    const extractedText = await extractTextFromFile(req.file);

    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({ 
        error: 'Could not extract sufficient text from file',
        details: 'The file may be too short, corrupted, or not contain readable text'
      });
    }

    // Generate AI summary
    const summary = await generateSummary({
      text: extractedText,
      title,
      subject,
      professor,
      semester,
    });

    res.json(summary);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      error: 'Failed to generate summary',
      message: error.message 
    });
  }
});

// Generate summary from text (no file upload needed)
app.post('/api/summarize-text', async (req, res) => {
  try {
    const { text, title, subject, professor, semester } = req.body;

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ 
        error: 'Text is required and must be at least 50 characters' 
      });
    }

    const summary = await generateSummary({
      text,
      title,
      subject,
      professor,
      semester,
    });

    res.json(summary);
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ 
      error: 'Failed to generate summary',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 AI Summary Service running on port ${PORT}`);
  console.log(`📝 Endpoints:`);
  console.log(`   - POST /api/summarize (with file upload)`);
  console.log(`   - POST /api/summarize-text (text only)`);
  console.log(`   - GET /health`);
});
