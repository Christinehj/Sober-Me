const STORAGE_KEY = "soberlog_v2";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [], soberStartDate: null, lineSeed: 0 };
    const parsed = JSON.parse(raw);
    parsed.entries ??= [];
    parsed.soberStartDate ??= null; // ISO date string
    parsed.lineSeed ??= 0;
    return parsed;
  } catch {
    return { entries: [], soberStartDate: null, lineSeed: 0 };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function upsertToday(state, status) {
  const t = todayISO();
  const now = new Date().toISOString();
  const idx = state.entries.findIndex(e => e.date === t);
  const entry = { date: t, status, updatedAt: now };
  if (idx >= 0) state.entries[idx] = entry;
  else state.entries.unshift(entry);
  saveState(state);
}

function computeStreak(entries) {
  const map = new Map(entries.map(e => [e.date, e.status]));
  let streak = 0;
  let d = new Date();
  for (;;) {
    const iso = d.toISOString().slice(0, 10);
    const status = map.get(iso);
    if (status === "sober") {
      streak += 1;
      d.setDate(d.getDate() - 1);
      continue;
    }
    break;
  }
  return streak;
}

function statusTextForToday(entries) {
  const t = todayISO();
  const e = entries.find(x => x.date === t);
  if (!e) return "오늘 상태: 미기록";
  if (e.status === "sober") return "오늘 상태: 0잔 ✅ (기록됨)";
  if (e.status === "drank") return "오늘 상태: 음주 🍺 (기록됨)";
  return "오늘 상태: 미기록";
}

function daysBetween(startISO, endISO) {
  const start = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  const ms = end - start;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }


const effects42 = [
  // Day 1 (0~24h) — 6h 이후 변화 + 12~24h 위험 안내
  "1일차: 시작 자체가 가장 큰 일. 금주는 대개 6시간쯤부터 몸이 변화를 느끼기 시작해. 평소 음주량이 많았다면 무리하지 말고 상태를 관찰해.",
  "2일차: (12~24시간 구간 포함) 과량 음주 습관이 있었다면 이 시기엔 ‘금단 섬망(Delirium tremens)’ 같은 위험 신호가 생길 수 있어. 심한 떨림·환각·혼란·발작 느낌이 있으면 지체 말고 의료 도움.",
  "3일차: 24~48시간 구간은 뇌가 ‘억제’ 없이 과흥분하기 쉬운 때. 불안·초조·예민함이 올라올 수 있어. 오늘 안 마시는 게 내일을 지켜.",
  "4일차: 2~3일째엔 코티솔이 오르고 불안/식욕 저하가 올 수 있어. 이때 다시 술 찾기 쉬워—오늘이 고비야.",
  "5일차: 3일차 이후엔 도파민이 낮아져 기분이 더 가라앉을 수 있어. ‘기분이 나쁨=실패’가 아니라 회복 과정이야.",
  "6일차: 4일째부터 도파민 작용이 회복되기 시작한다고 해. 아주 작은 ‘괜찮아짐’을 놓치지 말자. 기침·속쓰림도 같이 내려가는 쪽으로 갈 수 있어.",
  "7일차: 1주차 마무리. 오늘 0잔은 ‘뇌 과부하’를 줄이고 루틴을 재설정하는 날. 돈도 그만큼 굳고 있어.",

  // Week 2 — 안정화/루틴/위·식도 동기
  "8일차: 이 시기엔 ‘저녁만 넘기면 된다’가 핵심. 저녁에 안 마시면 새벽 기침·목 이물감이 덜해질 가능성이 커져.",
  "9일차: 술로 진정시키던 뇌가 스스로 진정하는 법을 배우는 중. 불안이 잠깐 올라와도 그대로 지나가게 두자.",
  "10일차: 수면 패턴이 조금씩 정돈되기 시작할 수 있어. 숙면은 뱃살/식욕/피부의 공통 기반이야.",
  "11일차: 속쓰림이 있는 사람은 밤 음주 중단만으로도 체감이 오기도 해. ‘오늘 안 마심’은 위에 대한 직접 투자.",
  "12일차: 집중력은 갑자기 확 오기보다 ‘흐림이 줄어드는’ 방식으로 돌아와. 통역/업무 체감이 생길 수 있어.",
  "13일차: 붓기는 체중보다 먼저 반응해. 얼굴·손·발이 덜 붓는 날이 늘면 방향이 맞는 거야.",
  "14일차: 2주차. 이제는 ‘의지’보다 ‘기본값’이 바뀌기 시작하는 구간. 오늘도 0잔으로 기본값 강화.",

  // Week 3 — 3주차: 장누수 진정/소화 회복 시작
  "15일차: 알코올은 장과 뇌 모두에 영향을 줘. 오늘은 ‘회복이 진행 중’이라는 사실을 기억하는 날.",
  "16일차: 컨디션이 들쭉날쭉해도 정상 범위야. 회복은 직선이 아니라 파도처럼 오르내려.",
  "17일차: ‘마시면 행복/선명’처럼 느끼던 효과는 뇌 억제 작용의 착시일 수 있어. 이제는 맑음이 자연 회복으로 온다.",
  "18일차: 위·식도 자극이 줄면 기침도 덜 예민해질 수 있어. 오늘 참는 게 내일 새벽을 돕는다.",
  "19일차: 뱃살은 결과고, 조건이 먼저야. 술이 빠지면 야식/과식/수면질이 같이 움직이기 시작해.",
  "20일차: 3주 가까워진다. ‘다시 마시면 처음으로 돌아갈까?’가 아니라 ‘여기까지 왔다’가 팩트야.",
  "21일차: 3주차: 연구/설명에 따르면 이 시기 장누수(Leaky gut)가 진정되고 소화기관 회복이 시작될 수 있어. 아직 완전 회복 전이라 기분 저하가 남아도 이상하지 않아.",

  // Week 4 — 수면 질 향상
  "22일차: 3~4주 사이엔 컨디션 난조로 기분이 처질 수 있어. ‘그래도 안 마신다’가 가장 큰 승리.",
  "23일차: 술은 잠들기 쉽게 하지만 수면의 질을 낮출 수 있어. 오늘은 ‘질 좋은 잠’에 투자하는 날.",
  "24일차: 기침/속쓰림이 있으면 특히 ‘밤을 깨는 요인’을 줄이는 게 중요해. 오늘 0잔은 야간 자극을 낮춘다.",
  "25일차: 4주차로 들어간다. 수면의 질이 좋아지면 식욕·기분·피부·복부지방 관리가 한꺼번에 쉬워질 수 있어.",
  "26일차: 아침이 덜 무겁다면 제대로 가고 있는 거야. ‘내일 아침을 위해 오늘 안 마신다’는 강력한 이유.",
  "27일차: 돈이 눈에 띄게 새는 구멍이 줄어드는 시기. 기록으로 ‘절약’도 같이 확인해봐.",
  "28일차: 4주차: 수면의 질이 좋아지는 변화를 체감할 수 있는 구간. 잠이 좋아지면 하루의 회복 속도가 달라져.",

  // Week 5 — 수분 증가/피부
  "29일차: 알코올의 이뇨작용(탈수)에서 벗어나며 몸의 수분 균형이 돌아오는 쪽으로 갈 수 있어.",
  "30일차: 피부는 수분+수면+염증에 반응해. 오늘의 0잔은 내일의 피부 톤에 반영될 가능성이 커.",
  "31일차: 붓기가 빠지면 ‘가벼움’이 늘고, 가벼우면 움직이게 되고, 움직이면 뱃살 조건이 더 좋아져.",
  "32일차: 이 시기엔 ‘스트레스=술’ 연결고리를 끊는 게 핵심. 술 대신 회복 루틴(샤워/정리/가벼운 스트레칭)을 고정해봐.",
  "33일차: 5주차: 체내 수분량이 늘며 피부 상태가 좋아졌다고 느끼는 사람이 많다는 설명이 있어. 오늘은 그 흐름 유지.",
  "34일차: 기침/속쓰림이 줄면 말하기가 편해지고, 말하기가 편하면 하루 피로가 줄어. 선순환이 시작돼.",
  "35일차: 35일은 ‘한 달을 넘긴 습관’이야. 이제는 흔들림이 와도 다시 원래 자리로 돌아오기 쉬워.",

  // Week 6 — 사고력/문제해결/기억력/주의력(원문)
  "36일차: 6주차로 들어간다. 연구 요약에 따르면 이 시기 음주 지속자 대비 사고력·문제해결·기억력·주의력이 높아질 수 있다고 해.",
  "37일차: 머리가 덜 흐리면 하루가 길어져. 오늘은 ‘선명함’을 유지하는 날. 통역/업무 효율이 올라갈 수 있어.",
  "38일차: 집중력이 돌아오면 충동도 줄어드는 경우가 많아. ‘생각할 힘’이 생기면 선택이 쉬워져.",
  "39일차: 술이 끊기면 감정의 급등락이 완만해질 수 있어. 오늘은 마음의 소음을 낮추는 날.",
  "40일차: 40일대는 결과가 보이기 쉬운 구간. 피부/부기/수면/집중 중 하나라도 좋아졌다면 그게 증거야.",
  "41일차: 거의 왔다. ‘오늘만’ 지키면 42일이 기준점이 돼. 돈도, 몸도 여기까지 누적된 거야.",
  "42일차: 42일은 끝이 아니라 새로운 기본값. 오늘의 0잔으로 ‘기침·속쓰림·뱃살·기억력·피부·지갑’에 유리한 방향을 확정하자."
];


const motivationLines = [
  "오늘 참으면 내일 새벽 기침이 덜 거슬릴 확률이 올라간다.",
  "오늘 0잔은 속쓰림을 낮추는 가장 확실한 선택 중 하나다.",
  "오늘 안 마시면 붓기가 덜 쌓이고, 얼굴이 먼저 반응한다.",
  "오늘 안 마시면 야식 욕구가 줄어들 가능성이 커진다.",
  "오늘 0잔은 뱃살을 ‘직접’ 빼는 게 아니라, 빠지게 하는 조건을 만든다.",
  "오늘 안 마시면 기억력/집중이 덜 흐려진다. 내일이 선명해진다.",
  "오늘 안 마시면 피부가 덜 건조해지고, 톤이 덜 칙칙해질 수 있다.",
  "오늘 안 마시면 돈이 ‘굳는다’. 작은 절약이 누적된다.",
  "오늘만 넘기자. 내일의 나는 오늘의 나한테 고마워할 거다.",
  "충동은 파도고, 파도는 지나간다. 오늘은 지나가게 두는 날."
];

function pickMotivation(state) {
  // 같은 날 새로고침하면 문구가 바뀌지 않게 "seed" 사용
  const idx = Math.abs(state.lineSeed) % motivationLines.length;
  return motivationLines[idx];
}

function programDay(state) {
  // soberStartDate가 있으면 그 기준으로 +1, 없으면 streak 기반(엄격: 오늘 기록이 있어야 진행)
  const t = todayISO();
  if (state.soberStartDate) {
    const diff = daysBetween(state.soberStartDate, t) + 1;
    return clamp(diff, 1, 42);
  }
  // 시작일이 없으면 streak로 대체(기록 기반)
  const s = computeStreak(state.entries);
  return clamp(s === 0 ? 1 : s, 1, 42);
}

function phaseLabel(day) {
  if (day <= 7) return "적응";
  if (day <= 21) return "회복";
  if (day <= 42) return "강화";
  return "Day";
}

function render() {
  const state = loadState();

  const streak = computeStreak(state.entries);
  const day = programDay(state);

  document.getElementById("streak").textContent = String(streak);
  document.getElementById("day42").textContent = String(day);
  document.getElementById("statusText").textContent = statusTextForToday(state.entries);

  document.getElementById("phasePill").textContent = phaseLabel(day);
  document.getElementById("dayTitle").textContent = `오늘은 ${day}일차`;
  document.getElementById("dayEffect").textContent = effects42[day - 1] ?? effects42[0];

  document.getElementById("motivation").textContent = pickMotivation(state);

  const list = document.getElementById("logList");
  const recent = state.entries.slice(0, 10);
  if (recent.length === 0) {
    list.innerHTML = `<div class="small">아직 기록이 없어.</div>`;
  } else {
    list.innerHTML = recent.map(e => {
      const label = e.status === "sober" ? "0잔 ✅" : "음주 🍺";
      return `
        <div class="logline">
          <div>${e.date}</div>
          <div class="pill">${label}</div>
        </div>
      `;
    }).join("");
  }
}



  // 첫 금주 시작일 세팅 (처음으로 sober 찍는 날)
  if (!state.soberStartDate) state.soberStartDate = todayISO();

  upsertToday(state, "sober");
  render();
});

document.getElementById("btnDrank").addEventListener("click", () => {
  const state = loadState();

  upsertToday(state, "drank");

  // 프로그램 리셋
  state.soberStartDate = null;
  state.lineSeed = 0;
  saveState(state);

  render();
});

document.getElementById("btnNewLine").addEventListener("click", () => {
  const state = loadState();
  state.lineSeed = (state.lineSeed ?? 0) + 1;
  saveState(state);
  render();
});

render();

const startDateInput = document.getElementById("startDateInput");
if (startDateInput) {
  const state = loadState();
  if (state.soberStartDate) {
    startDateInput.value = state.soberStartDate;
  }

  startDateInput.addEventListener("change", (e) => {
    const newDate = e.target.value;
    const state = loadState();
    state.soberStartDate = newDate;
    saveState(state);
    render();
  });
}

