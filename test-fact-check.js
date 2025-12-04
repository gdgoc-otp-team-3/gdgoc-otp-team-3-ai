/**
 * Test script for fact-checking pipeline
 * Run each test step by step to verify the agents
 */

const testNoteContent = `
운영체제 강의 노트 - 프로세스 관리

1. 프로세스의 정의
프로세스는 실행 중인 프로그램이다. 프로세스는 4개의 상태를 가진다.

2. 프로세스 스케줄링
- FCFS (First Come First Served): 가장 먼저 도착한 프로세스를 먼저 실행
- SJF (Shortest Job First): 실행 시간이 가장 짧은 프로세스를 먼저 실행
- Round Robin: 각 프로세스에 동일한 시간을 할당

3. 스레드
스레드는 경량 프로세스라고 불린다. 하나의 프로세스는 여러 스레드를 가질 수 있다.

4. 동기화
뮤텍스(Mutex)는 상호배제를 구현하는 도구이다. 
세마포어(Semaphore)는 카운팅을 통해 자원 접근을 제어한다.

5. 데드락
데드락은 2개의 조건이 충족되면 발생한다: 
- 상호배제
- 순환 대기
`;

console.log('='.repeat(60));
console.log('FACT-CHECKING PIPELINE TEST');
console.log('='.repeat(60));
console.log('\nTest Note Content:');
console.log(testNoteContent);
console.log('\n' + '='.repeat(60));

// Test 1: Extract Claims (Agent 1)
async function testClaimExtraction() {
  console.log('\n📋 STEP 1: CLAIM EXTRACTION (Agent 1)');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch('http://localhost:3001/api/extract-claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        noteContent: testNoteContent,
        subject: '운영체제',
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', result.error);
      return null;
    }

    console.log(`✅ Successfully extracted ${result.claims.length} claims\n`);
    
    console.log('Extracted Claims:');
    result.claims.forEach((claim, idx) => {
      console.log(`\n${idx + 1}. [${claim.type.toUpperCase()}] [Priority: ${claim.priority}]`);
      console.log(`   "${claim.text}"`);
      console.log(`   Category: ${claim.category}`);
      console.log(`   Keywords: ${claim.keywords.join(', ')}`);
    });

    console.log('\nMetadata:');
    console.log(`- Total claims: ${result.metadata.totalClaims}`);
    console.log(`- Claim types:`, result.metadata.claimTypes);

    return result.claims;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

// Test 2: Verify Single Claim (Agent 2 + 3)
async function testSingleClaimVerification(claim) {
  console.log('\n\n🔍 STEP 2: SINGLE CLAIM VERIFICATION (Agent 2 + 3)');
  console.log('-'.repeat(60));
  console.log(`Testing claim: "${claim.text}"\n`);
  
  try {
    const response = await fetch('http://localhost:3001/api/verify-claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        claim: claim,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', result.error);
      return;
    }

    console.log('📚 Evidence Retrieved:');
    console.log(`   Found ${result.evidence.sources.length} sources\n`);
    
    result.evidence.sources.forEach((source, idx) => {
      console.log(`   Source ${idx + 1}: [${source.type.toUpperCase()}] - ${source.reliability} reliability`);
      console.log(`   Title: ${source.title}`);
      if (source.url) console.log(`   URL: ${source.url}`);
      if (source.excerpt) console.log(`   Excerpt: ${source.excerpt.substring(0, 150)}...`);
      console.log();
    });

    console.log('⚖️  Verification Result:');
    console.log(`   Verdict: ${result.verification.verdict.toUpperCase()}`);
    console.log(`   Confidence: ${(result.verification.confidence * 100).toFixed(1)}%`);
    console.log(`   Severity: ${result.verification.severity}`);
    console.log(`   Explanation: ${result.verification.explanation}`);
    
    if (result.verification.correction) {
      console.log(`   ✏️  Correction: ${result.verification.correction}`);
    }

    console.log('\n   Source Agreement:');
    console.log(`   - Supporting: ${result.verification.sourceAgreement?.supporting || 0}`);
    console.log(`   - Refuting: ${result.verification.sourceAgreement?.refuting || 0}`);
    console.log(`   - Unclear: ${result.verification.sourceAgreement?.unclear || 0}`);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 3: Full Fact-Check Pipeline
async function testFullFactCheck() {
  console.log('\n\n🎯 STEP 3: FULL FACT-CHECK PIPELINE');
  console.log('-'.repeat(60));
  console.log('Running complete fact-check on note...\n');
  
  try {
    console.log('⏳ This may take 30-60 seconds...\n');
    
    const response = await fetch('http://localhost:3001/api/fact-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        noteContent: testNoteContent,
        subject: '운영체제',
        checkAll: false, // Only check high/medium priority claims
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', result.error);
      return;
    }

    console.log('📊 FACT-CHECK REPORT');
    console.log('='.repeat(60));
    
    console.log('\n📈 Summary:');
    console.log(`   Total Checked: ${result.report.summary.totalChecked}`);
    console.log(`   ✅ Correct: ${result.report.summary.correct}`);
    console.log(`   ❌ Incorrect: ${result.report.summary.incorrect}`);
    console.log(`   ⚠️  Partially Correct: ${result.report.summary.partiallyCorrect}`);
    console.log(`   ❓ Unclear: ${result.report.summary.unclear}`);
    console.log(`   📊 Accuracy: ${result.report.summary.accuracy}%`);

    console.log('\n🚨 Severity Breakdown:');
    console.log(`   Critical Errors: ${result.report.severity.critical}`);
    console.log(`   Major Errors: ${result.report.severity.major}`);
    console.log(`   Minor Errors: ${result.report.severity.minor}`);

    if (result.report.topIssues.length > 0) {
      console.log('\n🔴 Top Issues Found:');
      result.report.topIssues.forEach((issue, idx) => {
        console.log(`\n   ${idx + 1}. [${issue.severity.toUpperCase()}]`);
        console.log(`      Claim: "${issue.text}"`);
        console.log(`      Verdict: ${issue.verdict}`);
        if (issue.correction) {
          console.log(`      Correction: ${issue.correction}`);
        }
      });
    }

    console.log('\n📋 Overall Assessment:');
    console.log(`   Grade: ${result.report.overallAssessment.grade.toUpperCase()}`);
    console.log(`   Message: ${result.report.overallAssessment.message}`);

    console.log('\n✅ All claims with details:');
    result.claims.forEach((claim, idx) => {
      const icon = claim.verdict === 'correct' ? '✅' : 
                   claim.verdict === 'incorrect' ? '❌' : 
                   claim.verdict === 'partially_correct' ? '⚠️' : '❓';
      
      console.log(`\n   ${icon} Claim ${idx + 1}: "${claim.text}"`);
      console.log(`      Verdict: ${claim.verdict} (${(claim.confidence * 100).toFixed(0)}% confidence)`);
      console.log(`      Severity: ${claim.severity}`);
      console.log(`      Sources: ${claim.sources.length}`);
      if (claim.correction) {
        console.log(`      ✏️  Correction: ${claim.correction}`);
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting fact-check pipeline tests...\n');
  
  // Test 1: Extract claims
  const claims = await testClaimExtraction();
  
  if (claims && claims.length > 0) {
    // Test 2: Verify one claim (the one that should be wrong)
    const testClaim = claims.find(c => c.text.includes('4개의 상태')) || claims[0];
    await testSingleClaimVerification(testClaim);
    
    // Test 3: Full pipeline
    await testFullFactCheck();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS COMPLETED');
  console.log('='.repeat(60));
}

// Run tests
runAllTests().catch(console.error);
