// Test script for the AI summary service
// Run with: node test-example.js (after starting the server)

const testText = `
자료구조 강의 노트

1. 스택(Stack)
- LIFO(Last In First Out) 구조
- push(), pop(), peek() 연산
- 함수 호출, 괄호 검사 등에 활용

2. 큐(Queue)
- FIFO(First In First Out) 구조
- enqueue(), dequeue() 연산
- BFS, 프린터 작업 대기열 등에 활용

3. 연결 리스트(Linked List)
- 동적 메모리 할당
- 노드(Node)와 포인터로 구성
- 삽입/삭제가 배열보다 효율적

시험 범위: 스택과 큐의 구현, 연결 리스트의 삽입/삭제 연산
`;

async function testSummaryService() {
  const url = 'http://localhost:3001/api/summarize-text';
  
  const requestBody = {
    text: testText,
    title: '자료구조 기초',
    subject: '자료구조',
    professor: '김교수',
    semester: '2024-2'
  };

  try {
    console.log('🧪 Testing AI Summary Service...\n');
    console.log('Sending request to:', url);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    console.log('\n⏳ Waiting for response...\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Success! AI Summary Generated:\n');
    console.log('📌 Key Points:');
    result.keyPoints.forEach((point, idx) => {
      console.log(`   ${idx + 1}. ${point}`);
    });
    
    console.log(`\n📊 Difficulty: ${result.difficulty}`);
    console.log(`⏱️  Estimated Time: ${result.estimatedTime}`);
    
    console.log(`\n📝 Summary:\n   ${result.summary}`);
    
    console.log(`\n🏷️  Tags: ${result.tags.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Make sure the AI service is running on port 3001');
    console.error('   Start it with: npm start or npm run dev');
  }
}

testSummaryService();
