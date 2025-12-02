# Integration Guide: AI Service with Backend

## Overview

The AI summary service is now running on `http://localhost:3001` and ready to generate summaries from uploaded notes.

## How It Works

```
User uploads note → Backend receives file → Backend sends to AI service → AI returns summary → Backend saves summary with note
```

## Backend Integration (Kotlin/Spring Boot)

### 1. Add HTTP Client Dependency

Add to `build.gradle.kts`:
```kotlin
implementation("org.springframework.boot:spring-boot-starter-web")
```

### 2. Create AI Service Client

Create `src/main/kotlin/gdgoc_otp_team_3/backend/service/AiSummaryService.kt`:

```kotlin
package gdgoc_otp_team_3.backend.service

import org.springframework.core.io.ByteArrayResource
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestTemplate
import org.springframework.web.multipart.MultipartFile

data class AiSummaryResponse(
    val keyPoints: List<String>,
    val difficulty: String,
    val estimatedTime: String,
    val summary: String,
    val tags: List<String>
)

@Service
class AiSummaryService {
    private val restTemplate = RestTemplate()
    private val aiServiceUrl = "http://localhost:3001/api/summarize"

    fun generateSummary(
        file: MultipartFile,
        title: String?,
        subject: String?,
        professor: String?,
        semester: String?
    ): AiSummaryResponse? {
        return try {
            val headers = HttpHeaders().apply {
                contentType = MediaType.MULTIPART_FORM_DATA
            }

            val body = LinkedMultiValueMap<String, Any>().apply {
                add("file", object : ByteArrayResource(file.bytes) {
                    override fun getFilename(): String = file.originalFilename ?: "file"
                })
                title?.let { add("title", it) }
                subject?.let { add("subject", it) }
                professor?.let { add("professor", it) }
                semester?.let { add("semester", it) }
            }

            val requestEntity = HttpEntity(body, headers)
            val response = restTemplate.postForEntity(
                aiServiceUrl,
                requestEntity,
                AiSummaryResponse::class.java
            )

            response.body
        } catch (e: Exception) {
            println("Failed to generate AI summary: ${e.message}")
            null // Return null if AI service fails (optional feature)
        }
    }
}
```

### 3. Update Note Upload Controller

Modify your `NoteController.kt` to call the AI service:

```kotlin
@RestController
@RequestMapping("/api/v1/notes")
class NoteController(
    private val noteService: NoteService,
    private val aiSummaryService: AiSummaryService  // Inject AI service
) {
    
    @PostMapping
    fun createNote(
        @RequestParam("file") file: MultipartFile,
        @RequestParam("title") title: String,
        @RequestParam("subject") subject: String?,
        @RequestParam("professor") professor: String?,
        @RequestParam("semester") semester: String?,
        @RequestParam("description") description: String?
    ): ResponseEntity<NoteResponse> {
        
        // Generate AI summary (optional - won't fail if AI service is down)
        val aiSummary = aiSummaryService.generateSummary(
            file = file,
            title = title,
            subject = subject,
            professor = professor,
            semester = semester
        )
        
        // Save note with AI summary
        val note = noteService.createNote(
            file = file,
            title = title,
            subject = subject,
            professor = professor,
            semester = semester,
            description = description,
            aiSummary = aiSummary  // Pass AI summary to service
        )
        
        return ResponseEntity.ok(note)
    }
}
```

### 4. Update Note Entity

Add AI summary fields to your `Note` entity:

```kotlin
@Entity
data class Note(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    
    val title: String,
    val subject: String?,
    val professor: String?,
    val semester: String?,
    
    // AI Summary fields
    @Column(columnDefinition = "TEXT")
    val aiSummary: String?,  // JSON string of full summary
    
    val difficulty: String?,
    val estimatedTime: String?,
    
    @ElementCollection
    val keyPoints: List<String> = emptyList(),
    
    @ElementCollection
    val tags: List<String> = emptyList(),
    
    // ... other fields
)
```

## API Response Format

When calling the AI service, you'll receive:

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
  "tags": ["태그1", "태그2", "태그3"]
}
```

## Error Handling

The AI service is designed as an **optional enhancement**. If it fails:
- The backend should still save the note successfully
- Return `null` or empty values for AI summary fields
- Log the error for monitoring

## Testing the Integration

### Test with curl:
```bash
curl -X POST http://localhost:3001/api/summarize-text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "강의 내용...",
    "title": "강의 제목",
    "subject": "과목명",
    "professor": "교수명",
    "semester": "2024-2"
  }'
```

### Test with file upload:
```bash
curl -X POST http://localhost:3001/api/summarize \
  -F "file=@/path/to/note.pdf" \
  -F "title=강의 제목" \
  -F "subject=과목명"
```

## Running All Services Together

You now need to run 3 services:

**Terminal 1 - Frontend:**
```bash
cd /Users/yerincho/Desktop/25/25-2/GDGoC/otp/gdgoc-opt-team-3-front
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
cd /Users/yerincho/Desktop/25/25-2/GDGoC/otp/gdgoc-opt-team-3-front/gdgoc-opt-team-3-back
./gradlew bootRun
# Runs on http://localhost:8080
```

**Terminal 3 - AI Service:**
```bash
cd /Users/yerincho/Desktop/25/25-2/GDGoC/otp/gdgoc-opt-team-3-front/gdgoc-opt-team-3-ai
npm start
# Runs on http://localhost:3001
```

## Performance Notes

- **PDF extraction**: Nearly instant
- **Image OCR**: 10-30 seconds per image
- **OpenAI API**: 2-5 seconds for summary generation
- **Total time**: Usually 5-30 seconds depending on file type

## Cost Considerations

Using `gpt-4o-mini`:
- ~$0.01-0.02 per summary
- Roughly 500-1000 summaries per $10

For production, consider:
- Caching summaries
- Rate limiting
- Upgrading to `gpt-4` for better quality ($0.10-0.20 per summary)
