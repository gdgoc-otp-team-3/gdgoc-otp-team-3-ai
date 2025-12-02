import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate an AI summary from extracted text
 */
export async function generateSummary({ text, title, subject, professor, semester }) {
  try {
    const prompt = buildPrompt({ text, title, subject, professor, semester });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model, can upgrade to gpt-4 if needed
      messages: [
        {
          role: 'system',
          content: 'You are an expert academic assistant helping students understand lecture notes. Provide clear, structured summaries in Korean that help students study effectively.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0].message.content;
    
    // Parse the structured response
    const summary = parseAIResponse(responseText);

    return summary;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
}

function buildPrompt({ text, title, subject, professor, semester }) {
  // Truncate text if too long (keep first ~6000 chars to stay within token limits)
  const truncatedText = text.length > 6000 ? text.substring(0, 6000) + '...' : text;

  return `아래 강의 노트를 분석하여 학생들이 효과적으로 학습할 수 있도록 요약해주세요.

**강의 정보:**
- 제목: ${title || '정보 없음'}
- 과목: ${subject || '정보 없음'}
- 교수님: ${professor || '정보 없음'}
- 학기: ${semester || '정보 없음'}

**노트 내용:**
${truncatedText}

다음 형식으로 응답해주세요 (각 섹션을 명확히 구분):

### 핵심 내용
- [핵심 포인트 1]
- [핵심 포인트 2]
- [핵심 포인트 3]

### 난이도
[입문/초급/중급/중상급/고급 중 하나]

### 예상 학습시간
[예: 30분, 1시간 등]

### 전체 요약
[2-3 문장으로 노트 전체 내용을 요약]

### 태그
[관련 키워드를 쉼표로 구분하여 나열]`;
}

function parseAIResponse(responseText) {
  const summary = {
    keyPoints: [],
    difficulty: '중급',
    estimatedTime: '1시간',
    summary: '',
    tags: [],
  };

  try {
    // Extract key points
    const keyPointsMatch = responseText.match(/###\s*핵심\s*내용\s*\n([\s\S]*?)(?=###|$)/i);
    if (keyPointsMatch) {
      const keyPointsText = keyPointsMatch[1];
      const points = keyPointsText
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(point => point.length > 0);
      summary.keyPoints = points.slice(0, 5); // Max 5 points
    }

    // Extract difficulty
    const difficultyMatch = responseText.match(/###\s*난이도\s*\n([^\n]+)/i);
    if (difficultyMatch) {
      summary.difficulty = difficultyMatch[1].trim();
    }

    // Extract estimated time
    const timeMatch = responseText.match(/###\s*예상\s*학습시간\s*\n([^\n]+)/i);
    if (timeMatch) {
      summary.estimatedTime = timeMatch[1].trim();
    }

    // Extract full summary
    const summaryMatch = responseText.match(/###\s*전체\s*요약\s*\n([\s\S]*?)(?=###|$)/i);
    if (summaryMatch) {
      summary.summary = summaryMatch[1].trim();
    }

    // Extract tags
    const tagsMatch = responseText.match(/###\s*태그\s*\n([^\n]+)/i);
    if (tagsMatch) {
      summary.tags = tagsMatch[1]
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }

    // Fallback: if parsing failed, use the whole response as summary
    if (summary.keyPoints.length === 0 || !summary.summary) {
      summary.summary = responseText.substring(0, 500);
      summary.keyPoints = ['요약 생성 중 오류가 발생했습니다'];
    }

  } catch (parseError) {
    console.error('Error parsing AI response:', parseError);
    summary.summary = responseText.substring(0, 500);
    summary.keyPoints = ['파싱 오류 발생'];
  }

  return summary;
}
