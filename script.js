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
    const clean = text.trim();

    // “1234회차” 단일 회차
    const singleRc = clean.match(/^(\d+)(?:회차)$/);
    if (singleRc) {
        const r = parseInt(singleRc[1]);
        if (r >= 1 && r <= latestRound) return { type: "single", round: r };
        else return null;
    }

    // 1) 단일 회차 키워드 (더 긴 표현부터 순서대로)
    if (clean.includes("최신")) {
        return { type: "single", round: latestRound };
    }
    if (clean.includes("지지지난") || clean.includes("저저저번")) {
        const r = Math.max(1, latestRound - 3);
        return { type: "single", round: r };
    } else if (clean.includes("지지난") || clean.includes("저저번")) {
        const r = Math.max(1, latestRound - 2);
        return { type: "single", round: r };
    } else if (clean.includes("지난") || clean.includes("저번")) {
        const r = Math.max(1, latestRound - 1);
        return { type: "single", round: r };
    } else if (clean.includes("최근")) {
        return { type: "range", start: Math.max(1, latestRound - 9), end: latestRound };
    }

    // 2) 숫자 범위 ("부터...까지" / "123~456")
    const fromToText = clean.match(/(\d+)부터(\d+)까지/);
    if (fromToText) {
        const start = parseInt(fromToText[1]), end = parseInt(fromToText[2]);
        if (start > end) {
            appendMessage("❗ 시작 회차가 끝 회차보다 클 수 없습니다.<br>예: 1000부터 1100까지 (O), 1100부터 1000까지 (X)", "bot");
            return null;
        }
        return {
            type: "range",
            start: Math.max(1, start),
            end: Math.min(latestRound, end)
        };
    }
    const rangeText = clean.match(/(\d+)(?:회차)?[-~](\d+)(?:회차)?/);
    if (rangeText) {
        const start = parseInt(rangeText[1]), end = parseInt(rangeText[2]);
        if (start > end) {
            appendMessage("❗ 시작 회차가 끝 회차보다 클 수 없습니다.<br>예: 1000부터 1100까지 (O), 1100부터 1000까지 (X)", "bot");
            return null;
        }
        return {
            type: "range",
            start: Math.max(1, start),
            end: Math.min(latestRound, end)
        };
    }

    // 3) “n회차전” 방식
    const prevMatch = clean.match(/(\d+)회차전/);
    if (prevMatch) {
        const n = parseInt(prevMatch[1]);
        return { type: "range", start: Math.max(1, latestRound - n + 1), end: latestRound };
    }

    // 4) 전체 회차
    if (clean.includes("전회차")) {
        return { type: "range", start: 1, end: latestRound };
    }

    // 5) 단일 숫자
    const onlyNumber = clean.match(/^(\d+)$/);
    if (onlyNumber) {
        const r = parseInt(onlyNumber[1]);
        if (r < 1 || r > latestRound) return null;
        return { type: "single", round: r };
    }

    return null;
}




// ✅ 추가 정보 파싱 (예: 7번출현, 3배수, 5분법)
function parseExtraInfo(text) {
    const numberMatch = text.match(/(\d{1,2})번/);
    const numberMatchAlt = text.match(/(\d{1,2})출현/);
    const multipleMatch = text.match(/(\d+)배수/);
    const nDivMatch = text.match(/(\d+)분법/);
    const nUnitMatch = text.match(/(\d+)단위/);

    return {
        specificNumber: numberMatch ? parseInt(numberMatch[1]) : numberMatchAlt ? parseInt(numberMatchAlt[1]) : null,
        multipleOf: multipleMatch ? parseInt(multipleMatch[1]) : null,
        nDivide: nDivMatch ? parseInt(nDivMatch[1]) : null,
        nUnit: nUnitMatch ? parseInt(nUnitMatch[1]) : null
    };
}

// ✅ 분석 테이블 생성 (출현/배수/소수/합성수)
function generateAnalysisTable(start, end, options = {}) {
    const {
        specificNumber = null,
        multipleOf = null,
        includePrime = false,   // 기본 false
        includeComposite = false
    } = options;

    // 1) 헤더
    const headers = ['회차'];
    if (specificNumber != null) headers.push('출현횟수');
    if (multipleOf != null) headers.push(`${multipleOf}배수`);
    if (includePrime) headers.push('소수');
    if (includeComposite) headers.push('합성수');

    // 2) 바디
    const bodyData = [];
    let totalSpecific = 0, totalMultiple = 0, totalPrime = 0, totalComposite = 0;
    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;

        let specific = 0, multiple = 0, prime = 0, composite = 0;
        numbers.slice(0, 6).forEach(n => {
            if (specificNumber != null && n === specificNumber) specific++;
            if (multipleOf != null && n % multipleOf === 0) multiple++;
            if (includePrime && isPrime(n)) prime++;
            if (includeComposite && isComposite(n)) composite++;
        });

        // 해당 컬럼 중 하나라도 1개 이상이면 출력
        if (specific || multiple || prime || composite) {
            const row = [`${r}`];
            if (specificNumber != null) row.push(specific);
            if (multipleOf != null) row.push(multiple);
            if (includePrime) row.push(prime);
            if (includeComposite) row.push(composite);
            bodyData.push(row);

            totalSpecific += specific;
            totalMultiple += multiple;
            totalPrime += prime;
            totalComposite += composite;
        }
    }

    // 3) 푸터
    const footer = ['총합'];
    if (specificNumber != null) footer.push(totalSpecific);
    if (multipleOf != null) footer.push(totalMultiple);
    if (includePrime) footer.push(totalPrime);
    if (includeComposite) footer.push(totalComposite);

    return generateTable(headers, bodyData, footer);
}

// ✅ 낙수 분석 테이블 함수
function handleDropNumber(targetInfo) {
    let start = 1, end = latestRound;
    if (targetInfo.type === "single") start = end = targetInfo.round;
    if (targetInfo.type === "range" || targetInfo.type === "all") {
        start = targetInfo.start;
        end = targetInfo.end;
    }
    if (targetInfo.type === "latest") {
        end = latestRound;
        start = Math.max(2, latestRound - 9); // 1회차는 낙수 비교 불가
    }

    const bodyData = [];

    for (let r = start; r <= end; r++) {
        const current = lottoData[r];
        const previous = lottoData[r - 1];

        if (!current || !previous) continue;

        const curNums = current.slice(0, 6);
        const prevNums = previous.slice(0, 6);
        const repeated = curNums.filter(n => prevNums.includes(n));

        bodyData.push([`${r}`, repeated.length, repeated.join(", ") || "-"]);
    }

    const headers = ['회차', '낙수 개수', '낙수 번호'];
    const tableHTML = generateTable(headers, bodyData);

    appendMessage(`🔁 낙수 분석 (${start}회차 ~ ${end}회차 기준):<br><br>${tableHTML}`, "bot");
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
        appendMessage(
            `❌ '핫넘버/콜드넘버'는 단일 회차만 지원합니다.<br>` +
            `예: '1100 핫넘버', '최신 콜드넘버'<br>` +
            `현재 최신 회차: ${latestRound}회차`,
            "bot"
        );
        return;
    }

    if (!round || isNaN(round) || round < 1 || round > latestRound) {
        appendMessage(
            `❌ 잘못된 회차입니다. 1부터 ${latestRound} 사이의 숫자로 입력해주세요.<br>` +
            `예: '1100 핫넘버', '최신 콜드넘버'`,
            "bot"
        );
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

// ✅ 연속수 분석 테이블 함수
function handleConsecutiveNumbers(targetInfo) {
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

    const bodyData = [];

    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;

        const sorted = numbers.slice(0, 6).sort((a, b) => a - b);
        const groups = [];
        let group = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === sorted[i - 1] + 1) {
                group.push(sorted[i]);
            } else {
                if (group.length >= 2) groups.push([...group]);
                group = [sorted[i]];
            }
        }
        if (group.length >= 2) groups.push([...group]);

        const flatGroup = groups.map(g => g.join(",")).join(" / ") || "-";
        bodyData.push([`${r}`, groups.length, flatGroup]);
    }

    const headers = ['회차', '연속수 그룹 수', '연속수 번호 그룹'];
    const tableHTML = generateTable(headers, bodyData);

    appendMessage(`📏 연속수 분석 (${start}회차 ~ ${end}회차 기준):<br><br>${tableHTML}`, "bot");
}
// ✅ 제곱수 분석 함수
function handleSquareNumbers(targetInfo) {
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

    const squareNumbers = [1, 4, 9, 16, 25, 36];

    const headers = ['회차', '제곱수 개수', '제곱수 번호'];
    const bodyData = [];
    let totalCount = 0;

    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;

        const matched = numbers.slice(0, 6).filter(n => squareNumbers.includes(n));
        totalCount += matched.length;

        bodyData.push([`${r}`, matched.length, matched.join(", ") || "-"]);
    }

    const footer = ['총합', totalCount, '-'];
    const tableHTML = generateTable(headers, bodyData, footer);

    appendMessage(`🟩 제곱수 분석 (${start}회차 ~ ${end}회차 기준):<br><br>${tableHTML}`, "bot");
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

// ✅ 삼각수 분석 함수
function handleTriangularNumbers(targetInfo) {
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

    // 삼각수 리스트 (1~45 범위)
    const triangularNumbers = [1, 3, 6, 10, 15, 21, 28, 36, 45];

    const headers = ['회차', '삼각수 개수', '삼각수 번호'];
    const bodyData = [];
    let totalCount = 0;

    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;

        const matched = numbers.slice(0, 6).filter(n => triangularNumbers.includes(n));
        totalCount += matched.length;

        bodyData.push([`${r}`, matched.length, matched.join(", ") || "-"]);
    }

    const footer = ['총합', totalCount, '-'];
    const tableHTML = generateTable(headers, bodyData, footer);

    appendMessage(`🔺 삼각수 분석 (${start}회차 ~ ${end}회차 기준):<br><br>${tableHTML}`, "bot");
}

// ✅ 궁(弓) 분석 테이블 함수 (1~45 번호를 5행 기준으로 나눔)
function handleGungPattern(targetInfo) {
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

    const rowRanges = [
        [1, 9],    // 1행 (앞궁)
        [10, 18],  // 2행 (앞궁)
        [19, 27],  // 3행 (중궁)
        [28, 36],  // 4행 (중궁)
        [37, 45]   // 5행 (뒷궁)
    ];

    const headers = ['회차', '1행 (1~9)', '2행 (10~18)', '3행 (19~27)', '4행 (28~36)', '5행 (37~45)'];
    const bodyData = [];
    const totalCounts = [0, 0, 0, 0, 0];

    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;

        const rowCount = [0, 0, 0, 0, 0];

        numbers.slice(0, 6).forEach(num => {
            for (let i = 0; i < rowRanges.length; i++) {
                const [min, max] = rowRanges[i];
                if (num >= min && num <= max) {
                    rowCount[i]++;
                    totalCounts[i]++;
                    break;
                }
            }
        });

        bodyData.push([`${r}`, ...rowCount]);
    }

    const footer = [
        '총합',
        ...totalCounts
    ];

    const tableHTML = generateTable(headers, bodyData, footer);

    const sumFront = totalCounts[0] + totalCounts[1];
    const sumMiddle = totalCounts[2] + totalCounts[3];
    const sumBack = totalCounts[4];
    const total = sumFront + sumMiddle + sumBack;

    const summary = `
    ✅ 구간 요약:
    • 앞궁(1~18): <b>${sumFront}</b>회
    • 중궁(19~36): <b>${sumMiddle}</b>회
    • 뒷궁(37~45): <b>${sumBack}</b>회<br>
    • 총 출현 수: <b>${total}</b>개
    `;

    appendMessage(`🏹 궁(弓) 분석 (${start}회차 ~ ${end}회차 기준):<br><br>${tableHTML}<br><br>${summary}`, "bot");
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

// ✅ 번호 간 간격(Gap) 분석 함수
function handleGapAnalysis(targetInfo) {
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

    const headers = ['회차', '간격1', '간격2', '간격3', '간격4', '간격5', '평균 간격'];
    const bodyData = [];

    for (let r = start; r <= end; r++) {
        const numbers = lottoData[r];
        if (!numbers) continue;

        const sorted = numbers.slice(0, 6).sort((a, b) => a - b);
        const gaps = [];
        for (let i = 0; i < sorted.length - 1; i++) {
            gaps.push(sorted[i + 1] - sorted[i]);
        }

        const avg = (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2);
        bodyData.push([`${r}`, ...gaps, avg]);
    }

    const tableHTML = generateTable(headers, bodyData);
    appendMessage(`📐 번호 간 간격 분석 (${start}회차 ~ ${end}회차 기준):<br><br>${tableHTML}`, "bot");
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
    if (type.includes("제곱")) return handleSquareNumbers(targetInfo);
    if (type.includes("콜드넘버")) return handleHotColdNumbers(targetInfo, "cold");
    if (type.includes("낙수")) return handleDropNumber(targetInfo);
    if (type.includes("궁")) return handleGungPattern(targetInfo);
    if (type.includes("간격")) return handleGapAnalysis(targetInfo);
    if (type.includes("삼각")) return handleTriangularNumbers(targetInfo);
    if (type.includes("연속")) return handleConsecutiveNumbers(targetInfo);
    if (type.includes("단위")) return handleNUnitTable(targetInfo, extraInfo.nUnit || 10);
    if (type.includes("총합")) return handleTotalSum(targetInfo);
    if (type.includes("홀짝")) return handleOddEven(targetInfo);
    if (type.includes("저고")) return handleLowHigh(targetInfo);
    if (type.includes("끝수")) return handleLastDigit(targetInfo);
    if (type.includes("분법")) return handleNDividedTable(targetInfo, extraInfo.nDivide || 5);
    if (type.includes("출현") || type.includes("배수") || type.includes("소수") || type.includes("합성수"))
        return handleNumberAnalysisTable(targetInfo, type, extraInfo);
}


// ✅ 번호 출현 / 배수 / 소수 / 합성수 분석 핸들러
function handleNumberAnalysisTable(targetInfo, type, extraInfo = {}) {
    // 1) start/end 계산 (기존과 동일)
    let start = 1, end = latestRound;
    if (targetInfo.type === "single") {
        start = end = targetInfo.round;
    } else if (targetInfo.type === "range" || targetInfo.type === "all") {
        start = targetInfo.start;
        end = targetInfo.end;
    } else if (targetInfo.type === "latest") {
        end = latestRound;
        start = Math.max(1, latestRound - 9);
    }
    // 2) 어떤 분석만 할지 플래그 결정
    // 2) 어떤 컬럼을 보여줄지 결정
    const onlySpecific = extraInfo.specificNumber != null;
    const onlyMultiple = extraInfo.multipleOf != null;
    const primeRequest = type.includes("소수");
    const compositeRequest = type.includes("합성수");

    // 3) “출현”만 단독으로 요청된 경우 안내
    if ((type === "출현" || type.includes("배수") || type.includes("소수") || type.includes("합성수"))
        && !onlySpecific && !onlyMultiple) {
        appendMessage(
            "❗ 숫자를 명시해주세요.<br>" +
            "예: '3출현', '5배수 분석', '7번 출현', '소수 분석' 등",
            "bot"
        );
        return;
    }

    // '소수' 또는 '합성수' 중 하나만 있어도 둘 다 보여준다
    const includePrime = primeRequest;
    const includeComposite = compositeRequest;
    const specificNumber = onlySpecific ? extraInfo.specificNumber : null;
    const multipleOf = onlyMultiple ? extraInfo.multipleOf : null;

    const tableHTML = generateAnalysisTable(start, end, { specificNumber, multipleOf, includePrime, includeComposite });

    appendMessage(tableHTML, "bot");
}




// ✅ 메인 메시지 핸들러
function sendMessage() {
    const input = document.getElementById("userInput");
    const text = input.value.trim();
    if (!text) {
        appendMessage(
            "❗ 입력이 비어 있습니다. 예시를 참고하세요:<br>" +
            "• '핫넘버'<br>" +
            "• '1000~1050 총합'<br>" +
            "• '1100 회차 핫넘버'<br>" +
            "• '최신 콜드넘버'",
            "bot"
        );
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
                appendMessage(
                    "❌ 유효한 회차나 범위를 인식하지 못했습니다.<br>" +
                    "입력 예시:<br>" +
                    "• 단일 회차: '1100'<br>" +
                    "• 최신 회차: '최신'<br>" +
                    "• 범위: '1000~1050', '1000부터 1050까지'",
                    "bot"
                );
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
                appendMessage(
                    "❗ 키워드 데이터를 불러오는 중입니다...<br>" +
                    "잠시 후 다시 시도하시거나 페이지를 새로고침해주세요.",
                    "bot"
                );
            }

            for (const key in keywords) {
                if (key.includes(word) || word.includes(key)) {

                    if (key.includes("핫") || key.includes("콜드")) {
                        if (!targetInfo?.round) {
                            appendMessage(
                                `🔥 <strong>${key} 분석</strong>을 시작합니다!<br><br>` +
                                `분석할 <strong class="highlight">회차</strong>를 입력해주세요.<br>` +
                                `예시: '1100', '1234회차', '최신'<br>` +
                                `현재 최신 회차는 <strong>${latestRound}회차</strong>입니다.`,
                                "bot"
                            );

                            waitingAnalysisType = key;
                            waitingExtraInfo = extraInfo;
                        } else {
                            handleHotColdNumbers({ type: "single", round: targetInfo.round }, key.includes("핫") ? "hot" : "cold");
                        }
                        return;
                    }
                    // 키워드가 출현/배수/소수/합성수든, 핫/콜드든, 나머지 옵션이든
                    // 전부 handleAnalysis() 하나로 위임합니다.
                    if (!targetInfo) {
                        let guidance = `분석할 <strong class="highlight">회차 또는 범위</strong>를 입력해주세요.<br><br>` +
                            `예시:<br>` +
                            `• '1100'<br>` +
                            `• '1234회차'<br>` +
                            `• '1000~1050'<br>` +
                            `• '전회차'<br>` +
                            `• '최신' (현재 최신 회차: <strong>${latestRound}회차</strong>)`;

                        if (key.includes("핫") || key.includes("콜드")) {
                            guidance = `회차를 지정해주세요!<br>(예: 1100, 최신)`;
                        } else if (key.includes("총합") || key.includes("제곱수") || key.includes("삼각수")) {
                            guidance = `분석 범위를 지정해주세요!<br>(예: 1000~1050, 전회차 등)`;
                        }
                        appendMessage(`${keywords[key] || '분석'}<br><br>${guidance}`, "bot");
                        waitingAnalysisType = key;
                        waitingExtraInfo = extraInfo;
                        return;
                    }

                    // 단일 회차(핫/콜드)인지, 구간 분석인지 메시지 분기
                    if (key.includes("핫넘버") || key.includes("콜드넘버")) {
                        appendMessage(`✅ ${targetInfo.round || latestRound}회차 기준 최근 5주간 ${key} 분석을 시작합니다!`, "bot");
                    } else {
                        appendMessage(`✅ ${targetInfo.start}회차 ~ ${targetInfo.end}회차 분석을 시작합니다!`, "bot");
                    }

                    // 모든 분석은 이 함수 한 번 호출로 해결
                    handleAnalysis(key, targetInfo, extraInfo);
                    return;

                }
            }
        }



        // n분법 별도 감지
        if (extraInfo.nDivide) {
            if (!targetInfo) {
                appendMessage(
                    `📊 <strong>${extraInfo.nDivide}분법 분석</strong>을 시작합니다!<br><br>` +
                    `분석할 <strong class="highlight">회차 구간</strong>을 입력해주세요.<br><br>` +
                    `예시:<br>` +
                    `• '1000부터 1050까지'<br>` +
                    `• '1100~1110'<br>` +
                    `• '전회차'<br>` +
                    `• '최신' (현재 최신 회차는 <strong>${latestRound}회차</strong>)`,
                    "bot"
                );
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



        if (text.includes("?") && !Object.keys(keywords).some(k => msg.includes(k))) {
            appendMessage(
                `❗ 죄송해요, 질문을 정확히 이해하지 못했어요.<br><br>` +
                `📝 아래와 같은 형식으로 질문해보세요:<br>` +
                `• '1234회차 총합 분석'<br>` +
                `• '최신 핫넘버 알려줘'<br>` +
                `• '5배수 포함 분석'<br>` +
                `• '소수 번호 출현'<br>` +
                `• '당첨 확률은?'<br>` +
                `• '세금 얼마나 떼요?'<br><br>` +
                `📌 <strong>질문에는 숫자나 분석 키워드를 함께 포함해 주세요!</strong>`,
                "bot"
              );
            return;
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
