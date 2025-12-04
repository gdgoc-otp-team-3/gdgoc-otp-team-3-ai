// Test Agent 2 + 3: Evidence Retrieval and Verification
const testClaim = {
  id: 1,
  text: "프로세스는 4개의 상태를 가진다",
  type: "property",
  category: "프로세스 관리",
  keywords: ["프로세스", "상태"],
  priority: "high"
};

console.log('Testing Agent 2 + 3: Evidence Retrieval & Fact Verification\n');
console.log('Claim to verify:', testClaim.text);
console.log('\n' + '='.repeat(60) + '\n');
console.log('⏳ Searching web, academic papers, and educational resources...\n');

fetch('http://localhost:3001/api/verify-claim', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ claim: testClaim })
})
.then(res => res.json())
.then(data => {
  if (data.error) {
    console.error('❌ Error:', data.error);
    return;
  }
  
  console.log('📚 EVIDENCE RETRIEVED (Agent 2):');
  console.log(`   Found ${data.evidence.sources.length} sources\n`);
  
  data.evidence.sources.forEach((source, i) => {
    console.log(`   ${i+1}. [${source.type.toUpperCase()}] ${source.reliability} reliability`);
    console.log(`      Title: ${source.title}`);
    if (source.url) console.log(`      URL: ${source.url}`);
    if (source.excerpt) console.log(`      Excerpt: ${source.excerpt.substring(0, 120)}...`);
    if (source.citations) console.log(`      Citations: ${source.citations}`);
    console.log();
  });
  
  console.log('=' .repeat(60));
  console.log('\n⚖️  VERIFICATION RESULT (Agent 3):\n');
  console.log(`   Verdict: ${data.verification.verdict.toUpperCase()}`);
  console.log(`   Confidence: ${(data.verification.confidence * 100).toFixed(1)}%`);
  console.log(`   Severity: ${data.verification.severity.toUpperCase()}`);
  console.log(`\n   📝 Explanation:`);
  console.log(`   ${data.verification.explanation}\n`);
  
  if (data.verification.correction) {
    console.log(`   ✏️  CORRECTION:`);
    console.log(`   ${data.verification.correction}\n`);
  }
  
  if (data.verification.sourceAgreement) {
    console.log(`   📊 Source Agreement:`);
    console.log(`      Supporting: ${data.verification.sourceAgreement.supporting}`);
    console.log(`      Refuting: ${data.verification.sourceAgreement.refuting}`);
    console.log(`      Unclear: ${data.verification.sourceAgreement.unclear}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n${data.verification.verdict === 'incorrect' ? '❌' : '✅'} This claim is ${data.verification.verdict.toUpperCase()}`);
  console.log('='.repeat(60));
})
.catch(err => console.error('\n❌ Failed:', err.message));
