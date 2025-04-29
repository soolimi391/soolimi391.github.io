// ✅ 로또 챗봇 핵심 스크립트

// 전역 변수
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const landingButton = document.getElementById("landingButton");

let questionCount = 0;
let waitingAnalysisType = null;  // ✅ 사용자가 분석 대기 중인 키워드 저장용 (핫넘버, 콜드넘버 등)
let lottoData = {};
let keywords = {};
let latestRound = 0;
let waitingExtraInfo = null;

// ✅ 초기화
window.addEventListener('load', async () => {
    await loadLottoData();
    await loadKeywords();
});

// ✅ 로또 데이터 로드
async function loadLottoData() {
    try {
        const response = await fetch('https://soolimi391.github.io/lotto_numbers.xlsx');
        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        json.forEach(row => {
            if (row.회차 && row.번호1) {
                lottoData[row.회차] = [row.번호1, row.번호2, row.번호3, row.번호4, row.번호5, row.번호6, row.보너스번호];
                if (row.회차 > latestRound) latestRound = row.회차;
            }
        });
    } catch (error) {
        alert('❌ 로또 데이터 불러오기 실패');
        console.error(error);
    }
}

// ✅ 키워드 데이터 로드
async function loadKeywords() {
    try {
        const response = await fetch('https://soolimi391.github.io/lotto_keywords.xlsx');
        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        json.forEach(row => {
            if (row.키워드 && row.답변) {
                keywords[row.키워드] = row.답변;
            }
        });
    } catch (error) {
        alert('❌ 키워드 데이터 불러오기 실패');
        console.error(error);
    }
}

// ✅ 메시지 추가 함수
function appendMessage(content, type) {
    const msg = document.createElement("div");
    msg.className = "message " + type;
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    if (type === "bot") {
        const img = document.createElement("img");
        img.src = "https://i.imgur.com/dBa600u.png";
        avatar.appendChild(img);
    }
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = content;
    if (type === "bot") {
        msg.appendChild(avatar);
        msg.appendChild(bubble);
    } else {
        msg.appendChild(bubble);
        msg.appendChild(avatar);
    }
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ✅ 소수 판별
function isPrime(num) {
    if (num < 2) return false;
    for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) return false;
    }
    return true;
}

// ✅ 합성수 판별
function isComposite(num) {
    return num > 1 && !isPrime(num);
}

// ✅ 입력 메시지 범위 파싱
function parseTargetRange(text) {
    // 1. 숫자 범위만 따로 추출
    const rangeText = text.match(/(\d+)(회차)?\s*[\~\-]\s*(\d+)(회차)?/);
    const fromToText = text.match(/(\d+)부터\s*(\d+)까지/);
    const prevMatch = text.match(/(\d+)회차전/);
    const onlyNumber = text.match(/^(\d+)$/);

    if (text.includes("최신")) return { type: "single", round: latestRound };
    if (fromToText) return { type: "range", start: parseInt(fromToText[1]), end: parseInt(fromToText[2]) };
    if (rangeText) return { type: "range", start: parseInt(rangeText[1]), end: parseInt(rangeText[3]) };
    if (prevMatch) return { type: "range", start: latestRound - parseInt(prevMatch[1]) + 1, end: latestRound };
    if (text.includes("전회차")) return { type: "range", start: 1, end: latestRound };
    if (text.includes("지난") || text.includes("최근")) return { type: "range", start: Math.max(1, latestRound - 9), end: latestRound };
    if (onlyNumber) return { type: "single", round: parseInt(onlyNumber[1]) };

    return null;
}



// ✅ 추가 정보 파싱 (예: 7번출현, 3배수, 5분법)
function parseExtraInfo(text) {
    const numberMatch = text.match(/(\d{1,2})번/);
    const multipleMatch = text.match(/(\d+)배수/);
    const nDivMatch = text.match(/(\d+)분법/);
    const nUnitMatch = text.match(/(\d+)단위/);

    return {
        specificNumber: numberMatch ? parseInt(numberMatch[1]) : null,
        multipleOf: multipleMatch ? parseInt(multipleMatch[1]) : null,
        nDivide: nDivMatch ? parseInt(nDivMatch[1]) : null,
        nUnit: nUnitMatch ? parseInt(nUnitMatch[1]) : null
    };
}

// ✅ 분석 테이블 생성 (출현/배수/소수/합성수)
function generateAnalysisTable(start, end, options = {}) {
    const { specificNumber, multipleOf } = options;
    const headers = ['회차'];
    if (specificNumber !== undefined) headers.push('출현횟수');
    if (multipleOf !== undefined) headers.push(`${multipleOf}배수`);
    headers.push('소수', '합성수');

    const bodyData = [];
    let totalSpecific = 0, totalMultiple = 0, totalPrime = 0, totalComposite = 0;

    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;

        let specific = 0, multiple = 0, prime = 0, composite = 0;
        numbers.slice(0, 6).forEach(num => {
            if (specificNumber !== undefined && num === specificNumber) specific++;
            if (isPrime(num)) prime++;
            if (isComposite(num)) composite++;
            if (multipleOf !== undefined && num % multipleOf === 0) multiple++;
        });

        if (specific > 0 || multiple > 0 || prime > 0 || composite > 0) {
            const row = [`${r}`];
            if (specificNumber !== undefined) row.push(specific);
            if (multipleOf !== undefined) row.push(multiple);
            row.push(prime, composite);
            bodyData.push(row);

            totalSpecific += specific;
            totalMultiple += multiple;
            totalPrime += prime;
            totalComposite += composite;
        }
    }

    const footer = ['총합'];
    if (specificNumber !== undefined) footer.push(totalSpecific);
    if (multipleOf !== undefined) footer.push(totalMultiple);
    footer.push(totalPrime, totalComposite);

    return generateTable(headers, bodyData, footer);
}

// ✅ 범용 테이블 생성
function generateTable(headers, bodyData, footerData = null) {
    let tableHTML = `<table style="width:100%; border-collapse:collapse; margin-top:10px;">
      <thead>
        <tr style="background:#f0f2f5;">
          ${headers.map(header => `<th style="border:1px solid #ccc; padding:8px;">${header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${bodyData.map(row => `
          <tr>
            ${row.map(cell => `<td style="border:1px solid #ccc; padding:8px; text-align:center;">${cell}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
      ${footerData ? `
      <tfoot>
        <tr style="background:#f0f2f5;">
          ${footerData.map(cell => `<td style="border:1px solid #ccc; padding:8px; font-weight:bold;">${cell}</td>`).join('')}
        </tr>
      </tfoot>
      ` : ''}
    </table>`;
    return tableHTML;
}

// ✅ 총합 분석 핸들러 (테이블 출력)
function handleTotalSum(targetInfo) {
    let start = 1, end = latestRound;
    if (targetInfo.type === "single") start = end = targetInfo.round;
    if (targetInfo.type === "range" || targetInfo.type === "all") {
        start = targetInfo.start;
        end = targetInfo.end;
    }
    if (targetInfo.type === "latest") {
        end = latestRound;
        start = Math.max(1, latestRound - 9);
    }

    const headers = ['회차', '총합'];
    const bodyData = [];

    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;
        const sum = numbers.slice(0, 6).reduce((acc, num) => acc + num, 0);
        bodyData.push([`${r}`, sum]);
    }

    const tableHTML = generateTable(headers, bodyData);

    appendMessage(`🧮 총합 분석 (${start}회차 ~ ${end}회차 기준):<br><br>${tableHTML}`, "bot");
}



function handleHotColdNumbers(targetInfo, type) {
    let round = latestRound;

    if (targetInfo.type === "single") {
        round = targetInfo.round;
    } else if (targetInfo.type === "range") {
        appendMessage("❌ 핫넘버/콜드넘버는 단일 회차만 입력해야 합니다! (예: 1100 핫넘버)", "bot");
        return;
    }

    if (!round || isNaN(round)) {
        appendMessage(`❌ 유효하지 않은 회차입니다. 회차를 다시 입력해주세요.`, "bot");
        return;
    }


    const countMap = {};
    Object.entries(lottoData)
        .filter(([r]) => r <= round && r > round - 5)  // 최근 5회
        .forEach(([r, numbers]) => {
            numbers.slice(0, 6).forEach(num => {
                countMap[num] = (countMap[num] || 0) + 1;
            });
        });

    const sorted = Object.keys(countMap).map(Number).sort((a, b) => countMap[b] - countMap[a]);
    const selected = type === "hot" ? sorted.slice(0, 6) : sorted.slice(-6);

    const headers = ['번호', '출현 수'];
    const bodyData = selected.map(num => [num, countMap[num]]);

    const label = type === "hot" ? "🔥 핫넘버" : "❄️ 콜드넘버";
    const tableHTML = generateTable(headers, bodyData);

    const from = Math.max(1, round - 4);
    appendMessage(`${label} (${from}회차 ~ ${round}회차 기준):<br><br>${tableHTML}`, "bot");

}




// ✅ n분법 테이블 핸들러
function handleNDividedTable(targetInfo, n) {
    let start = 1, end = latestRound;
    if (targetInfo.type === "single") start = end = targetInfo.round;
    if (targetInfo.type === "range" || targetInfo.type === "all") { start = targetInfo.start; end = targetInfo.end; }
    if (targetInfo.type === "latest") { end = latestRound; start = Math.max(1, latestRound - 9); }

    const counts = Array(n).fill(0);

    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;
        numbers.slice(0, 6).forEach(num => {
            const group = Math.floor((num - 1) / (45 / n));
            counts[group]++;
        });
    }

    const headers = ['구간', '출현 수'];
    const bodyData = counts.map((count, i) => {
        const min = Math.floor((45 / n) * i) + 1;
        const max = Math.min(45, Math.floor((45 / n) * (i + 1)));
        return [`${min}~${max}`, count];
    });

    const tableHTML = generateTable(headers, bodyData);

    appendMessage(`📊 ${n}분법 구간 출현 분석 (${start}회차 ~ ${end}회차 기준):<br><br>${tableHTML}`, "bot");
}

// ✅ n단위 분석 테이블 함수 (5단위, 7단위, 10단위 등 자유롭게)
function handleNUnitTable(targetInfo, n) {
    let start = 1, end = latestRound;
    if (targetInfo.type === "single") start = end = targetInfo.round;
    if (targetInfo.type === "range" || targetInfo.type === "all") {
        start = targetInfo.start;
        end = targetInfo.end;
    }
    if (targetInfo.type === "latest") {
        end = latestRound;
        start = Math.max(1, latestRound - 9);
    }

    const counts = Array(Math.ceil(46 / n)).fill(0);

    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;
        numbers.slice(0, 6).forEach(num => {
            const group = Math.floor(num / n);
            counts[group]++;
        });
    }

    const headers = ['구간', '출현 수'];
    const bodyData = counts.map((count, i) => {
        const min = i * n;
        const max = Math.min(45, (i + 1) * n - 1);
        return [`${min}~${max}`, count];
    });

    const tableHTML = generateTable(headers, bodyData);

    appendMessage(`📊 ${n}단위 구간 출현 분석 (${start}회차 ~ ${end}회차 기준):<br><br>${tableHTML}`, "bot");
}


// ✅ 홀짝 분석 테이블 함수
function handleOddEven(targetInfo) {
    let start = 1, end = latestRound;
    if (targetInfo.type === "single") start = end = targetInfo.round;
    if (targetInfo.type === "range" || targetInfo.type === "all") { start = targetInfo.start; end = targetInfo.end; }
    if (targetInfo.type === "latest") { end = latestRound; start = Math.max(1, latestRound - 9); }

    const bodyData = [];

    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;

        let odd = 0, even = 0;
        numbers.slice(0, 6).forEach(num => {
            if (num % 2 === 0) even++;
            else odd++;
        });

        bodyData.push([`${r}`, odd, even]);
    }

    const headers = ['회차', '홀수 개수', '짝수 개수'];
    const tableHTML = generateTable(headers, bodyData);

    appendMessage(`⚖️ 홀짝 분석 (${start}회차 ~ ${end}회차 기준):<br><br>${tableHTML}`, "bot");
}

// ✅ 저고 분석 테이블 함수
function handleLowHigh(targetInfo) {
    let start = 1, end = latestRound;
    if (targetInfo.type === "single") start = end = targetInfo.round;
    if (targetInfo.type === "range" || targetInfo.type === "all") { start = targetInfo.start; end = targetInfo.end; }
    if (targetInfo.type === "latest") { end = latestRound; start = Math.max(1, latestRound - 9); }

    const bodyData = [];

    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;

        let low = 0, high = 0;
        numbers.slice(0, 6).forEach(num => {
            if (num <= 22) low++;
            else high++;
        });

        bodyData.push([`${r}`, low, high]);
    }

    const headers = ['회차', '저수 개수', '고수 개수'];
    const tableHTML = generateTable(headers, bodyData);

    appendMessage(`🌄 저고 분석 (${start}회차 ~ ${end}회차 기준):<br><br>${tableHTML}`, "bot");
}

// ✅ 끝수 분석 테이블 함수
function handleLastDigit(targetInfo) {
    let start = 1, end = latestRound;
    if (targetInfo.type === "single") start = end = targetInfo.round;
    if (targetInfo.type === "range" || targetInfo.type === "all") { start = targetInfo.start; end = targetInfo.end; }
    if (targetInfo.type === "latest") { end = latestRound; start = Math.max(1, latestRound - 9); }

    const counts = Array(10).fill(0);

    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;

        numbers.slice(0, 6).forEach(num => {
            const lastDigit = num % 10;
            counts[lastDigit]++;
        });
    }

    const headers = ['끝수', '출현 수'];
    const bodyData = counts.map((count, i) => [`${i}`, count]);

    const tableHTML = generateTable(headers, bodyData);

    appendMessage(`🔢 끝수 분석 (${start}회차 ~ ${end}회차 기준):<br><br>${tableHTML}`, "bot");
}

function handleAnalysis(type, targetInfo, extraInfo = {}) {
    if (type.includes("핫넘버")) return handleHotColdNumbers(targetInfo, "hot");
    if (type.includes("콜드넘버")) return handleHotColdNumbers(targetInfo, "cold");
    if (type.includes("단위")) return handleNUnitTable(targetInfo, extraInfo.nUnit || 10);
    if (type.includes("총합")) return handleTotalSum(targetInfo);
    if (type.includes("홀짝")) return handleOddEven(targetInfo);
    if (type.includes("저고")) return handleLowHigh(targetInfo);
    if (type.includes("끝수")) return handleLastDigit(targetInfo);
    if (type.includes("분법")) return handleNDividedTable(targetInfo, extraInfo.nDivide || 5);
    if (type.includes("출현") || type.includes("배수") || type.includes("소수") || type.includes("합성수"))
        return handleNumberAnalysisTable(targetInfo, type, extraInfo);
}


// ✅ 번호 출현 분석
function handleNumberAnalysisTable(targetInfo, text) {
    let start = 1, end = latestRound;
    if (targetInfo.type === "single") start = end = targetInfo.round;
    if (targetInfo.type === "range" || targetInfo.type === "all") { start = targetInfo.start; end = targetInfo.end; }
    if (targetInfo.type === "latest") { end = latestRound; start = Math.max(1, latestRound - 9); }

    const numberMatch = text.match(/(\d{1,2})번/);
    const multipleMatch = text.match(/(\d+)배수/);

    const specificNumber = numberMatch ? parseInt(numberMatch[1]) : undefined;
    const multipleOf = multipleMatch ? parseInt(multipleMatch[1]) : undefined;

    const tableHTML = generateAnalysisTable(start, end, { specificNumber, multipleOf });

    appendMessage(tableHTML, "bot");
}

// ✅ 메인 메시지 핸들러
function sendMessage() {
    const input = document.getElementById("userInput");
    const text = input.value.trim();
    if (!text) {
        appendMessage("❗ 궁금한 내용을 입력해주세요!", "bot");
        return;
    }

    appendMessage(text, "user");
    input.value = "";

    questionCount++;
    if (questionCount >= 3 || text.includes("추천")) {
        chatInput.style.display = "none";
        landingButton.classList.add("show");
    }

    setTimeout(() => {
        const msg = text.toLowerCase();

        const targetInfo = parseTargetRange(msg);
        const extraInfo = parseExtraInfo(msg);

        // 분석 대기 중이면 추가정보 받기
        if (waitingAnalysisType) {
            if (!targetInfo) {
                appendMessage("❌ 회차 또는 범위를 정확히 입력해주세요!<br>(예: 1100, 최신, 1000~1050)", "bot");
                return;
            }
        
            // 🔥 핫넘버 또는 콜드넘버일 경우 start~end 메시지 출력 생략
            if (waitingAnalysisType.includes("핫넘버") || waitingAnalysisType.includes("콜드넘버")) {
                handleAnalysis(waitingAnalysisType, targetInfo, waitingExtraInfo);
            } else {
                appendMessage(`✅ ${targetInfo.start}회차 ~ ${targetInfo.end}회차 분석을 시작합니다!`, "bot");
                handleAnalysis(waitingAnalysisType, targetInfo, waitingExtraInfo);
            }
        
            waitingAnalysisType = null;
            waitingExtraInfo = null;
            return;
        }
        

        // 키워드 감지
        // ✅ sendMessage() 안, 키워드 감지 for문 수정
        for (const word of msg.split(/\s+/).reverse()) {
            if (!keywords || Object.keys(keywords).length === 0) {
                appendMessage("❗ 키워드 데이터가 아직 로드되지 않았습니다. 기본 분석만 가능합니다.", "bot");
            }

            for (const key in keywords) {
                if (key.includes(word) || word.includes(key)) {

                    if (key.includes("핫") || key.includes("콜드")) {
                        if (!targetInfo?.round) {
                            appendMessage(`🔥 ${key} 분석을 시작합니다! 회차를 입력해주세요. (예: 1111 또는 최신)`, "bot");
                            waitingAnalysisType = key;
                            waitingExtraInfo = extraInfo;
                        } else {
                            handleHotColdNumbers({ type: "single", round: targetInfo.round }, key.includes("핫") ? "hot" : "cold");
                        }
                        return;
                    }


                    // 🔵 나머지 키워드는 기존처럼 "구간" 받기
                    if (!targetInfo) {
                        appendMessage(`${keywords[key]}<br><br>구간을 입력해주세요!<br>(예: 1000~1050, 지난)`, "bot");
                        waitingAnalysisType = key;
                        waitingExtraInfo = extraInfo;
                        return;
                    }
                    // 🔵 나머지는 start ~ end 정상 출력
                    appendMessage(`✅ ${targetInfo.start}회차 ~ ${targetInfo.end}회차 분석을 시작합니다!`, "bot");
                    handleAnalysis(key, targetInfo, extraInfo);
                    return;
                }
            }
        }



        // n분법 별도 감지
        if (extraInfo.nDivide) {
            if (!targetInfo) {
                appendMessage(`'${extraInfo.nDivide}분법' 분석을 시작합니다!<br>구간을 입력해주세요!`, "bot");
                waitingAnalysisType = `${extraInfo.nDivide}분법`;
                waitingExtraInfo = extraInfo;
                return;
            }
            appendMessage(`✅ ${targetInfo.start}회차 ~ ${targetInfo.end}회차 분석을 시작합니다!`, "bot");
            handleAnalysis(`${extraInfo.nDivide}분법`, targetInfo, extraInfo);
            return;
        }

        // ✅ 핫넘버, 콜드넘버에서 "최신" 키워드 따로 감지
        if (waitingAnalysisType && (waitingAnalysisType.includes("핫넘버") || waitingAnalysisType.includes("콜드넘버"))) {
            if (msg.includes("최신")) {
                appendMessage(`✅ 최신 회차는 ${latestRound}회차입니다! 분석을 시작합니다.`, "bot");
                handleAnalysis(waitingAnalysisType, { type: "single", round: latestRound }, waitingExtraInfo);
                waitingAnalysisType = null;
                waitingExtraInfo = null;
                return;
            }
        }




        appendMessage(
  `궁금한 내용을 입력해보세요!<br><br>
  ✅ 예시 질문:<br>
  🔹 회차 기반: <b>'1234회차 총합'</b>, <b>'1100 핫넘버'</b>, <b>'최신 콜드넘버'</b><br>
  🔹 패턴 분석: <b>'3배수 포함'</b>, <b>'7단위 분석'</b>, <b>'5분법 패턴'</b>, <b>'홀짝비율'</b><br>
  🔹 구간 분석: <b>'1000~1050 끝수 분석'</b>, <b>'최근 회차 저고 분석'</b><br>
  🔹 기본 정보: <b>'당첨 확률'</b>, <b>'자동과 수동 차이'</b>, <b>'세금은 얼마?'</b><br>
  🔹 기타: <b>'연금복권 정보'</b>, <b>'역대 최대 당첨금'</b>, <b>'낙수 분석'</b><br>`,
  "bot"
);

    }, 400);
}
