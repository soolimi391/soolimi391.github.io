<!DOCTYPE html>
<html lang="ko">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>로또 상담 챗봇</title>

  <!-- ✅ 외부 CSS 연결 -->
  <link rel="stylesheet" href="style.css">

  <!-- ✅ SheetJS (엑셀 파일 읽기용) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

</head>

<body>

  <div class="chat-container">
    <div class="chat-box" id="chatBox">
      <div class="message bot">
        <div class="avatar"><img src="https://i.imgur.com/dBa600u.png" alt="상담원" /></div>
        <div class="bubble">
          안녕하세요! <strong class="highlight">로또 상담 챗봇</strong>입니다 😊<br>
          로또 분석, 통계, 패턴, 추천 등 무엇이든 물어보세요!<br><br>
        
          <strong>📌 예시 질문 (실제 응답 가능)</strong><br>
          ▶ <strong class="highlight-red">회차 기반 분석</strong><br>
          • 1234회차 총합<br>
          • 1100 핫넘버<br>
          • 최신 회차 콜드넘버<br>
          • 1000~1050 제곱수 분석<br><br>
        
          ▶ <strong class="highlight-red">번호 패턴 분석</strong><br>
          • '(숫자)배수 분석' <span style="color:gray;">(숫자 필요: 예 '3배수')</span><br>
          • '(숫자)분법 분석' <span style="color:gray;">(숫자 필요: 예 '5분법')</span><br>
          • '(숫자)단위 분석' <span style="color:gray;">(숫자 필요: 예 '7분법')</span><br>
          • '(숫자)번 출현 분석' <span style="color:gray;">(숫자 필요: 예 '7번 출현')</span><br>
          • '소수 번호 출현' <span style="color:gray;">(숫자 입력 불필요)</span><br><br>
        
          ▶ <strong class="highlight-red">구간/비율 분석</strong><br>
          • 홀짝 분석<br>
          • 저고 패턴<br>
          • 연속수 분석<br>
          • 끝수 분석<br>
          • 간격 분석<br>
          • 낙수 분석<br>
          • 궁(弓) 분석<br><br>
        
          ▶ <strong class="highlight-red">기타 정보</strong><br>
          • 당첨 확률은?<br>
          • 자동과 수동 중 뭐가 나아?<br>
          • 로또 당첨 시 세금은?<br>
          • 역대 최대 당첨금은 얼마?<br><br>
        
          👉 질문 예: <strong>'최신 핫넘버', '5배수 분석', '1234회차 총합', '당첨 확률은?'</strong><br>
          👉 <strong>원하는 분석을 자유롭게 입력</strong>해보세요!
        </div>
        
      </div>
    </div>

    <div class="chat-input" id="chatInput">
      <input type="text" id="userInput" placeholder="메시지를 입력하세요..." onkeydown="if(event.key==='Enter') sendMessage();" />
      <button onclick="sendMessage()">전송</button>
    </div>
  </div>

  <div class="center-button" id="landingButton">
    <button onclick="location.href='./landing.html'">로또 번호 추천 받으러 가기</button>
  </div>

  <!-- ✅ 외부 JS 연결 -->
  <script src="script.js"></script>

</body>

</html>
