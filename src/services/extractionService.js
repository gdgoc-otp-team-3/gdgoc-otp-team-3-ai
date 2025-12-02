import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

/**
 * Extract text from uploaded file (PDF or image)
 */
export async function extractTextFromFile(file) {
  const fileType = file.mimetype;
  const fileName = file.originalname.toLowerCase();

  try {
    // Handle PDF files
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await extractTextFromPDF(file.buffer);
    }

    // Handle image files
    if (fileType.startsWith('image/') || 
        fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
      return await extractTextFromImage(file.buffer);
    }

    throw new Error(`Unsupported file type: ${fileType}`);
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
}

/**
 * Extract text from PDF buffer
 */
async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = data.text.trim();

    if (!text || text.length < 50) {
      throw new Error('PDF contains no readable text or text is too short');
    }

    console.log(`Extracted ${text.length} characters from PDF`);
    return text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Extract text from image buffer using OCR
 */
async function extractTextFromImage(buffer) {
  try {
    // Preprocess image for better OCR results
    const processedImage = await sharp(buffer)
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();

    console.log('Running OCR on image...');

    const { data: { text } } = await Tesseract.recognize(
      processedImage,
      'kor+eng', // Korean + English
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      }
    );

    const cleanedText = text.trim();

    if (!cleanedText || cleanedText.length < 50) {
      throw new Error('Image contains no readable text or text is too short');
    }

    console.log(`Extracted ${cleanedText.length} characters from image via OCR`);
    return cleanedText;
  } catch (error) {
    console.error('OCR error:', error);
    throw new Error(`Failed to perform OCR: ${error.message}`);
  }
}
