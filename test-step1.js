// Simple test for claim extraction only
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

console.log('Testing Agent 1: Claim Extraction\n');
console.log('Note:', testNote);
console.log('\n' + '='.repeat(60) + '\n');

fetch('http://localhost:3001/api/extract-claims', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    noteContent: testNote,
    subject: '운영체제'
  })
})
.then(res => res.json())
.then(data => {
  if (data.error) {
    console.error('Error:', data.error);
    return;
  }
  
  console.log(`✅ Extracted ${data.claims.length} claims:\n`);
  data.claims.forEach((claim, i) => {
    console.log(`${i+1}. [${claim.type}] "${claim.text}"`);
    console.log(`   Priority: ${claim.priority}, Category: ${claim.category}\n`);
  });
})
.catch(err => console.error('Failed:', err.message));
