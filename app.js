/*──────────────────────────────────────────
  QnA Front (GitHub Pages)  2025-05-**
──────────────────────────────────────────*/
const API_URL =
  'https://script.google.com/macros/s/AKfycbye7m5cCG1DoQKiYO0lo3AArPDvo8x8WVW0ZBYCt9CxJvFrqI0-un0ZBCsgWs8zyQ0Y/exec';

/* ------- Element refs (짧게) ------- */
const $  = (sel,ctx=document)=>ctx.querySelector(sel);
const EL = {
  sessionSel : $('#sessionSel'),
  title      : $('#sectionTitle'),
  speakerWrap: $('#speakerWrap'),
  qList      : $('#qList'),
  nameInp    : $('#inpName'),
  qInp       : $('#inpQ'),
  btnSubmit  : $('#btnSubmit'),
  modalBack  : $('#modalBack'),
  modal      : $('#modal'),
  mTextarea  : $('#mTextarea'),
  mOk        : $('#mOk'),
  mCancel    : $('#mCancel'),
};
const SPIN = $('#pageLoader');

/* ------- 상태 ------- */
let curSession   = 'Session 1';
let curLecture   = '';
let lastServerTs = 0;            // 증분용 서버타임
let pollTimer    = null;

let myLikes = JSON.parse(localStorage.getItem('likes')||'[]');
let myQs    = JSON.parse(localStorage.getItem('myQs')  ||'[]');
let modalCB = null;

/* ------- 세션 · 연사 ------- */
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

/* ------- 공통 fetch ------- */
function api(p){
  return fetch(API_URL + '?' + new URLSearchParams(p)).then(r=>r.json());
}

/*──────────────────────────────────────────
  1) 연사 카드
──────────────────────────────────────────*/
function renderSpeakers(){
  EL.speakerWrap.innerHTML='';
  speakers[curSession].forEach((sp,i)=>{
    const card=document.createElement('div');
    card.className='speaker-card';
    card.dataset.id=sp.id;
    card.innerHTML=`
      <div class="speaker-info">
        <img class="speaker-img" src="${sp.img}" alt="">
        <div>
          <div class="speaker-name">${sp.name}</div>
          <div class="speaker-title">${sp.org}</div>
        </div>
      </div>
      <div class="speaker-time">
        <div>${sp.time}</div><div>${sp.title}</div>
      </div>`;
    card.onclick=()=>speakerClick(sp.id,card);
    EL.speakerWrap.appendChild(card);
  });
  speakerClick(speakers[curSession][0].id, EL.speakerWrap.firstChild);
}

function speakerClick(id, card){
  curLecture=id;
  [...EL.speakerWrap.children].forEach(c=>c.classList.toggle('inactive',c!==card));
  firstLoad();
}

/*──────────────────────────────────────────
  2) 질문 목록 : 전체 1회 + 5 초 증분 폴링
──────────────────────────────────────────*/
function firstLoad(){         // 전체 1회
  clearInterval(pollingTimer); // 세션·강연 바뀔 때 기존 폴링 중단
  const loader=setTimeout(()=>EL.qList.innerHTML=
    '<p style="text-align:center;margin:60px 0;color:#666">질문을 불러오는 중…</p>',300);

  api({action:'list',session:curSession,lecture:curLecture})
    .then(res=>{
      clearTimeout(loader);
      SPIN.style.display='none';
      EL.qList.innerHTML='';
      res.rows.forEach(renderQCard);
      lastServerTs=res.serverTime||Date.now();
      startPolling();
    })
    .catch(e=>{
      SPIN.style.display='none';
      console.error(e);
      EL.qList.innerHTML='<p style="text-align:center;color:#f33">불러오기 실패</p>';
    });
}

function fetchDiff(){         // 변경분만
  api({action:'list',session:curSession,lecture:curLecture,since:lastServerTs})
    .then(res=>{
      if(res.rows?.length){
        lastServerTs=res.serverTime;
        res.rows.forEach(renderQCard);
      }
    })
    .catch(console.error);
}

function startPolling(){
  clearInterval(pollTimer);
  pollTimer=setInterval(fetchDiff,5000);
}

/*──────────────────────────────────────────
  3) 카드 렌더 + 액션
──────────────────────────────────────────*/
function renderQCard(item){
  const liked=myLikes.includes(item.id), own=myQs.includes(item.id);
  const li=document.createElement('div');
  li.className='q-card';
  li.innerHTML=`
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
        <button class="btn-edit"><img src="assets/icon-edit.svg"></button>
        <button class="btn-del"><img src="assets/icon-delete.svg"></button>`:''}
      <button class="btn-reply"><img src="assets/icon-reply.svg"></button>
    </div>`;
  li.querySelector('.q-heart').onclick   = ()=>toggleLike(li.querySelector('.q-heart'));
  if(own){
    li.querySelector('.btn-edit').onclick = ()=>editQ(item);
    li.querySelector('.btn-del').onclick  = ()=>delQ(item.id);
  }
  li.querySelector('.btn-reply').onclick = ()=>replyQ(item);
  EL.qList.appendChild(li);
}

/* edit / del / like / reply */
function editQ(it){ openModal(it.q, txt=>{
  const n=txt.trim(); if(!n||n===it.q) return;
  api({action:'edit',id:it.id,q:n}); });
}
function delQ(id){
  if(!confirm('삭제하시겠습니까?')) return;
  api({action:'delete',id});
}
function toggleLike(div){
  const id=div.dataset.id, liked=div.classList.contains('liked');
  api({action:'setlike',id,delta:liked?-1:1})
    .then(r=>{
      div.classList.toggle('liked');
      div.querySelector('span').textContent=r.like;
      div.querySelector('img').src=`assets/heart-${liked?'off':'on'}.svg`;
      liked? myLikes=myLikes.filter(v=>v!==id): myLikes.push(id);
      localStorage.setItem('likes',JSON.stringify(myLikes));
    });
}
function replyQ(it){ openModal('', txt=>{
  const r=txt.trim(); if(!r) return;
  api({action:'reply',id:it.id,text:r}); },'답변을 입력하세요'); }

/*──────────────────────────────────────────
  4)  모달
──────────────────────────────────────────*/
function openModal(val, cb, ph='내용을 입력하세요'){
  EL.mTextarea.value=val; EL.mTextarea.placeholder=ph; modalCB=cb;
  EL.modalBack.style.display='flex';
}
function closeModal(){ EL.modalBack.style.display='none'; modalCB=null; }
EL.mCancel.onclick=closeModal;
EL.modalBack.onclick=e=>{if(e.target===EL.modalBack)closeModal()};
EL.mOk.onclick=()=>{ modalCB?.(EL.mTextarea.value); closeModal(); };

/*──────────────────────────────────────────
  5)  질문 등록
──────────────────────────────────────────*/
EL.btnSubmit.onclick=()=>{
  const name=EL.nameInp.value.trim(), q=EL.qInp.value.trim();
  if(!q) return alert('질문을 입력해 주세요');
  EL.btnSubmit.disabled=true; EL.btnSubmit.classList.add('btn-loading'); SPIN.style.display='flex';
  api({action:'add',session:curSession,lecture:curLecture,name,q})
    .then(r=>{
      myQs.push(r.id); localStorage.setItem('myQs',JSON.stringify(myQs));
      EL.nameInp.value=''; EL.qInp.value=''; firstLoad();
    })
    .finally(()=>{EL.btnSubmit.disabled=false;EL.btnSubmit.classList.remove('btn-loading');SPIN.style.display='none';});
};

/*──────────────────────────────────────────
  6)  세션 선택 & 초기화
──────────────────────────────────────────*/
EL.sessionSel.onchange=()=>{
  curSession=EL.sessionSel.value;
  EL.title.textContent=sessionTitles[curSession];
  renderSpeakers();
};

function init(){
  Object.keys(sessionTitles).forEach(s=>{
    const o=document.createElement('option');o.value=o.textContent=s;EL.sessionSel.appendChild(o);
  });
  api({action:'config'}).then(cfg=>{
    if(cfg.currentSession&&sessionTitles[cfg.currentSession]) curSession=cfg.currentSession;
    EL.sessionSel.value=curSession;
    EL.title.textContent=sessionTitles[curSession];
    renderSpeakers();
  });
}
init();
