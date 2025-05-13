/*──────────────────────────────────────────── CMC Q&A Front (2025‑05) ─────────────────────────────────────────────
   깜빡임 없는 증분‑폴링 버전 (리팩터링 없음, 기존 구조 유지)                                                   */

/* === 서버 엔드포인트 === */
const API_URL = 'https://script.google.com/macros/s/AKfycbye7m5cCG1DoQKiYO0lo3AArPDvo8x8WVW0ZBYCt9CxJvFrqI0-un0ZBCsgWs8zyQ0Y/exec';

/* === DOM 엘리먼트 === */
const EL = {
  sessionSel : document.getElementById('sessionSel'),  // <select> 세션
  lectureSel : document.getElementById('lectureSel'),  // <select> 강의
  qList      : document.getElementById('qList'),       // 질문 카드 컨테이너
  nameInp    : document.getElementById('nameInp'),
  qInp       : document.getElementById('qInp'),
  submitBtn  : document.getElementById('submitBtn')
};

/* === 상태 === */
let curSession = 'Session 1';
let curLecture = 'Lecture A';

let lastStamp  = 0;             // 서버가 마지막으로 내려준 시간(ms)
const shownIds = new Set();     // 현재 화면에 표시 중인 질문 id 집합

/* ───────────────────────────── Ajax 헬퍼 ───────────────────────────── */
function api(params){
  const qs = new URLSearchParams(params).toString();
  return fetch(`${API_URL}?${qs}`)
          .then(r=>r.json());
}

/* ───────────────────────────── 렌더 ───────────────────────────── */
function renderQCard(item){
  const card = document.createElement('div');
  card.className = 'qCard';
  card.dataset.id = item.id;
  card.innerHTML = `
    <div class="meta">
      <span class="name">${item.name}</span>
      <span class="like">👍 <span class="likeCnt">${item.like}</span></span>
    </div>
    <p class="q">${item.q}</p>
    <div class="reply">${item.reply || ''}</div>`;
  EL.qList.appendChild(card);
}

/* ─────────────────────────── 최초 전체 로드 ─────────────────────────── */
function loadFull(){
  EL.qList.innerHTML = '<p class="info">질문을 불러오는 중…</p>';

  api({ action:'list', session:curSession, lecture:curLecture })
    .then(res=>{
      const rows = res.rows || [];
      lastStamp  = res.serverTime || Date.now();
      shownIds.clear();

      if(!rows.length){
        EL.qList.innerHTML = '<p class="info">등록된 질문이 없습니다.</p>';
        return;
      }

      EL.qList.innerHTML = '';
      rows.forEach(r=>{ renderQCard(r); shownIds.add(r.id); });
    })
    .catch(()=>{
      EL.qList.innerHTML = '<p class="err">불러오기 실패</p>';
    });
}

/* ──────────────────────── 증분 수신 & 화면 반영 ──────────────────────── */
function addOrUpdateCard(r){
  const card = document.querySelector(`[data-id="${r.id}"]`);
  if(card){                     // 이미 존재 → 값만 갱신
    card.querySelector('.likeCnt').textContent = r.like;
    if(r.reply) card.querySelector('.reply').textContent = r.reply;
    return;
  }
  // 새 질문
  renderQCard(r);
  shownIds.add(r.id);
}

function poll(){
  api({ action:'list', session:curSession, lecture:curLecture, since:lastStamp })
    .then(res=>{
      lastStamp = res.serverTime || lastStamp;
      (res.rows || []).forEach(addOrUpdateCard);
    });
}

/* ───────────────────────────── 초기화 ───────────────────────────── */
function init(){
  // 필요한 경우 세션/강의 <select> 값 변경 핸들러 연결
  loadFull();
  setInterval(poll, 5000);               // 5초 주기로 증분 갱신
}

document.addEventListener('DOMContentLoaded', init);
