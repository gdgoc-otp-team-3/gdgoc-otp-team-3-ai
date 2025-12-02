# AI Summary Service

AI-powered note summarization service for the GDGOC note-sharing platform.

## Features

- 📄 **PDF Text Extraction**: Extract text from PDF files
- 🖼️ **OCR for Images**: Extract text from images using Tesseract OCR (Korean + English)
- 🤖 **AI Summarization**: Generate structured summaries using OpenAI GPT-4o-mini
- 🔑 **Key Points Extraction**: Identify main concepts and learning objectives
- ⏱️ **Study Time Estimation**: Estimate required study time
- 📊 **Difficulty Assessment**: Classify content difficulty level

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Make sure your `.env` file contains:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3001
   ```

3. **Run the service:**
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### POST `/api/summarize`

Generate summary from an uploaded file (PDF or image).

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: File (PDF or image)
  - `title`: Note title (optional)
  - `subject`: Subject name (optional)
  - `professor`: Professor name (optional)
  - `semester`: Semester (optional)

**Response:**
```json
{
  "keyPoints": [
    "핵심 포인트 1",
    "핵심 포인트 2",
    "핵심 포인트 3"
  ],
  "difficulty": "중급",
  "estimatedTime": "1시간",
  "summary": "전체 요약 내용...",
  "tags": ["태그1", "태그2"]
}
```

### POST `/api/summarize-text`

Generate summary from plain text (no file upload).

**Request:**
```json
{
  "text": "강의 노트 내용...",
  "title": "강의 제목",
  "subject": "과목명",
  "professor": "교수님",
  "semester": "2024-2"
}
```

**Response:** Same as above

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "ai-summary-service"
}
```

## Integration with Backend

The Spring Boot backend should call this service when a note is uploaded:

```kotlin
// Example: Call AI service after note upload
val response = restTemplate.postForEntity(
    "http://localhost:3001/api/summarize",
    multipartRequest,
    AiSummaryResponse::class.java
)
```

## Supported File Types

- **PDF**: `.pdf`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`

## Error Handling

The service returns appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (missing file, insufficient text, etc.)
- `500`: Server error (OpenAI API error, extraction failure, etc.)

## Cost Optimization

- Uses `gpt-4o-mini` model (cost-effective)
- Truncates long texts to ~6000 characters
- Caches nothing (stateless)
- Can upgrade to `gpt-4` for better quality if needed

## Notes

- OCR processing can take 10-30 seconds for images
- PDF text extraction is nearly instantaneous
- The service runs on port 3001 by default
- All responses are in Korean for Korean language notes
