/*──────────────────────────────────────────
  QnA Front  (GitHub Pages)  2025-05-**
──────────────────────────────────────────*/

const API_URL =
  'https://script.google.com/macros/s/AKfycbye7m5cCG1DoQKiYO0lo3AArPDvo8x8WVW0ZBYCt9CxJvFrqI0-un0ZBCsgWs8zyQ0Y/exec';

/* === Element refs === */
const EL = {
  sessionSel : $('#sessionSel'),
  title      : $('#sectionTitle'),
  speakerWrap: $('#speakerWrap'),
  qList      : $('#qList'),
  nameInp    : $('#inpName'),
  qInp       : $('#inpQ'),
  btnSubmit  : $('#btnSubmit'),
  /* modal */
  modalBack  : $('#modalBack'),
  modalArea  : $('#modal'),
  mTextarea  : $('#mTextarea'),
  mOk        : $('#mOk'),
  mCancel    : $('#mCancel'),
};

setInterval(poll, 5000); // ← ③ 5초 증분 폴링

let curSession = 'Session 1';
let curLecture = '';
let myLikes = JSON.parse(localStorage.getItem('likes') || '[]');
let myQs    = JSON.parse(localStorage.getItem('myQs')   || '[]');
/* 폴링용 */
let lastStamp = 0; // 마지막 서버 시각(ms)
const shownIds = new Set(); // 화면에 있는 질문 id
let modalCB = null;

/*───────── 세션 · 연사 데이터 ─────────*/
const speakers = {
  'Session 1': [
    { id:'Lecture A', img:'assets/speaker-01.webp', name:'김무성 상무', org:'CMG제약',
      time:'10:30 - 11:00', title:'유전독성(ICH M7) 불순물 관리/허가 전략' },
    { id:'Lecture B', img:'assets/speaker-02.webp', name:'이용문 교수', org:'충북대 약대',
      time:'11:00 - 11:30', title:'신규 N-Nitrosamines 관리전략' }
  ],
  'Session 2': [
    { id:'Lecture C', img:'assets/speaker-03.webp', name:'박찬수 이사', org:'퓨처켐',
      time:'13:00 - 13:30', title:'방사성의약품 개발 시 CMC 주요 고려사항' },
    { id:'Lecture D', img:'assets/speaker-04.webp', name:'최희경 상무', org:'지투지바이오',
      time:'13:30 - 14:00', title:'합성펩타이드 의약품 연구개발 관련 CMC 고려사항' }
  ]
};
const sessionTitles = {
  'Session 1':'합성신약 일반 Q&A',
  'Session 2':'방사성의약품 / 합성 펩타이드 치료제 Q&A'
};

/*───────── Util ─────────*/
function $(sel, ctx = document){ return ctx.querySelector(sel); }
function api(params){
  const qs = new URLSearchParams(params).toString();
  return fetch(`${API_URL}?${qs}`).then(r => r.json());
}
function toast(msg){ alert(msg); }

/**
 * 연사 카드 클릭 핸들러
 *  - curLecture 설정
 *  - 다른 카드는 비활성화
 *  - loadFull() 호출하여 질문 리스트 로드
 */
function speakerClick(id, card){
  curLecture = id;
  EL.speakerWrap
    .querySelectorAll('.speaker-card')
    .forEach(c => c.classList.toggle('inactive', c !== card));
  loadFull();
}

/*───────── 연사 카드 렌더링 ─────────*/
function renderSpeakers(){
  // 1) 연사 컨테이너 비우기
  EL.speakerWrap.innerHTML = '';

  // 2) speakers[curSession]이 배열이 맞다면 바로 forEach
  (Array.isArray(speakers[curSession]) ? speakers[curSession] : [])
    .forEach(sp => {
      const card = document.createElement('div');
      card.className       = 'speaker-card';
      card.dataset.id      = sp.id;         // Lecture A, B, C...
      card.dataset.lecture = sp.lecture;    // Lecture 명시
      card.dataset.talk= sp.title;          // ← 여기에 추가
      card.innerHTML       = `
        <div class="speaker-info">
          <img class="speaker-img" src="${sp.img}" alt="">
          <div>
            <div class="speaker-name">${sp.name}</div>
            <div class="speaker-title">${sp.org}</div>
          </div>
        </div>
        <div class="speaker-time">
          <div>${sp.time}</div>
          <div>${sp.title}</div>
        </div>`;
      card.addEventListener('click', () => speakerClick(sp.id, card));
      EL.speakerWrap.appendChild(card);
    });

  // 3) “첫 카드” 자동 클릭 → speakerClick 내부에서 loadFull 호출
  const first = EL.speakerWrap.querySelector('.speaker-card');
  if (first) first.click();
}

/* ───── 질문 리스트 전체 1회 로딩 ───── */
function loadFull(){

  if (!curLecture){
    const list = Array.isArray(speakers[curSession])
               ? speakers[curSession]
               : Object.values(speakers[curSession]);
 if (list.length){
   curLecture = list[0].lecture;
    } else {
      return;                                // 데이터 자체가 없으면 그냥 종료
    }
  }
  api({ action:'list', session:curSession, lecture:curLecture })
    .then(res=>{
      lastStamp = res.serverTime || Date.now();
      shownIds.clear();
      EL.qList.innerHTML = '';                     // 리스트 영역 비우기
      (res.rows || []).forEach(r=>{                // 전체 카드 렌더
        renderQCard(r);
        shownIds.add(r.id);
      });
      if(!res.rows?.length){
        EL.qList.innerHTML = '<p class="info">등록된 질문이 없습니다.</p>';
      }
    });
}

/*───────── 질문 목록 ─────────*/

/*function load(){
  EL.qList.innerHTML = '<p class="info">질문을 불러오는 중…</p>';

  api({ action:'list', session:curSession, lecture:curLecture })
    .then(res => {
      const rows = res.rows || [];          // ← 핵심
      if (!rows.length){
        EL.qList.innerHTML = '<p class="info">등록된 질문이 없습니다.</p>';
        return;
      }
      EL.qList.innerHTML = '';
      rows.forEach(renderQCard);
    })
    .catch(()=>{ EL.qList.innerHTML = '<p class="err">불러오기 실패</p>'; });
}

/*function load(showErr){
  EL.qList.innerHTML =
    '<p style="text-align:center;margin:60px 0;color:#666">질문을 불러오는 중…</p>';
  api({action:'list',session:curSession,lecture:curLecture})
    .then(rows =>{
      if(!rows.length){
        EL.qList.innerHTML =
          '<p style="text-align:center;margin:60px 0;color:#888">등록된 질문이 없습니다.</p>';
        return;
      }
      EL.qList.innerHTML = '';
      rows.forEach(renderQCard);
    })
    .catch(()=>{ if(showErr!==false) EL.qList.innerHTML =
      '<p style="text-align:center;color:#f33">불러오기 실패</p>';});
}*/

/* 🖤→ 하트 IMG & reply 포함  */
function renderQCard(item){
  const liked = myLikes.includes(item.id),
        own   = myQs.includes(item.id);

  const li = document.createElement('div');
  li.className = 'q-card';
  li.dataset.id = item.id;
  li.innerHTML = `
    <div class="q-heart ${liked?'liked':''}" data-id="${item.id}">
      <img src="assets/heart-${liked?'on':'off'}.svg" alt="">
      <span>${item.like}</span>
    </div>
    <div class="q-body">
      <div class="q-name">${item.name||'익명'}</div>
      <div class="q-text">${item.q}</div>
      ${item.reply?`<div class="q-reply">↳ ${item.reply}</div>`:''}
    </div>
    <div class="q-actions">
      ${own?`
        <button class="btn-edit"><img src="assets/icon-edit.svg" alt="edit"></button>
        <button class="btn-del"><img src="assets/icon-delete.svg" alt="del"></button>`:''}
      <button class="btn-reply"><img src="assets/icon-reply.svg" alt="reply"></button>
    </div>`;

  li.querySelector('.q-heart').onclick = ()=>toggleLike(li.querySelector('.q-heart'));
  if(own){
    li.querySelector('.btn-edit').onclick = ()=>editQ(item);
    li.querySelector('.btn-del').onclick  = ()=>delQ(item.id);
  }
  li.querySelector('.btn-reply').onclick = ()=>replyQ(item);
  EL.qList.appendChild(li);
}

/*───────── 질문 등록 ─────────*/
EL.btnSubmit.addEventListener('click', ()=>{
  const name = EL.nameInp.value.trim(),
        q    = EL.qInp.value.trim();
  if(!q){ toast('질문을 입력해 주세요'); return; }

  EL.btnSubmit.classList.add('btn-loading');
  EL.btnSubmit.disabled = true;

  api({action:'add',session:curSession,lecture:curLecture,name,q})
     .then(res =>{
       myQs.push(res.id);
       localStorage.setItem('myQs', JSON.stringify(myQs));
       EL.nameInp.value=''; EL.qInp.value=''; loadFull();
     })
     .finally(()=>{
       EL.btnSubmit.classList.remove('btn-loading');
       EL.btnSubmit.disabled = false;
     });
});
/*──────── 카드 증분 처리 ────────*/
function addOrUpdateCard(r){
  // 1) 이미 화면에 있는 카드 찾기
  const card = document.querySelector(`[data-id="${r.id}"]`);
  if (card){                    // 🚩 존재 → 숫자/답변만 갱신
// — 질문 텍스트 변경 반영 —
    const txt = card.querySelector('.q-text');
    if(txt && txt.textContent !== r.q) {
      txt.textContent = r.q;
    }
// — 좋아요 변경 반영 —
    const likeSpan = card.querySelector('.q-heart span');
    if(likeSpan && likeSpan.textContent !== String(r.like)) {
      likeSpan.textContent = r.like;
    }
/* const heart = card.querySelector('.q-heart');
if (heart) heart.querySelector('span').textContent = r.like;*/
    // — 작성자 변경 반영 (선택) —
    const who = card.querySelector('.q-name');
    if(who && who.textContent !== r.name) {
      who.textContent = r.name;
    }
    // — 답글 변경 반영 —
     if(r.reply){
       let rep = card.querySelector('.q-reply');
       if(!rep){
         rep = document.createElement('div');
         rep.className = 'q-reply';
         card.querySelector('.q-body').appendChild(rep);
       }
       if(rep.textContent !== `↳ ${r.reply}`) {
         rep.textContent = `↳ ${r.reply}`;
       }
     }
    return;                     // 끝
  }

  // 2) 새 카드 렌더
  renderQCard(r);
  shownIds.add(r.id);
}

// ───── 증분 폴링 함수 ─────
function poll(){
  api({ action:'list', session:curSession, lecture:curLecture,
       //since:lastStamp
       })
    .then(res=>{
      lastStamp = res.serverTime || lastStamp;

// 1) 서버에 아직 남아 있는 질문 ID 집합
      const serverIds = new Set((res.rows||[]).map(r=>r.id));

// 2) 화면에 있으나 서버에는 없는 ID를 shownIds에서 걸러서 제거
    for(const id of Array.from(shownIds)){
      if(!serverIds.has(id)){
        // 2-1) DOM에서 지우기
        const card = document.querySelector(`.q-card[data-id="${id}"]`);
        if(card) card.remove();
        // 2-2) shownIds에서도 삭제
        shownIds.delete(id);
      }
    }
      (res.rows||[]).forEach(addOrUpdateCard);
       });                 // ← ① then() 닫기
}                     // ← ② poll 함수 닫기
                
/*───────── 수정/삭제/좋아요/답변 ─────────*/
function editQ(item){
  openModal(item.q, txt=>{
    const next = txt.trim();
    if(!next || next===item.q) return;
    api({action:'edit',id:item.id,q:next}).then(()=>loadFull());
  });
}
function delQ(id){
  if(!confirm('삭제하시겠습니까?')) return;
  api({action:'delete',id}).then(()=>loadFull());
}
function toggleLike(div){
  const id = div.dataset.id,
        liked = div.classList.contains('liked');
  api({action:'setlike',id,delta:liked?-1:1}).then(res=>{
    div.classList.toggle('liked');
    div.querySelector('span').textContent = res.like;
    div.querySelector('img').src = `assets/heart-${liked?'off':'on'}.svg`;
    if(liked) myLikes = myLikes.filter(v=>v!==id); else myLikes.push(id);
    localStorage.setItem('likes', JSON.stringify(myLikes));
  });
}
function replyQ(item){
  openModal('', txt=>{
    const r = txt.trim(); if(!r) return;
    api({action:'reply',id:item.id,text:r}).then(()=>loadFull());
  }, '답변을 입력하세요');
}

/*───────── 모달 ─────────*/
function openModal(val, cb, ph='내용을 입력하세요'){
  EL.mTextarea.value = val;
  EL.mTextarea.placeholder = ph;
  modalCB = cb;
  EL.modalBack.style.display = 'flex';
}
EL.mCancel.onclick = closeModal;
EL.modalBack.addEventListener('click', e=>{
  if(e.target === EL.modalBack) closeModal();
});
EL.mOk.onclick = ()=>{ if(modalCB) modalCB(EL.mTextarea.value); closeModal(); };
function closeModal(){ EL.modalBack.style.display='none'; modalCB=null; }

/*───────── 세션 셀렉터 ─────────*/
EL.sessionSel.addEventListener('change', ()=>{
  curSession = EL.sessionSel.value;
  EL.title.textContent = sessionTitles[curSession];
  renderSpeakers();
});

/*───────── 주기적 폴링 (5 초) ─────────*/
/*function poll(){
  api({ action:'list', session:curSession, lecture:curLecture, since:lastStamp })
  .then(res=>{
    lastStamp = res.serverTime

/*────────── 초기화 ──────────*/
function init(){
  /* 1. 세션 드롭다운 */
  Object.keys(sessionTitles).forEach(s=>{
    const opt = document.createElement('option');
    opt.textContent = s;
    opt.value      = s;
    EL.sessionSel.appendChild(opt);
  });

  /* 2. Config 시트로 기본 세션 결정 */
  api({action:'config'}).then(cfg=>{
    if (cfg.currentSession && sessionTitles[cfg.currentSession]){
      curSession           = cfg.currentSession;           // ex) 'Session 1'
      EL.sessionSel.value  = curSession;
      EL.title.textContent = sessionTitles[curSession];
    } else {
      curSession           = Object.keys(sessionTitles)[0]; // 폴백
      EL.sessionSel.value  = curSession;
      EL.title.textContent = sessionTitles[curSession];
    }

    /* 3. 연사 카드 DOM 생성 */
    renderSpeakers();

    /* 4. 첫 카드 click → speakerClick 내부에서 loadFull 호출 */
    const first = EL.speakerWrap.querySelector('.speaker-card');
    if (first){
      const id = first.dataset.id;
      curLecture = first.dataset.lecture;   // 안전용
      first.click();                        // speakerClick(id, first) 실행
    }
  });
}
init();
