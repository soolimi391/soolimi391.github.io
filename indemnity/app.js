/* 개인회생 탕감 계산기 (MVP) - v4 (최종 완성형)
 * - 수정사항:
 * 1. 0원 변제 방지 (기존 v3 반영)
 * 2. 1,500만원 미만 소액 채무 안내 (신뢰도 UP)
 * 3. 총 변제액이 원금을 초과하는 오류 수정 (고소득자 대응)
 * 4. 배우자/부양가족 관련 현실적 조언 문구 추가
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

const kpiMonthly = document.getElementById("kpiMonthly");
const kpiReliefAmt = document.getElementById("kpiReliefAmt");
const kpiReliefRate = document.getElementById("kpiReliefRate");
const resultNote = document.getElementById("resultNote");

const openLeadBtn = document.getElementById("openLeadBtn");
const restartBtn = document.getElementById("restartBtn");

const headerCallBtn = document.getElementById("headerCallBtn");

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
  const n = Math.max(0, Math.round(m||0));
  return n.toLocaleString("ko-KR") + "만원";
}

// ---------- inputs (inline) ----------
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

// ---------- render ----------
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
    desc("본인 포함 총 가구원 수를 입력해주세요. (예: 혼자 살면 1, 배우자/자녀와 함께면 2~)")
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

// ---------- calculation ----------
function baseLivingMByHousehold(hh){
  const t = {1:154, 2:252, 3:322, 4:390, 5:454, 6:516};
  if(hh <= 6) return t[hh] || 154;
  return t[6] + (hh - 6) * 60;
}

function finalize(){
  state.result = calcRough(state.answers);
  showResult();
}

function calcRough(a){
  const debt = a.debt_m || 0;
  const income = a.income_m || 0;
  const hh = clampInt(a.household_total || 1, 1, 20);

  // 1) 기준 생활비(하한)
  let living = baseLivingMByHousehold(hh);

  // 2) 월세
  if(a.housing_type === "월세"){
    const rent = clampInt(a.housing_m || 0, 0, 999999);
    living += Math.min(rent, 120);
  }

  // 3) 가용액
  let disposable = income - living;
  
  // [Check 1] 최소 변제금 설정 (10만원)
  if(disposable < 10) disposable = 10;

  // 4) 월 변제금 계산
  let mLow = Math.round(disposable * 0.65);
  let mHigh = Math.round(disposable * 0.85);
  
  const monthsLow = 36;
  const monthsHigh = 60;

  // [Check 2] 고소득자(역전 현상) 방지 로직
  // 36개월간 낼 돈이 원금보다 많으면? -> 굳이 더 낼 필요 없음. 원금/36개월 금액으로 조정.
  const maxMonthly = Math.ceil(debt / 36); 
  
  // 변제금이 원금분할액보다 크면 캡을 씌움
  if(mLow > maxMonthly) mLow = maxMonthly;
  if(mHigh > maxMonthly) mHigh = maxMonthly;

  let payTotalLow = mLow * monthsLow;
  let payTotalHigh = mHigh * monthsHigh;
  
  // 총 변제액이 원금보다 크지 않도록 2차 방어
  if(payTotalLow > debt) payTotalLow = debt;
  if(payTotalHigh > debt) payTotalHigh = debt;

  // 6) 탕감액
  const reliefLow = Math.max(0, debt - payTotalHigh);
  const reliefHigh = Math.max(0, debt - payTotalLow);

  const rateLow = debt>0 ? Math.round((reliefLow / debt) * 100) : 0;
  const rateHigh = debt>0 ? Math.round((reliefHigh / debt) * 100) : 0;

  // 7) 등급 및 코멘트
  let grade = "탕감 예상 대상자 (신청 가능)"; 
  let memo = `가구 ${hh}인 기준 생계비(하한)를 제외하고도 변제 여력이 충분합니다.`;

  // [Check 3] 채무 1,500만원 미만 (소액 채무)
  if(debt < 1500){
    grade = "워크아웃/신속채무조정 권장";
    memo = `채무액이 ${debt}만원으로, 개인회생 실무 기준(약 1,500만원)보다 적습니다. 법원 절차보다 '신용회복위원회 워크아웃'이 더 유리할 수 있으니 비교 상담을 받아보세요.`;
  }
  // 소득 부족 (파산 유리)
  else if(income - living <= 0){
    grade = "개인파산 유리 (전문가 확인 필요)";
    memo = `현재 소득이 부양가족 생계비보다 적어, 회생보다는 '개인파산(전액 탕감)'이 더 유리할 수 있습니다. 다만 재산/소득 정밀 확인이 꼭 필요합니다.`;
  }
  // 고소득자 (원금 100% 변제)
  else if(payTotalLow >= debt || payTotalHigh >= debt){
    grade = "원금 100% 변제 (이자 전액 탕감)";
    memo = `소득이 충분하여 원금은 갚되, **높은 이자를 전액 탕감**받는 전략이 유효합니다. 연체 이자 부담을 없애는 쪽으로 접근하세요.`;
  }
  // 일반적인 탕감
  else if(Math.max(rateLow, rateHigh) < 15){
    grade = "채무 조정 가능 (상담 권장)";
    memo += ` 탕감액이 적어 보일 수 있으나, 이자 면제 효과를 고려해야 합니다.`;
  }

  // 주거비 멘트 추가
  if(a.housing_type === "월세"){
    memo += ` (월세 추가 생계비 반영)`;
  }

  // [Check 4] 배우자/부양가족 방어 멘트 (가장 중요)
  if(hh >= 2){
    memo += `\n※ 배우자 소득이 있거나 부양 조건이 안 되면 변제금이 올라갈 수 있습니다.`;
  }

  // 전세/자가
  const housingBig = (a.housing_type==="자가" || a.housing_type==="전세") && (a.housing_m||0) >= 8000;
  if(housingBig){
    memo += `\n※ 보유 재산(보증금/자가)이 빚보다 많으면 회생이 어려울 수 있습니다.`;
  }

  return {
    grade,
    monthly_range_m: [mLow, mHigh],
    relief_amount_range_m: [reliefLow, reliefHigh],
    relief_rate_range: [Math.min(rateLow, rateHigh), Math.max(rateLow, rateHigh)],
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

  kpiMonthly.textContent = `${fmtM(r.monthly_range_m[0])} ~ ${fmtM(r.monthly_range_m[1])}`;
  kpiReliefAmt.textContent = `${fmtM(r.relief_amount_range_m[0])} ~ ${fmtM(r.relief_amount_range_m[1])}`;
  kpiReliefRate.textContent = `${r.relief_rate_range[0]}% ~ ${r.relief_rate_range[1]}%`;

  // 줄바꿈 처리
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