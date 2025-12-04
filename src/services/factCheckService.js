import OpenAI from 'openai';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AGENT 1: CLAIM EXTRACTOR
 * Extracts verifiable factual claims from lecture notes
 */
export async function extractClaims(noteContent, subject) {
  try {
    const prompt = buildClaimExtractionPrompt(noteContent, subject);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a fact extraction expert. Extract only verifiable, objective claims that can be fact-checked against authoritative sources. Ignore subjective opinions, examples, and explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2, // Low temperature for consistent extraction
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0].message.content;
    const claimsData = JSON.parse(responseText);

    return formatExtractedClaims(claimsData, noteContent);
  } catch (error) {
    console.error('Claim extraction error:', error);
    throw new Error(`Failed to extract claims: ${error.message}`);
  }
}

function buildClaimExtractionPrompt(noteContent, subject) {
  const truncatedContent = noteContent.length > 8000 ? noteContent.substring(0, 8000) + '...' : noteContent;

  return `다음 강의 노트에서 사실 확인이 가능한 주장(claims)만 추출해주세요.

**과목:** ${subject || '일반'}

**노트 내용:**
${truncatedContent}

**추출 대상 (ONLY extract these types):**

1. **정의 (Definitions)**
   - "X는 Y이다"
   - Example: "프로세스는 실행 중인 프로그램이다"

2. **수치/날짜 (Numerical Facts)**
   - 구체적인 숫자, 날짜, 통계
   - Example: "TCP는 3-way handshake를 사용한다"

3. **관계/인과 (Relationships)**
   - X는 Y를 초래한다, X는 Y보다 빠르다
   - Example: "해시 테이블은 O(1)의 검색 시간을 가진다"

4. **속성/특징 (Properties)**
   - X는 Y 속성을 가진다
   - Example: "Python은 동적 타이핑 언어이다"

5. **공식/정리 (Formulas/Theorems)**
   - 수학 공식, 알고리즘 복잡도
   - Example: "퀵소트의 평균 시간 복잡도는 O(n log n)이다"

**제외 대상 (DO NOT extract):**
- 주관적 의견 ("이해하기 쉽다", "중요하다")
- 예시/샘플 코드 (실제 설명이 아닌 예시)
- 강의 메타정보 ("다음 주에 배울 것", "시험에 나옴")
- 불명확한 진술 ("아마도", "~인 것 같다")

**JSON 형식으로 응답:**
{
  "claims": [
    {
      "id": 1,
      "text": "추출된 주장의 원문",
      "type": "definition|numerical|relationship|property|formula",
      "category": "주제 카테고리 (e.g., 프로세스 관리, 자료구조)",
      "keywords": ["핵심", "키워드"],
      "verifiable": true,
      "priority": "high|medium|low",
      "context": "주장이 나타난 문맥 (앞뒤 1-2문장)"
    }
  ],
  "metadata": {
    "totalClaims": 숫자,
    "claimTypes": {
      "definition": 개수,
      "numerical": 개수,
      "relationship": 개수,
      "property": 개수,
      "formula": 개수
    }
  }
}

**중요:** 
- 각 주장은 독립적으로 검증 가능해야 함
- 모호하거나 불명확한 주장은 제외
- 핵심 개념만 추출 (사소한 세부사항 제외)
- 우선순위: 시험/학습에 중요한 주장 = high`;
}

function formatExtractedClaims(claimsData, originalContent) {
  if (!claimsData.claims || !Array.isArray(claimsData.claims)) {
    throw new Error('Invalid claims data format');
  }

  return {
    claims: claimsData.claims.map((claim) => ({
      id: claim.id,
      text: claim.text,
      type: claim.type,
      category: claim.category,
      keywords: claim.keywords || [],
      verifiable: claim.verifiable !== false, // Default true
      priority: claim.priority || 'medium',
      context: claim.context || '',
      status: 'pending', // pending, verified, error, uncertain
      confidence: null,
      sources: [],
    })),
    metadata: {
      totalClaims: claimsData.claims.length,
      claimTypes: claimsData.metadata?.claimTypes || {},
      extractedAt: new Date().toISOString(),
      originalLength: originalContent.length,
    },
  };
}

/**
 * AGENT 2: EVIDENCE RETRIEVER
 * Searches multiple sources for evidence
 */
export async function retrieveEvidence(claim) {
  const evidence = {
    claimId: claim.id,
    claimText: claim.text,
    sources: [],
  };

  try {
    // Parallel search across multiple sources
    const [webResults, scholarResults, educationResults] = await Promise.allSettled([
      searchWeb(claim.text, claim.keywords),
      searchSemanticScholar(claim.text, claim.category),
      searchEducationalResources(claim.text, claim.keywords),
    ]);

    if (webResults.status === 'fulfilled') {
      evidence.sources.push(...webResults.value);
    }

    if (scholarResults.status === 'fulfilled') {
      evidence.sources.push(...scholarResults.value);
    }

    if (educationResults.status === 'fulfilled') {
      evidence.sources.push(...educationResults.value);
    }

    return evidence;
  } catch (error) {
    console.error('Evidence retrieval error:', error);
    return evidence; // Return partial results
  }
}

/**
 * Web Search using GPT-4o with browsing capability
 */
async function searchWeb(claimText, keywords) {
  try {
    const searchQuery = `${claimText} ${keywords.join(' ')}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a fact-checking assistant. Search the web for reliable sources to verify or refute the given claim. Focus on authoritative sources like educational institutions, official documentation, and reputable tech sites.',
        },
        {
          role: 'user',
          content: `Verify this claim and provide sources: "${claimText}"
          
Return in JSON format:
{
  "verdict": "confirmed|refuted|partially_correct|unclear",
  "explanation": "brief explanation",
  "sources": [
    {
      "title": "source title",
      "url": "source url",
      "excerpt": "relevant excerpt",
      "reliability": "high|medium|low"
    }
  ]
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    return result.sources.map((source) => ({
      type: 'web',
      title: source.title,
      url: source.url,
      excerpt: source.excerpt,
      verdict: result.verdict,
      reliability: source.reliability,
      retrievedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

/**
 * Semantic Scholar API search
 */
async function searchSemanticScholar(claimText, category) {
  try {
    const query = encodeURIComponent(claimText);
    const response = await axios.get(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&limit=3&fields=title,abstract,url,year,citationCount,authors`,
      {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.data || !response.data.data) {
      return [];
    }

    return response.data.data.map((paper) => ({
      type: 'academic',
      title: paper.title,
      url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
      excerpt: paper.abstract ? paper.abstract.substring(0, 300) + '...' : '',
      year: paper.year,
      citations: paper.citationCount,
      authors: paper.authors?.slice(0, 3).map(a => a.name).join(', ') || 'Unknown',
      reliability: paper.citationCount > 50 ? 'high' : paper.citationCount > 10 ? 'medium' : 'low',
      retrievedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Semantic Scholar search error:', error);
    return [];
  }
}

/**
 * Search Khan Academy & MIT OpenCourseWare
 */
async function searchEducationalResources(claimText, keywords) {
  const sources = [];

  try {
    // Khan Academy search (using web scraping or their API if available)
    const khanQuery = encodeURIComponent(`${claimText} site:khanacademy.org`);

    // MIT OCW search
    const mitQuery = encodeURIComponent(`${claimText} site:ocw.mit.edu`);

    // Use GPT-4o to search and extract from these sites
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `Search Khan Academy and MIT OpenCourseWare for information about: "${claimText}"
          
Find educational content that verifies or explains this concept. Return in JSON:
{
  "sources": [
    {
      "platform": "Khan Academy|MIT OCW",
      "title": "lesson/course title",
      "url": "url",
      "excerpt": "relevant excerpt",
      "topic": "topic covered"
    }
  ]
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    if (result.sources) {
      sources.push(
        ...result.sources.map((source) => ({
          type: 'educational',
          platform: source.platform,
          title: source.title,
          url: source.url,
          excerpt: source.excerpt,
          reliability: 'high', // Khan/MIT are trusted
          retrievedAt: new Date().toISOString(),
        }))
      );
    }
  } catch (error) {
    console.error('Educational resources search error:', error);
  }

  return sources;
}

/**
 * AGENT 3: FACT VERIFIER
 * Cross-checks evidence and determines verdict
 */
export async function verifyClaim(claim, evidence) {
  try {
    const prompt = buildVerificationPrompt(claim, evidence);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a rigorous fact-checker. Analyze evidence from multiple sources and determine if the claim is correct, incorrect, or needs clarification. Be strict and evidence-based.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0].message.content;
    const verification = JSON.parse(responseText);

    return {
      claimId: claim.id,
      verdict: verification.verdict, // correct, incorrect, partially_correct, unclear
      confidence: verification.confidence, // 0-1
      explanation: verification.explanation,
      correction: verification.correction || null,
      severity: verification.severity, // critical, major, minor, info
      sourceAgreement: verification.sourceAgreement, // how many sources agree
      verifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Verification error:', error);
    throw new Error(`Failed to verify claim: ${error.message}`);
  }
}

function buildVerificationPrompt(claim, evidence) {
  const sourceSummary = evidence.sources
    .map((source, idx) => {
      return `
Source ${idx + 1} [${source.type.toUpperCase()} - ${source.reliability} reliability]:
Title: ${source.title}
${source.verdict ? `Verdict: ${source.verdict}` : ''}
Excerpt: ${source.excerpt}
${source.citations ? `Citations: ${source.citations}` : ''}
`;
    })
    .join('\n---\n');

  return `주장(Claim)을 검증해주세요.

**검증할 주장:**
"${claim.text}"

**카테고리:** ${claim.category}
**타입:** ${claim.type}

**수집된 증거 (${evidence.sources.length}개 출처):**
${sourceSummary}

**검증 요구사항:**

1. **Verdict (판정):**
   - correct: 주장이 정확함 (모든 출처가 일치)
   - incorrect: 주장이 틀림 (출처들이 반박)
   - partially_correct: 부분적으로 맞음 (세부사항 오류)
   - unclear: 출처가 불충분하거나 상충됨

2. **Confidence (신뢰도):** 0.0-1.0
   - 1.0: 3+ high-reliability sources agree
   - 0.8: 2+ sources agree
   - 0.6: Mixed evidence
   - 0.4: Conflicting sources
   - 0.2: Insufficient evidence

3. **Severity (심각도):**
   - critical: 근본적으로 틀린 개념 (시험/실무에서 문제)
   - major: 중요한 오류 (이해에 영향)
   - minor: 사소한 부정확성 (큰 영향 없음)
   - info: 추가 설명 필요 (틀리진 않지만 불완전)

**JSON 형식으로 응답:**
{
  "verdict": "correct|incorrect|partially_correct|unclear",
  "confidence": 0.85,
  "explanation": "상세한 검증 설명 (왜 이런 판정을 내렸는지)",
  "correction": "틀렸다면, 정확한 정보는 무엇인지 (verdict가 incorrect/partially_correct일 때만)",
  "severity": "critical|major|minor|info",
  "sourceAgreement": {
    "total": 출처 총 개수,
    "supporting": 주장을 지지하는 출처 수,
    "refuting": 주장을 반박하는 출처 수,
    "unclear": 불명확한 출처 수
  },
  "recommendations": [
    "학생에게 줄 추천사항/조언"
  ]
}`;
}

/**
 * MAIN PIPELINE: Fact-check entire note
 */
export async function factCheckNote({ noteContent, subject, checkAll = false }) {
  try {
    console.log('Starting fact-check pipeline...');

    // AGENT 1: Extract claims
    console.log('Step 1: Extracting claims...');
    const { claims, metadata } = await extractClaims(noteContent, subject);
    console.log(`Extracted ${claims.length} claims`);

    // Filter claims based on priority if not checking all
    const claimsToCheck = checkAll
      ? claims
      : claims.filter(c => c.priority === 'high' || c.priority === 'medium');

    console.log(`Checking ${claimsToCheck.length} claims...`);

    // AGENT 2 & 3: Retrieve evidence and verify (in batches to avoid rate limits)
    const verifiedClaims = [];
    const batchSize = 3; // Process 3 claims at a time

    for (let i = 0; i < claimsToCheck.length; i += batchSize) {
      const batch = claimsToCheck.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (claim) => {
          try {
            console.log(`Verifying claim ${claim.id}: "${claim.text.substring(0, 50)}..."`);

            // AGENT 2: Retrieve evidence
            const evidence = await retrieveEvidence(claim);

            // AGENT 3: Verify claim
            const verification = await verifyClaim(claim, evidence);

            return {
              ...claim,
              ...verification,
              sources: evidence.sources,
            };
          } catch (error) {
            console.error(`Error verifying claim ${claim.id}:`, error);
            return {
              ...claim,
              verdict: 'error',
              confidence: 0,
              explanation: `Verification failed: ${error.message}`,
              severity: 'info',
            };
          }
        })
      );

      verifiedClaims.push(...batchResults);

      // Rate limiting delay
      if (i + batchSize < claimsToCheck.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Generate summary report
    const report = generateFactCheckReport(verifiedClaims, metadata);

    return {
      claims: verifiedClaims,
      report: report,
      metadata: {
        ...metadata,
        checkedClaims: verifiedClaims.length,
        completedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Fact-check pipeline error:', error);
    throw new Error(`Failed to fact-check note: ${error.message}`);
  }
}

function generateFactCheckReport(claims, metadata) {
  const errors = claims.filter(c => c.verdict === 'incorrect');
  const warnings = claims.filter(c => c.verdict === 'partially_correct');
  const unclear = claims.filter(c => c.verdict === 'unclear');
  const correct = claims.filter(c => c.verdict === 'correct');

  const criticalErrors = errors.filter(c => c.severity === 'critical');
  const majorErrors = errors.filter(c => c.severity === 'major');

  return {
    summary: {
      totalChecked: claims.length,
      correct: correct.length,
      incorrect: errors.length,
      partiallyCorrect: warnings.length,
      unclear: unclear.length,
      accuracy: claims.length > 0 ? Math.round((correct.length / claims.length) * 100) : 0,
    },
    severity: {
      critical: criticalErrors.length,
      major: majorErrors.length,
      minor: errors.filter(c => c.severity === 'minor').length,
    },
    topIssues: [
      ...criticalErrors.slice(0, 3),
      ...majorErrors.slice(0, 3),
    ].map(claim => ({
      text: claim.text,
      verdict: claim.verdict,
      severity: claim.severity,
      correction: claim.correction,
    })),
    overallAssessment: generateOverallAssessment(claims),
  };
}

function generateOverallAssessment(claims) {
  const accuracy = claims.filter(c => c.verdict === 'correct').length / claims.length;
  const criticalCount = claims.filter(c => c.severity === 'critical').length;

  if (criticalCount > 0) {
    return {
      grade: 'C',
      message: `${criticalCount}개의 중대한 오류가 발견되었습니다. 수정이 필요합니다.`,
      color: 'red',
    };
  } else if (accuracy >= 0.9) {
    return {
      grade: 'S',
      message: '매우 정확한 노트입니다! (S등급)',
      color: 'blue',
    };
  } else if (accuracy >= 0.8) {
    return {
      grade: 'A',
      message: '정확도가 높은 우수한 노트입니다. (A등급)',
      color: 'green',
    };
  } else if (accuracy >= 0.6) {
    return {
      grade: 'B',
      message: '대체로 정확하지만 일부 확인이 필요합니다. (B등급)',
      color: 'yellow',
    };
  } else {
    return {
      grade: 'C',
      message: '많은 부분에서 수정이 필요합니다. (C등급)',
      color: 'orange',
    };
  }
}
