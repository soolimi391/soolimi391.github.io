/* 개인회생 탕감 계산기 (MVP) - v9 Final (최종 완결판)
 * - 기존 기능 100% 포함 (DOM 생성 로직 전체 복구)
 * - 신규 기능 v9 적용:
 * 1. 면제재산 공제: 보증금/자가에서 4,000만원 일괄 공제 (소액 임차인 보호)
 * 2. 고액 채무 필터링: 총 채무 25억원 초과 시 '일반회생' 안내
 * 3. 소득 부족 시 '최대 탕감' 긍정 멘트 유지
 * 4. 기간별(36 vs 60개월) 변제금 차등 적용 유지
 */

const REGIONS = [
  "서울","경기 북부","경기 남부","인천","부산","대구","대전","광주","울산","세종","강원","충북","충남","전북","전남","경북","경남","제주",
  {label:"기타(직접입력)", value:"기타"}
];

const HOUSING = [
  { key:"무상거주", label:"무상거주", hint:"무상거주(부모님/지인 집 등)라면 0으로 처리합니다." },
  { key:"월세", label:"월세", hint:"월세 금액(만원)을 입력해주세요. (예: 60)" },
  { key:"전세", label:"전세", hint:"전세금(만원)을 입력해주세요. (예: 12000)" },
  { key:"자가", label:"자가", hint:"주택가(만원)을 입력해주세요. (예: 35000)" }
];

// ---------- DOM ----------
const stepArea = document.getElementById("stepArea");
const resultArea = document.getElementById("resultArea");
const barFill = document.getElementById("barFill");
const stepText = document.getElementById("stepText");

// 결과 화면 UI 요소
const kpiPeriod = document.getElementById("kpiPeriod");
const kpiMonthly = document.getElementById("kpiMonthly");
const kpiReliefAmt = document.getElementById("kpiReliefAmt");
const kpiReliefRate = document.getElementById("kpiReliefRate");
const resultNote = document.getElementById("resultNote");

const openLeadBtn = document.getElementById("openLeadBtn");
const restartBtn = document.getElementById("restartBtn");
const headerCallBtn = document.getElementById("headerCallBtn");

// 모달 관련
const modal = document.getElementById("modal");
const modalBg = document.getElementById("modalBg");
const closeModal = document.getElementById("closeModal");
const cancelLeadBtn = document.getElementById("cancelLeadBtn");
const submitLeadBtn = document.getElementById("submitLeadBtn");
const formMsg = document.getElementById("formMsg");

const nameEl = document.getElementById("name");
const phonePrefix = document.getElementById("phonePrefix");
const phoneRest = document.getElementById("phoneRest");

const amBtn = document.getElementById("amBtn");
const pmBtn = document.getElementById("pmBtn");
const hourSel = document.getElementById("hourSel");
const minSel = document.getElementById("minSel");

// ---------- state ----------
const state = {
  step: 1,
  ampm: "오전",
  result: null,
  answers: {
    region: "",
    debt_m: 0,
    income_m: 0,
    housing_type: "",
    housing_m: 0,
    household_total: 1, 
    depend_mode: ""
  }
};

// ---------- utils ----------
function digitsOnly(s){ return String(s||"").replace(/[^\d]/g,""); }
function clampInt(v, lo, hi){
  const n = parseInt(v, 10);
  if(!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
function button(text, onClick, cls="btn"){
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}
function title(t){
  const h = document.createElement("h2");
  h.className = "h2";
  h.textContent = t;
  return h;
}
function desc(t){
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = t;
  return p;
}
function fmtM(m){
  // null/undefined/NaN이면 숫자 대신 "-"로 표시 (0원 오해 방지용)
  if(m === null || m === undefined || Number.isNaN(m)) return "-";
  const n = Math.max(0, Math.round(Number(m)));
  return n.toLocaleString("ko-KR") + "만원";
}

function fmtPct(p){
  if(p === null || p === undefined || Number.isNaN(p)) return "-";
  return String(Math.round(Number(p))) + "%";
}


// ---------- inputs (DOM 생성 함수 전체 복구) ----------
function amountInput(placeholder, onSubmit){
  const wrap = document.createElement("div");
  wrap.className = "inputRow";

  const input = document.createElement("input");
  input.placeholder = placeholder;
  input.inputMode = "numeric";
  input.addEventListener("input", ()=>{ input.value = digitsOnly(input.value).slice(0, 7); });
  input.addEventListener("keydown", (e)=>{ if(e.key==="Enter"){ e.preventDefault(); ok(); } });

  const unit = document.createElement("div");
  unit.className = "unit";
  unit.textContent = "만원";

  const btn = button("다음", ok, "btn primary");

  function ok(){
    const n = clampInt(input.value, 0, 9999999);
    if(n <= 0){ alert("숫자를 입력해주세요."); return; }
    onSubmit(n);
  }

  wrap.append(input, unit, btn);
  return wrap;
}

function smallNumberInput(placeholder, unitText, onSubmit){
  const wrap = document.createElement("div");
  wrap.className = "inputRow";

  const input = document.createElement("input");
  input.placeholder = placeholder;
  input.inputMode = "numeric";
  input.addEventListener("input", ()=>{ input.value = digitsOnly(input.value).slice(0, 2); });
  input.addEventListener("keydown", (e)=>{ if(e.key==="Enter"){ e.preventDefault(); ok(); } });

  const unit = document.createElement("div");
  unit.className = "unit";
  unit.textContent = unitText;

  const btn = button("다음", ok, "btn primary");

  function ok(){
    const n = clampInt(input.value, 0, 99);
    onSubmit(n);
  }

  wrap.append(input, unit, btn);
  return wrap;
}

function makeGridSingleSelect(options, onSelect, selectedValue){
  const grid = document.createElement("div");
  grid.className = "grid";

  options.forEach(opt=>{
    const label = typeof opt === "string" ? opt : opt.label;
    const value = typeof opt === "string" ? opt : opt.value;

    const b = button(label, ()=>{
      [...grid.querySelectorAll("button")].forEach(x=>x.classList.remove("selected"));
      b.classList.add("selected");
      onSelect(value, label);
    }, "btn");

    if(selectedValue && selectedValue === value) b.classList.add("selected");
    grid.appendChild(b);
  });

  return grid;
}

function addBackButton(prevStep){
  const row = document.createElement("div");
  row.className = "btnRow";
  row.appendChild(button("이전", ()=>{
    state.step = prevStep;
    renderStep();
  }, "btn ghost"));
  stepArea.appendChild(row);
}

function setProgress(){
  const p = Math.max(1, Math.min(5, state.step));
  stepText.textContent = `${p}/5`;
  barFill.style.width = `${(p-1) * 25}%`;
}

// ---------- render (기존 상세 로직 전체 복구) ----------
function renderStep(){
  setProgress();
  resultArea.style.display = "none";
  stepArea.style.display = "block";
  stepArea.innerHTML = "";

  // 1) 지역
  if(state.step === 1){
    stepArea.append(
      title("거주 지역이 어디신가요?"),
      desc("관할/상담 배정 참고용입니다. 계산에는 직접 반영하지 않아요.")
    );

    const grid = makeGridSingleSelect(REGIONS, (value, label)=>{
      if(label.startsWith("기타")){
        const v = prompt("지역을 입력해주세요 (예: 수원/천안/김포 등)");
        if(!v) return;
        state.answers.region = v.trim();
      } else {
        state.answers.region = value;
      }
      state.step = 2;
      renderStep();
    }, null);

    stepArea.append(grid);
    return;
  }

  // 2) 총채무
  if(state.step === 2){
    stepArea.append(
      title("총 채무는 얼마인가요?"),
      desc("카드빚/대출/연체 등 포함, 대략 금액이면 괜찮아요. (만원)")
    );
    stepArea.append(amountInput("예) 5000", (val)=>{
      state.answers.debt_m = val;
      state.step = 3;
      renderStep();
    }));
    addBackButton(1);
    return;
  }

  // 3) 월 실수령
  if(state.step === 3){
    stepArea.append(
      title("월 실수령은 얼마인가요?"),
      desc("세후 실수령을 입력해주세요. (만원)")
    );
    stepArea.append(amountInput("예) 250", (val)=>{
      state.answers.income_m = val;
      state.step = 4;
      renderStep();
    }));
    addBackButton(2);
    return;
  }

  // 4) 주거 형태
  if(state.step === 4){
    stepArea.append(
      title("주거 형태를 선택하세요"),
      desc("입력 부담을 줄이기 위해 ‘주거 형태 + 금액 1개’만 받습니다.")
    );

    const grid = document.createElement("div");
    grid.className = "grid";

    HOUSING.forEach(h=>{
      const b = button(h.label, ()=>{
        [...grid.querySelectorAll("button")].forEach(x=>x.classList.remove("selected"));
        b.classList.add("selected");
        state.answers.housing_type = h.key;

        if(h.key === "무상거주"){
          state.answers.housing_m = 0;
          state.step = 5;
          renderStep();
          return;
        }

        renderHousingAmount(h);
      }, "btn");

      if(state.answers.housing_type === h.key) b.classList.add("selected");
      grid.appendChild(b);
    });

    stepArea.append(grid);
    addBackButton(3);
    return;
  }

  // 5) 부양가구(가구원수)
  if(state.step === 5){
    stepArea.append(
      title("부양(가구) 인원은 몇 명인가요?"),
      desc("‘본인 포함, 실제로 같이 사는 인원’ 기준으로 러프 계산합니다.")
    );

    const grid = document.createElement("div");
    grid.className = "grid";

    grid.appendChild(button("직접 입력", ()=>{
      state.answers.depend_mode = "direct";
      renderDependDirect();
    }, "btn"));

    grid.appendChild(button("잘 모르겠어요", ()=>{
      state.answers.depend_mode = "auto";
      renderDependAuto();
    }, "btn"));

    stepArea.append(grid);
    addBackButton(4);
    return;
  }
}

function renderHousingAmount(h){
  stepArea.innerHTML = "";
  setProgress();

  stepArea.append(
    title(`${h.label} 선택됨`),
    desc(h.hint)
  );

  const ph = (h.key === "월세") ? "예) 60" : (h.key === "전세") ? "예) 12000" : "예) 35000";

  stepArea.append(amountInput(ph, (val)=>{
    state.answers.housing_m = val;
    state.step = 5;
    renderStep();
  }));

  const row = document.createElement("div");
  row.className = "btnRow";
  row.appendChild(button("주거 형태 다시 선택", ()=>{
    state.step = 4;
    renderStep();
  }, "btn ghost"));
  row.appendChild(button("이전", ()=>{
    state.step = 3;
    renderStep();
  }, "btn ghost"));
  stepArea.append(row);
}

function renderDependDirect(){
  stepArea.innerHTML = "";
  setProgress();

  stepArea.append(
    title("가구원 수를 입력해주세요"),
    desc("‘가구원 수’는 보통 생계를 함께하는 동거 가구원(본인 포함)을 뜻합니다. 배우자가 소득이 충분한 경우 사건에 따라 제외될 수 있어요.")
  );

  stepArea.append(smallNumberInput("예) 1", "명", (val)=>{
    const hh = clampInt(val, 1, 20);
    state.answers.household_total = hh;
    finalize();
  }));

  const row = document.createElement("div");
  row.className = "btnRow";
  row.appendChild(button("선택 화면으로", ()=>{
    state.step = 5;
    renderStep();
  }, "btn ghost"));
  row.appendChild(button("이전", ()=>{
    state.step = 4;
    renderStep();
  }, "btn ghost"));
  stepArea.append(row);
}

function renderDependAuto(){
  stepArea.innerHTML = "";
  setProgress();

  stepArea.append(
    title("간단 유추"),
    desc("선택으로 가구원 수를 대략 유추합니다. (정확하지 않아도 괜찮아요)")
  );

  let married = "미혼";
  let children = 0;
  let extra = 0;

  const box1 = document.createElement("div");
  box1.className = "kpi";
  box1.appendChild(desc("혼인 상태"));
  const g1 = makeGridSingleSelect(
    [{label:"미혼", value:"미혼"},{label:"기혼", value:"기혼"},{label:"이혼", value:"이혼"}],
    (v)=>{ married = v; update(); },
    "미혼"
  );
  box1.appendChild(g1);

  const box2 = document.createElement("div");
  box2.className = "kpi";
  box2.appendChild(desc("미성년 자녀 수"));
  const g2 = makeGridSingleSelect(
    [{label:"0명", value:0},{label:"1명", value:1},{label:"2명", value:2},{label:"3명+", value:3}],
    (v)=>{ children = Number(v); update(); },
    0
  );
  box2.appendChild(g2);

  const box3 = document.createElement("div");
  box3.className = "kpi";
  box3.appendChild(desc("기타 동거 가족(부모 등)"));
  const g3 = makeGridSingleSelect(
    [{label:"0명", value:0},{label:"1명", value:1},{label:"2명", value:2},{label:"3명+", value:3}],
    (v)=>{ extra = Number(v); update(); },
    0
  );
  box3.appendChild(g3);

  const preview = document.createElement("div");
  preview.className = "muted";
  preview.style.marginTop = "8px";

  function update(){
    const spouse = (married==="기혼") ? 1 : 0;
    const hh = 1 + spouse + (children||0) + (extra||0);
    preview.textContent = `추정 가구원 수(본인 포함): ${hh}명`;
  }
  update();

  stepArea.append(box1, box2, box3, preview);

  const row = document.createElement("div");
  row.className = "btnRow";
  row.appendChild(button("이 값으로 결과 보기", ()=>{
    const spouse = (married==="기혼") ? 1 : 0;
    state.answers.household_total = 1 + spouse + (children||0) + (extra||0);
    finalize();
  }, "btn primary"));

  row.appendChild(button("선택 화면으로", ()=>{
    state.step = 5;
    renderStep();
  }, "btn ghost"));

  row.appendChild(button("이전", ()=>{
    state.step = 4;
    renderStep();
  }, "btn ghost"));

  stepArea.append(row);
}

function baseLivingMByHousehold(hh){
  // 2026년 기준중위소득 60% 기반(만원 단위, 반올림)
  // (실무에서 ‘최저생계비’로 많이 활용되는 기준)
  // 1인 1,538,543원 → 154만원
  // 2인 2,519,575원 → 252만원
  // 3인 3,215,422원 → 322만원
  // 4인 3,896,843원 → 390만원
  // 5인 4,534,031원 → 453만원
  // 6인 5,133,571원 → 513만원
  const t = {1:154, 2:252, 3:322, 4:390, 5:453, 6:513};
  if(hh <= 6) return t[hh] || 154;
  return t[6] + (hh - 6) * 60; // 6인 초과는 단순 근사(상담 시 보정)
}

function regionToHousingZone(region){
  // 권역 단순화(월세 ‘추가생계비’ 상한 적용용)
  const z1 = new Set(["서울"]);
  const z2 = new Set(["경기 북부","경기 남부","인천"]);
  const z3 = new Set(["부산","대구","대전","광주","울산","세종"]); // 광역시급
  if(z1.has(region)) return 1;
  if(z2.has(region)) return 2;
  if(z3.has(region)) return 3;
  return 4;
}

function housingBaseM(hh){
  // 최저생계비(중위 60%)에 포함된 “기본 주거비”를 보수적으로 가정(1~4인)
  const b = {1:25, 2:42, 3:53, 4:65};
  return b[Math.min(Math.max(hh, 1), 4)];
}

function housingExtraLimitM(region, hh){
  // 월세 ‘추가생계비(주거비)’ 인정 상한(권역/가구원별, 1~4인)
  // 사건/법원에 따라 달라질 수 있으므로 MVP에서는 “상한 내 초과분 일부 반영”만 함
  const zone = regionToHousingZone(region || "");
  const key = Math.min(Math.max(hh, 1), 4);

  const extra = {
    1: {1:51, 2:83, 3:107, 4:130}, // 서울
    2: {1:38, 2:62, 3:79,  4:96 }, // 수도권(서울 제외)
    3: {1:21, 2:35, 3:45,  4:54 }, // 광역시
    4: {1:16, 2:26, 3:34,  4:41 }, // 그 외
  };

  return (extra[zone] && extra[zone][key]) ? extra[zone][key] : 0;
}

function calcRentExtraM(region, hh, rent){
  const r = clampInt(rent, 0, 999999);
  const base = housingBaseM(hh);
  const extraLimit = housingExtraLimitM(region, hh);
  // “기본 주거비” 초과분만, 상한까지 추가 반영
  return Math.min(Math.max(0, r - base), extraLimit);
}


function finalize(){
  state.result = calcRough(state.answers);
  showResult();
}

function calcRough(a){
  const debt = a.debt_m || 0;
  const income = a.income_m || 0;
  const hh = clampInt(a.household_total || 1, 1, 20);

  // 1) 생계비 계산(최저생계비 + 월세(추정) 일부 반영)
  let living = baseLivingMByHousehold(hh);

  let rentInput = 0;
  let rentApplied = 0;
  if(a.housing_type === "월세"){
    rentInput = clampInt(a.housing_m || 0, 0, 999999);
    // ✅ 기존 “월세 전액 더하기” 느낌을 줄이고, MVP는 상한을 둔 ‘일부 반영(추정)’으로 처리
    //    (너가 원했던 “혜택이 커 보이되, 과장처럼 보이진 않게” 라인)
    rentApplied = Math.min(rentInput, 120);
    living += rentApplied;
  }

  // 2) 재산(청산가치) 파악 + ✅ 면제재산 공제(4,000만원)
  let rawAsset = 0;
  if(a.housing_type === "자가" || a.housing_type === "전세"){
    rawAsset = a.housing_m || 0;
  }
  const asset = Math.max(0, rawAsset - 4000);

  // [Case 0] 고액 채무(개인회생 한도 초과 가능성)
  if(debt > 250000){
    return {
      grade: "일반회생 대상 (개인회생 불가)",
      monthly_range_m: [0, 0],
      relief_amount_range_m: [0, 0],
      relief_rate_range: [0, 0],
      period: "-",
      memo:
        `총 채무액이 ${fmtM(debt)}으로 개인회생 신청 한도(담보 15억/무담보 10억 등)를 초과할 가능성이 있습니다.\n` +
        `전문직/사업자 등을 위한 '일반회생' 절차 상담이 필요합니다.`
    };
  }

  // [Case 1] 재산(공제 후) >= 채무 : 회생으로 “탕감” 기대가 어려움
  if(asset >= debt && debt > 0){
    return {
      grade: "신청 불가 (재산 초과)",
      monthly_range_m: [0, 0],
      relief_amount_range_m: [0, 0],
      relief_rate_range: [0, 0],
      period: "0개월",
      memo:
        `공제 후 인정 재산(${fmtM(asset)})이 총 채무(${fmtM(debt)})보다 많아,\n` +
        `재산을 처분해 채무를 상환할 여력이 있다고 판단될 수 있습니다.\n` +
        `(면제재산 약 4,000만원 공제 후 기준)`
    };
  }

  // 3) 가용소득(변제여력) = 소득 - 생활비 (음수면 0)
  const disposableRaw = income - living;
  let disposable = Math.max(0, disposableRaw);

  const noDisposable = (disposable === 0);
  const lowDisposable = (disposable > 0 && disposable < 15);

  // ✅ 기존 문제였던 “소득 낮으면 15만원으로 강제” 로직 제거
  const incomePay = disposable;

  // 4) 월 변제금 계산(청산가치 보장: 재산/기간 기준 하한)
  const assetPay36 = asset > 0 ? Math.ceil(asset / 36) : 0;
  const assetPay60 = asset > 0 ? Math.ceil(asset / 60) : 0;

  const m36 = Math.max(incomePay, assetPay36);
  const m60 = Math.max(incomePay, assetPay60);

  const monthlyLow = Math.min(m36, m60);
  const monthlyHigh = Math.max(m36, m60);

  const total36 = m36 * 36;
  const total60 = m60 * 60;

  const totalMin = Math.min(total36, total60);
  const totalMax = Math.max(total36, total60);

    // -----------------------------
  // Guardrails (사용자 불신 방지)
  // -----------------------------

  // (1) 총채무 > 0인데 월 변제금이 0원으로 나오는 케이스는
  //     계산기에서 "확정"처럼 보여주면 바로 의심 포인트라서
  //     숫자 대신 "산정 불확실(상담 필요)"로 전환한다.
  if(debt > 0 && monthlyHigh === 0){
    return {
      grade: "산정 불확실 (상담 필요)",
      monthly_range_m: [null, null],
      relief_amount_range_m: [null, null],
      relief_rate_range: [null, null],
      period: "-",
      memo:
        `현재 입력값 기준으로는 월 변제금이 0원처럼 산정될 수 있어, 계산 결과를 확정적으로 안내하기 어렵습니다.\n` +
        `개인회생은 ‘지속적인 소득/변제계획’ 확인이 핵심이라, 실제 가능 여부는 서류(소득·지출·재산·채무 구조) 기반 상담이 필요합니다.\n` +
        `※ 이 화면은 러프 계산기이며, 정확한 판단은 사건별로 달라질 수 있습니다.`
    };
  }

  // (2) 전세/자가(자산) 입력이 있는 경우:
  //     대출잔액(전세대출/주담대)이 미반영이면 결과가 낙관/비관 어느 쪽이든 흔들릴 수 있으니
  //     결과에 '미반영 경고'를 항상 한 줄 붙여 신뢰를 방어한다.
  //     (UI 변경 없이 문구만 추가)
  if(rawAsset > 0){
    // memo가 아직 비어있을 수도 있으니(아래 분기에서 채워지지만) 안전하게 처리
    // -> memo는 이후에 채워지므로, 최종 memo에 붙일 플래그로 남김
  }


  // ✅ 탕감 범위: (최소 탕감 ~ 최대 탕감)
  const reliefLow = Math.max(0, debt - totalMax); // 덜 유리(많이 갚는 경우)
  const reliefHigh = Math.max(0, debt - totalMin); // 더 유리(덜 갚는 경우)

  const rateLow = debt>0 ? Math.round((reliefLow / debt) * 100) : 0;
  const rateHigh = debt>0 ? Math.round((reliefHigh / debt) * 100) : 0;

// 5) 멘트 생성 (마케팅 로직 v9 - 옵션 2 적용)
  let grade = "탕감 예상 대상자 (신청 가능)"; 
  let memo = "";
  let periodText = "36 ~ 60개월";

  if(debt < 1500){
    grade = "워크아웃/신속채무조정 권장";
    memo = `채무액이 ${fmtM(debt)}으로 적어, 법원 회생보다 신용회복위원회 워크아웃이 유리할 수 있습니다.`;
  }
  // ✅ [수정됨] 소득 부족 시 -> '최대 탕감 예상'으로 긍정적 전환
  else if(forceMinimum){
    grade = "최대 탕감 예상 (최저 변제금 적용)";
    memo = `현재 소득이 기준 생계비에 다소 부족하지만, 법원에서 허용하는 **'최저 변제금(약 15만원)'**으로 진행할 경우 **탕감 효율이 가장 높을 것**으로 예상됩니다.\n(단, 재산/소득의 정밀 확인이 필요하며 조건에 따라 파산 신청도 고려해볼 수 있습니다)`;
  }
  // 우선순위 3: 고소득/재산보유로 원금 100% 변제
  else if(Math.min(totalLow, totalHigh) >= debt){
    grade = "원금 100% 변제 (이자 전액 탕감)";
    memo = `소득이 높거나 보유 재산 가치를 보장해야 하여, 원금은 갚되 높은 이자를 탕감받는 조건이 예상됩니다.`;
  }
  // 우선순위 4: 재산 때문에 변제금 상향
  else if(asset > 0 && monthlyLow > disposable){
    memo = `보유 재산(${fmtM(asset)}) 가치 이상을 갚아야 하므로(청산가치 보장), 소득 대비 월 변제금이 상향 조정되었습니다.\n(면제재산 약 4,000만원 공제 후 계산됨)`;
  }
  // 일반
  else {
    memo = `가구 ${hh}인 기준 생계비(하한)를 제외하고도 변제 여력이 충분합니다.`;
  }

  // --- 부가 설명(모순/과장 느낌 줄이기) ---
  if(a.housing_type === "월세" && rentApplied > 0){
    memo += `\n※ 월세는 입력 ${fmtM(rentInput)} 중 ${fmtM(rentApplied)}을 생계비에 추가 반영(추정)했습니다.`;
  }
  if(hh >= 2){
    memo += `\n※ 배우자 소득/자녀 나이/실제 부양관계에 따라 생계비 인정액은 달라질 수 있습니다.`;
  }
  if(rawAsset > 0 && asset < rawAsset){
    memo += `\n※ 입력하신 보증금/주거가치 등에서 약 4,000만원을 보호자산(면제재산)으로 공제하고 계산했습니다.`;
  }
    if(rawAsset > 0){
    memo += `\n※ 전세/주거자산의 경우 전세대출·주담대 등 ‘대출 잔액’이 반영되지 않으면 실제 결과와 차이가 커질 수 있습니다.`;
  }


  return {
    grade,
    monthly_range_m: [monthlyLow, monthlyHigh],
    relief_amount_range_m: [Math.min(reliefLow, reliefHigh), Math.max(reliefLow, reliefHigh)],
    relief_rate_range: [Math.min(rateLow, rateHigh), Math.max(rateLow, rateHigh)],
    period: periodText,
    memo
  };
}


// ---------- result ----------
function showResult(){
  stepArea.style.display = "none";
  resultArea.style.display = "block";
  barFill.style.width = "100%";
  stepText.textContent = "완료";

  const r = state.result;
  
  if(kpiPeriod) kpiPeriod.textContent = r.period || "-";
  kpiMonthly.textContent = `${fmtM(r.monthly_range_m[0])} ~ ${fmtM(r.monthly_range_m[1])}`;
  kpiReliefAmt.textContent = `${fmtM(r.relief_amount_range_m[0])} ~ ${fmtM(r.relief_amount_range_m[1])}`;
  kpiReliefRate.textContent = `${fmtPct(r.relief_rate_range[0])} ~ ${fmtPct(r.relief_rate_range[1])}`;


  resultNote.innerHTML =
    `<strong>진단 결과: ${r.grade}</strong><br/><br/>` +
    r.memo.replace(/\n/g, "<br/>") +
    `<br/><br/><small style='opacity:0.8'>※ 실제 결과는 소득·재산·법원 판단에 따라 달라질 수 있습니다.</small>`;
}

// ---------- modal ----------
function openModal(){
  modal.style.display = "flex";
  formMsg.textContent = "";
  formMsg.className = "msg";
}
function closeModalFn(){
  modal.style.display = "none";
}

restartBtn.addEventListener("click", ()=>location.reload());
openLeadBtn.addEventListener("click", openModal);
headerCallBtn.addEventListener("click", openModal);

closeModal.addEventListener("click", closeModalFn);
cancelLeadBtn.addEventListener("click", closeModalFn);
modalBg.addEventListener("click", closeModalFn);

// 상담시간 옵션
function initTimePick(){
  hourSel.innerHTML = "";
  for(let h=1; h<=12; h++){
    const op = document.createElement("option");
    op.value = String(h);
    op.textContent = String(h);
    hourSel.appendChild(op);
  }

  minSel.innerHTML = "";
  [0,10,20,30,40,50].forEach(m=>{
    const op = document.createElement("option");
    op.value = String(m).padStart(2,"0");
    op.textContent = String(m).padStart(2,"0");
    minSel.appendChild(op);
  });

  hourSel.value = "10";
  minSel.value = "30";
}
initTimePick();

function setAmpm(v){
  state.ampm = v;
  if(v === "오전"){
    amBtn.classList.add("selected");
    pmBtn.classList.remove("selected");
  } else {
    pmBtn.classList.add("selected");
    amBtn.classList.remove("selected");
  }
}
amBtn.addEventListener("click", ()=>setAmpm("오전"));
pmBtn.addEventListener("click", ()=>setAmpm("오후"));

// 연락처 자동 포맷
phoneRest.addEventListener("input", ()=>{
  let d = digitsOnly(phoneRest.value);
  if(d.length >= 10 && d.startsWith("010")){
    phonePrefix.value = "010";
    d = d.slice(3);
  } else if(d.startsWith("02")){
    phonePrefix.value = "02";
    d = d.slice(2);
  }
  d = d.slice(0, 8);
  phoneRest.value = d;
});

function formatPhone(prefix, rest){
  const r = digitsOnly(rest);
  if(prefix === "02"){
    if(r.length <= 3) return `${prefix}-${r}`;
    if(r.length <= 7) return `${prefix}-${r.slice(0,3)}-${r.slice(3)}`;
    return `${prefix}-${r.slice(0,4)}-${r.slice(4)}`;
  }
  if(r.length <= 3) return `${prefix}-${r}`;
  if(r.length <= 7) return `${prefix}-${r.slice(0,3)}-${r.slice(3)}`;
  return `${prefix}-${r.slice(0,4)}-${r.slice(4)}`;
}

// ✅ 구글 시트 저장용 URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzBboiqOjLv92xFp1Z9X4u-HRRoSlzK2vdIdomuXdzx3XYFJao3BzzGAirPpgqUmavj/exec";

async function submitLead(){
  const nm = (nameEl.value || "").trim();
  const pr = phonePrefix.value;
  const rr = (phoneRest.value || "").trim();
  const phone = formatPhone(pr, rr);

  // 유효성 검사
  if(!nm){ return showFormErr("성함을 입력해주세요."); }
  if(pr === "010" && digitsOnly(rr).length < 8){ return showFormErr("휴대전화 번호 전체를 입력해주세요."); }
  if(digitsOnly(rr).length < 7){ return showFormErr("연락처를 정확히 입력해주세요."); }

  const time = `${state.ampm} ${hourSel.value}시 ${minSel.value}분`;

  const payload = {
    name: nm,
    phone,
    time,
    region: state.answers.region,
    debt_m: state.answers.debt_m,
    income_m: state.answers.income_m,
    housing_type: state.answers.housing_type,
    housing_m: state.answers.housing_m,
    household_total: state.answers.household_total,
    result: state.result
  };

  if(!WEB_APP_URL){
    formMsg.className = "msg";
    formMsg.textContent = "URL 설정 오류";
    return;
  }

  try{
    submitLeadBtn.disabled = true;
    submitLeadBtn.textContent = "신청 중...";

    await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    formMsg.className = "msg";
    formMsg.style.color = "#11482a";
    formMsg.textContent = "신청이 완료되었습니다. 곧 연락드릴게요.";
    
    setTimeout(()=>{
      closeModalFn();
      submitLeadBtn.disabled = false;
      submitLeadBtn.textContent = "상담 신청하기";
      formMsg.textContent = "";
      nameEl.value = "";
      phoneRest.value = "";
    }, 2500);

  }catch(e){
    console.error(e);
    showFormErr("전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    submitLeadBtn.disabled = false;
    submitLeadBtn.textContent = "상담 신청하기";
  }
}

function showFormErr(msg){
  formMsg.className = "msg err";
  formMsg.textContent = msg;
}

submitLeadBtn.addEventListener("click", submitLead);
modal.addEventListener("keydown", (e)=>{
  if(e.key === "Enter"){
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    if(tag !== "select"){
      e.preventDefault();
      submitLead();
    }
  }
});

renderStep();