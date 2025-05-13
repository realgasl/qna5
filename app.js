/*──────────────────────────────────────────
  CMC QnA Front‑End (GitHub Pages) 2025‑05
  ─ 최소 수정: 깜빡임 없는 증분‑폴링, 기존 레이아웃 유지 ─
──────────────────────────────────────────*/

/* === 서버 엔드포인트 === */
const API_URL =
  'https://script.google.com/macros/s/AKfycbye7m5cCG1DoQKiYO0lo3AArPDvo8x8WVW0ZBYCt9CxJvFrqI0-un0ZBCsgWs8zyQ0Y/exec';

/* === DOM 헬퍼 & 참조 === */
const $ = (sel, ctx=document) => ctx.querySelector(sel);
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

/* === 상태 === */
let curSession = 'Session 1';
let curLecture = '';
let myLikes = JSON.parse(localStorage.getItem('likes') || '[]');
let myQs    = JSON.parse(localStorage.getItem('myQs')   || '[]');
let lastStamp = 0;                      // 증분 로딩 기준 시각(ms)
const shownIds = new Set();             // 화면에 있는 질문 id
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
  'Session 1':'합성신약 일반 QnA',
  'Session 2':'방사성의약품 / 합성 펩타이드 치료제 QnA'
};

/*───────── API 헬퍼 ─────────*/
function api(params){
  const qs = new URLSearchParams(params).toString();
  return fetch(`${API_URL}?${qs}`).then(r=>r.json());
}
function toast(msg){ alert(msg); }

/*───────── 연사 카드 렌더링 ─────────*/
function renderSpeakers(){
  EL.speakerWrap.innerHTML = '';
  speakers[curSession].forEach(sp=>{
    const card = document.createElement('div');
    card.className = 'speaker-card';
    card.dataset.id = sp.id;
    card.innerHTML = `
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
    card.addEventListener('click', ()=>speakerClick(sp.id, card));
    EL.speakerWrap.appendChild(card);
  });
  // 첫 카드 선택
  speakerClick(speakers[curSession][0].id, EL.speakerWrap.firstChild);
}
function speakerClick(id, card){
  curLecture = id;
  EL.speakerWrap.querySelectorAll('.speaker-card')
    .forEach(c=>c.classList.toggle('inactive', c!==card));
  loadFull();
}

/*───────── 질문 목록 ─────────*/
function loadFull(){
  EL.qList.innerHTML = '<p class="info">질문을 불러오는 중…</p>';

  api({action:'list', session:curSession, lecture:curLecture})
    .then(res=>{
      const rows = res.rows||[];
      lastStamp  = res.serverTime || Date.now();
      shownIds.clear();

      if(!rows.length){
        EL.qList.innerHTML = '<p class="info">등록된 질문이 없습니다.</p>';
        return;
      }
      EL.qList.innerHTML='';
      rows.forEach(renderQCard);
    })
    .catch(()=>{ EL.qList.innerHTML='<p class="err">불러오기 실패</p>'; });
}

/* 카드 렌더링 */
function renderQCard(item){
  const liked = myLikes.includes(item.id),
        own   = myQs.includes(item.id);
  const li = document.createElement('div');
  li.className = 'q-card';
  li.dataset.id = item.id;
  li.innerHTML = `
    <div class="q-heart ${liked?'liked':''}" data-id="${item.id}">
      <img src="assets/heart-${liked?'on':'off'}.svg" alt="heart">
      <span class="likeCnt">${item.like}</span>
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

/* 카드 업데이트(증분) */
function addOrUpdateCard(r){
  const card = document.querySelector(`[data-id="${r.id}"]`);
  if(card){
    card.querySelector('.likeCnt').textContent = r.like;
    if(r.reply){
      const repEl = card.querySelector('.q-reply');
      if(repEl) repEl.textContent = `↳ ${r.reply}`;
    }
    return;
  }
  renderQCard(r);
  shownIds.add(r.id);
}

/*───────── Poll (5s) ─────────*/
function poll(){
  api({action:'list', session:curSession, lecture:curLecture, since:lastStamp})
    .then(res=>{
      lastStamp = res.serverTime || lastStamp;
      (res.rows||[]).forEach(addOrUpdateCard);
    });
}

/*───────── 질문 등록 ─────────*/
EL.btnSubmit.addEventListener('click', ()=>{
  const name = EL.nameInp.value.trim();
  const q    = EL.qInp.value.trim();
  if(!q){ toast('질문을 입력해 주세요'); return; }

  EL.btnSubmit.disabled = true;
  api({action:'add', session:curSession, lecture:curLecture, name, q})
    .then(res=>{
      myQs.push(res.id);
      localStorage.setItem('myQs', JSON.stringify(myQs));
      EL.nameInp.value=''; EL.qInp.value='';
      loadFull();
    })
    .finally(()=>{ EL.btnSubmit.disabled = false; });
});

/*───────── 수정/삭제/좋아요/답변 ─────────*/
function editQ(item){
  openModal(item.q, txt=>{
    const next = txt.trim();
    if(!next || next===item.q) return;
    api({action:'edit', id:item.id, q:next}).then(()=>loadFull());
  });
}
function delQ(id){
  if(!confirm('삭제하시겠습니까?')) return;
  api({action:'delete', id}).then(()=>loadFull());
}
function toggleLike(div){
  const id = div.dataset.id;
  const liked = div.classList.contains('liked');
  api({action:'setlike', id, delta: liked?-1:1}).then(res=>{
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
    api({action:'reply', id:item.id, text:r}).then(()=>loadFull());
