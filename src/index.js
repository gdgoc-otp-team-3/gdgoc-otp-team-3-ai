import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { generateSummary } from './services/summaryService.js';
import { extractTextFromFile } from './services/extractionService.js';
import { factCheckNote, extractClaims, retrieveEvidence, verifyClaim } from './services/factCheckService.js';

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

    // Run Fact Check (Accuracy)
    console.log('Running fact check for accuracy grading...');
    try {
      const factCheckResult = await factCheckNote({
        noteContent: extractedText,
        subject: subject || 'General',
        checkAll: false, // Check only high priority claims for speed
      });

      // Merge results
      const responseData = {
        ...summary,
        accuracy: factCheckResult.report.summary.accuracy,
        grade: factCheckResult.report.overallAssessment.grade, // S, A, B, C
        gradeMessage: factCheckResult.report.overallAssessment.message,
        gradeColor: factCheckResult.report.overallAssessment.color,
      };

      res.json(responseData);
    } catch (fcError) {
      console.error('Fact check failed, returning summary only:', fcError);
      // Fallback if fact check fails
      res.json({
        ...summary,
        accuracy: null,
        grade: null,
        gradeMessage: '정확도 검사 실패',
      });
    }
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

// ============================================
// FACT-CHECKING ENDPOINTS
// ============================================

// Full fact-check pipeline for entire note
app.post('/api/fact-check', async (req, res) => {
  try {
    const { noteContent, subject, checkAll = false } = req.body;

    if (!noteContent || noteContent.trim().length < 100) {
      return res.status(400).json({
        error: 'Note content is required and must be at least 100 characters'
      });
    }

    console.log(`Starting fact-check for ${subject || 'note'}...`);

    const result = await factCheckNote({
      noteContent,
      subject,
      checkAll,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fact-checking note:', error);
    res.status(500).json({
      error: 'Failed to fact-check note',
      message: error.message
    });
  }
});

// Extract claims only (for preview)
app.post('/api/extract-claims', async (req, res) => {
  try {
    const { noteContent, subject } = req.body;

    if (!noteContent || noteContent.trim().length < 100) {
      return res.status(400).json({
        error: 'Note content is required and must be at least 100 characters'
      });
    }

    console.log('Extracting claims...');

    const result = await extractClaims(noteContent, subject);
    res.json(result);
  } catch (error) {
    console.error('Error extracting claims:', error);
    res.status(500).json({
      error: 'Failed to extract claims',
      message: error.message
    });
  }
});

// Verify single claim (for manual checking)
app.post('/api/verify-claim', async (req, res) => {
  try {
    const { claim } = req.body;

    if (!claim || !claim.text) {
      return res.status(400).json({
        error: 'Claim object with text is required'
      });
    }

    console.log(`Verifying claim: "${claim.text.substring(0, 50)}..."`);

    const evidence = await retrieveEvidence(claim);
    const verification = await verifyClaim(claim, evidence);

    res.json({
      claim: claim,
      verification: verification,
      evidence: evidence,
    });
  } catch (error) {
    console.error('Error verifying claim:', error);
    res.status(500).json({
      error: 'Failed to verify claim',
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
