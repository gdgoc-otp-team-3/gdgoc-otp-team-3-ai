// Test Full Pipeline: Extract all claims and verify them
const testNote = `운영체제 강의 노트

1. 프로세스의 정의
프로세스는 실행 중인 프로그램이다. 프로세스는 4개의 상태를 가진다.
각 프로세스는 독립적인 메모리 공간을 할당받는다.

2. 스레드
스레드는 경량 프로세스라고 불린다. 하나의 프로세스는 여러 스레드를 가질 수 있다.
스레드들은 같은 메모리 공간을 공유한다.

3. 데드락
데드락은 2개의 조건이 충족되면 발생한다: 상호배제와 순환 대기.
데드락을 예방하려면 이 조건들 중 하나를 제거해야 한다.`;

console.log('🎯 FULL FACT-CHECK PIPELINE TEST\n');
console.log('Note content:');
console.log(testNote);
console.log('\n' + '='.repeat(60) + '\n');
console.log('⏳ Running complete fact-check...');
console.log('   (This will take 30-60 seconds)\n');

fetch('http://localhost:3001/api/fact-check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    noteContent: testNote,
    subject: '운영체제',
    checkAll: false // Only check high/medium priority
  })
})
.then(res => res.json())
.then(data => {
  if (data.error) {
    console.error('❌ Error:', data.error);
    return;
  }
  
  console.log('=' .repeat(60));
  console.log('📊 FACT-CHECK REPORT');
  console.log('='.repeat(60));
  
  console.log('\n📈 SUMMARY:');
  console.log(`   Total Claims Checked: ${data.report.summary.totalChecked}`);
  console.log(`   ✅ Correct: ${data.report.summary.correct}`);
  console.log(`   ❌ Incorrect: ${data.report.summary.incorrect}`);
  console.log(`   ⚠️  Partially Correct: ${data.report.summary.partiallyCorrect}`);
  console.log(`   ❓ Unclear: ${data.report.summary.unclear}`);
  console.log(`   📊 Overall Accuracy: ${data.report.summary.accuracy}%`);
  
  console.log('\n🚨 SEVERITY BREAKDOWN:');
  console.log(`   🔴 Critical Errors: ${data.report.severity.critical}`);
  console.log(`   🟠 Major Errors: ${data.report.severity.major}`);
  console.log(`   🟡 Minor Errors: ${data.report.severity.minor}`);
  
  console.log('\n📋 OVERALL ASSESSMENT:');
  console.log(`   Grade: ${data.report.overallAssessment.grade.toUpperCase()}`);
  console.log(`   ${data.report.overallAssessment.message}`);
  
  if (data.report.topIssues && data.report.topIssues.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('🔴 TOP ISSUES FOUND:');
    console.log('='.repeat(60));
    
    data.report.topIssues.forEach((issue, i) => {
      console.log(`\n${i+1}. [${issue.severity.toUpperCase()}] ${issue.verdict.toUpperCase()}`);
      console.log(`   Claim: "${issue.text}"`);
      if (issue.correction) {
        console.log(`   ✏️  Correction: ${issue.correction}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📝 ALL CLAIMS DETAILED RESULTS:');
  console.log('='.repeat(60));
  
  data.claims.forEach((claim, i) => {
    const icon = claim.verdict === 'correct' ? '✅' : 
                 claim.verdict === 'incorrect' ? '❌' : 
                 claim.verdict === 'partially_correct' ? '⚠️' : '❓';
    
    console.log(`\n${i+1}. ${icon} "${claim.text}"`);
    console.log(`   Verdict: ${claim.verdict.toUpperCase()}`);
    console.log(`   Confidence: ${(claim.confidence * 100).toFixed(0)}%`);
    console.log(`   Severity: ${claim.severity}`);
    console.log(`   Sources: ${claim.sources.length}`);
    console.log(`   Explanation: ${claim.explanation}`);
    
    if (claim.correction) {
      console.log(`   ✏️  Correction: ${claim.correction}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ FACT-CHECK COMPLETE');
  console.log('='.repeat(60));
})
.catch(err => console.error('\n❌ Pipeline failed:', err.message));
