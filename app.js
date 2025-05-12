/*──────────────────  app.js  ──────────────────*/
const API_URL = 'https://script.google.com/macros/s/AKfycbye7m5cCG1DoQKiYO0lo3AArPDvo8x8WVW0ZBYCt9CxJvFrqI0-un0ZBCsgWs8zyQ0Y/exec';   // 예: https://script.google.com/macros/s/AKfyc.../exec

/* ------- DOM ------- */
const $ = s => document.querySelector(s);
const EL = {
  sessionSel : $('#sessionSel'),
  title      : $('#sectionTitle'),
  speakerWrap: $('#speakerWrap'),
  qList      : $('#qList'),
  nameInp    : $('#inpName'),
  qInp       : $('#inpQ'),
  btnSubmit  : $('#btnSubmit'),
  /* modal */
  mBack  : $('#modalBack'),
  mArea  : $('#modal'),
  mTxt   : $('#mTextarea'),
  mOk    : $('#mOk'),
  mCancel: $('#mCancel')
};
let modalCB=null;

/* ------- data ------- */
let curSession='Session 1', curLecture='';
let myLikes=JSON.parse(localStorage.getItem('likes')||'[]');
let myQs   =JSON.parse(localStorage.getItem('myQs')  ||'[]');

const sessions={
  'Session 1':[
    {id:'Lecture A',img:'assets/speaker-01.webp',name:'김무성 상무',org:'CMG제약',time:'10:30 - 11:00',title:'유전독성(ICH M7) 불순물 관리/허가 전략'},
    {id:'Lecture B',img:'assets/speaker-02.webp',name:'이용문 교수',org:'충북대 약대',time:'11:00 - 11:30',title:'신규 N-Nitrosamines 관리전략'}
  ],
  'Session 2':[
    {id:'Lecture C',img:'assets/speaker-03.webp',name:'박찬수 이사',org:'퓨처캠',time:'13:00 - 13:30',title:'방사성의약품 CMC 고려사항'},
    {id:'Lecture D',img:'assets/speaker-04.webp',name:'최희경 상무',org:'지투지바이오',time:'13:30 - 14:00',title:'합성펩타이드 CMC 고려사항'}
  ]
};
const sessionTitles={
  'Session 1':'합성신약 일반 QnA',
  'Session 2':'방사성의약품 / 합성 펩타이드 치료제 QnA'
};

/* ------- util ------- */
function qs(p){return new URLSearchParams(p).toString();}
function api(p){return fetch(`${API_URL}?${qs(p)}`).then(r=>r.json());}

/* ------- speaker render ------- */
function renderSpeakers(){
  EL.speakerWrap.innerHTML='';
  sessions[curSession].forEach((sp,idx)=>{
    const c=document.createElement('div');c.className='speaker-card';c.dataset.id=sp.id;
    c.innerHTML=`
      <div class="speaker-info">
        <img src="${sp.img}" class="speaker-img" alt="">
        <div><div class="speaker-name">${sp.name}</div><div class="speaker-title">${sp.org}</div></div>
      </div>
      <div class="speaker-time"><div>${sp.time}</div><div>${sp.title}</div></div>`;
    c.onclick=()=>selectSpeaker(sp.id,c);
    EL.speakerWrap.appendChild(c);
    if(idx===0) selectSpeaker(sp.id,c);
  });
}
function selectSpeaker(id,card){
  curLecture=id;
  [...EL.speakerWrap.children].forEach(e=>e.classList.toggle('inactive',e!==card));
  load();
}

/* ------- load Qs ------- */
function load(){
  EL.qList.innerHTML='<p style="text-align:center;color:#666">질문을 불러오는 중…</p>';
  api({action:'list',session:curSession,lecture:curLecture}).then(arr=>{
    if(!arr.length){EL.qList.innerHTML='<p style="text-align:center;color:#888">등록된 질문이 없습니다.</p>';return;}
    EL.qList.innerHTML='';arr.forEach(renderCard);
  }).catch(()=>EL.qList.innerHTML='<p style="text-align:center;color:#f33">불러오기 실패</p>');
}
function svg(href){return `<svg><use href="${href}#icon"/></svg>`;}
function renderCard(it){
  const liked=myLikes.includes(it.id), own=myQs.includes(it.id);
  const div=document.createElement('div');div.className='q-card';
  div.innerHTML=`
    <div class="q-heart ${liked?'liked':''}" data-id="${it.id}">
      ${svg(`assets/heart-${liked?'on':'off'}.svg`)}<span>${it.like}</span>
    </div>
    <div class="q-body">
      <div class="q-name">${it.name||'익명'}</div>
      <div class="q-text">${it.q}</div>
      ${it.reply?`<div class="q-reply">↳ ${it.reply}</div>`:''}
    </div>
    <div class="q-actions">
      ${own?`<button class="btn-edit">${svg('assets/icon-edit.svg')}</button>
             <button class="btn-del">${svg('assets/icon-delete.svg')}</button>`:''}
      <button class="btn-reply">${svg('assets/icon-reply.svg')}</button>
    </div>`;
  /* events */
  div.querySelector('.q-heart').onclick=()=>likeToggle(div.querySelector('.q-heart'));
  if(own){
    div.querySelector('.btn-edit').onclick=()=>openModal(it.q,txt=>{if(txt.trim())api({action:'edit',id:it.id,q:txt}).then(load);});
    div.querySelector('.btn-del').onclick=()=>{if(confirm('삭제?'))api({action:'delete',id:it.id}).then(load);};
  }
  div.querySelector('.btn-reply').onclick=()=>openModal('',txt=>{if(txt.trim())api({action:'reply',id:it.id,text:txt}).then(load);},'답변을 입력하세요');
  EL.qList.appendChild(div);
}

/* ------- like ------- */
function likeToggle(el){
  const id=el.dataset.id, liked=el.classList.contains('liked');
  api({action:'setlike',id,delta:liked?-1:1}).then(r=>{
    el.classList.toggle('liked');el.querySelector('span').textContent=r.like;
    el.querySelector('use').setAttribute('href',`assets/heart-${liked?'off':'on'}.svg#icon`);
    if(liked)myLikes=myLikes.filter(v=>v!==id); else myLikes.push(id);
    localStorage.setItem('likes',JSON.stringify(myLikes));
  });
}

/* ------- add Q ------- */
EL.btnSubmit.onclick=()=>{
  const q=EL.qInp.value.trim(); if(!q){alert('질문 입력');return;}
  EL.btnSubmit.disabled=true;
  api({action:'add',session:curSession,lecture:curLecture,name:EL.nameInp.value,q})
    .then(r=>{myQs.push(r.id);localStorage.setItem('myQs',JSON.stringify(myQs));EL.qInp.value='';load();})
    .finally(()=>EL.btnSubmit.disabled=false);
};

/* ------- modal ------- */
function openModal(val,cb,ph='내용을 입력'){
  EL.mTxt.value=val;EL.mTxt.placeholder=ph;modalCB=cb;EL.mBack.style.display='flex';
}
EL.mCancel.onclick=closeModal;EL.mBack.onclick=e=>{if(e.target===EL.mBack)closeModal()};
function closeModal(){EL.mBack.style.display='none';}
EL.mOk.onclick=()=>{if(modalCB)modalCB(EL.mTxt.value);closeModal()};

/* ------- session select ------- */
Object.keys(sessions).forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;EL.sessionSel.appendChild(o);});
EL.sessionSel.onchange=()=>{curSession=EL.sessionSel.value;EL.title.textContent=sessionTitles[curSession];renderSpeakers();};

/* ------- init ------- */
EL.title.textContent=sessionTitles[curSession];
renderSpeakers();
