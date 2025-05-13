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
  'Session 1':'합성신약 일반 QnA',
  'Session 2':'방사성의약품 / 합성 펩타이드 치료제 QnA'
};

/*───────── Util ─────────*/
function $(sel, ctx = document){ return ctx.querySelector(sel); }
function api(params){
  const qs = new URLSearchParams(params).toString();
  return fetch(`${API_URL}?${qs}`).then(r => r.json());
}
function toast(msg){ alert(msg); }

/*───────── 연사 카드 렌더링 ─────────*/
function renderSpeakers(){
  EL.speakerWrap.innerHTML = '';
  speakers[curSession].forEach((sp, i) =>{
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
    card.addEventListener('click', () => speakerClick(sp.id, card));
    EL.speakerWrap.appendChild(card);
  });
  /* 첫 카드 자동 선택 */
  speakerClick(speakers[curSession][0].id, EL.speakerWrap.firstChild);
}

function speakerClick(id, card){
  curLecture = id;
  EL.speakerWrap.querySelectorAll('.speaker-card')
    .forEach(c => c.classList.toggle('inactive', c !== card));
  load();
}

/*───────── 질문 목록 ─────────*/

function load(){
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
       EL.nameInp.value=''; EL.qInp.value=''; load(false);
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
    card.querySelector('.likeCnt').textContent = r.like;

    if (r.reply){
      let rep = card.querySelector('.q-reply');
      if (!rep){                // 첫 답변이면 div 생성
        rep = document.createElement('div');
        rep.className = 'q-reply';
        card.querySelector('.q-body').appendChild(rep);
      }
      rep.textContent = `↳ ${r.reply}`;
    }
    return;                     // 끝
  }

  // 2) 새 카드 렌더
  renderQCard(r);
  shownIds.add(r.id);
}

// ───── 증분 폴링 함수 ─────
function poll(){
  api({ action:'list', session:curSession, lecture:curLecture, since:lastStamp })
    .then(res=>{\n lastStamp = res.serverTime
                
/*───────── 수정/삭제/좋아요/답변 ─────────*/
function editQ(item){
  openModal(item.q, txt=>{
    const next = txt.trim();
    if(!next || next===item.q) return;
    api({action:'edit',id:item.id,q:next}).then(()=>load(false));
  });
}
function delQ(id){
  if(!confirm('삭제하시겠습니까?')) return;
  api({action:'delete',id}).then(()=>load(false));
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
    api({action:'reply',id:item.id,text:r}).then(()=>load(false));
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
function poll(){\n api({ action:'list', session:curSession, lecture:curLecture, since:lastStamp })
  .then(res=>{\n lastStamp = res.serverTime

/*───────── 초기화 ─────────*/
function init(){
  Object.keys(sessionTitles).forEach(s=>{
    const opt = document.createElement('option'); opt.textContent = s; opt.value = s;
    EL.sessionSel.appendChild(opt);
  });
  /* Config 시트의 currentSession 값 가져와 기본 세션 설정 */
  api({action:'config'}).then(cfg=>{
    if(cfg.currentSession && sessionTitles[cfg.currentSession])
      curSession = cfg.currentSession;
    EL.sessionSel.value = curSession;
    EL.title.textContent = sessionTitles[curSession];
    renderSpeakers();
  });
}
init();
