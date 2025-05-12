/*──────────────────────────────────────────
  QnA front - 2025-05-**   (app.js)
──────────────────────────────────────────*/

const API_URL = 'https://script.google.com/macros/s/AKfycbye7m5cCG1DoQKiYO0lo3AArPDvo8x8WVW0ZBYCt9CxJvFrqI0-un0ZBCsgWs8zyQ0Y/exec';      // 끝에 /exec 까지
const EL = {
  sessionSel : document.getElementById('sessionSel'),
  title      : document.getElementById('sectionTitle'),
  speakerWrap: document.getElementById('speakerWrap'),
  qList      : document.getElementById('qList'),
  nameInp    : document.getElementById('inpName'),
  qInp       : document.getElementById('inpQ'),
  btnSubmit  : document.getElementById('btnSubmit'),
  modalBack  : document.getElementById('modalBack'),
  modalArea  : document.getElementById('modal'),
  mTextarea  : document.getElementById('mTextarea'),
  mOk        : document.getElementById('mOk'),
  mCancel    : document.getElementById('mCancel'),
};
let curSession = 'Session 1';
let curLecture = '';          // ex) 'Lecture A'
let myLikes = JSON.parse(localStorage.getItem('likes')||'[]');
let myQs    = JSON.parse(localStorage.getItem('myQs') ||'[]');
let modalCB = null;

/* ───────── 세션·연사 데이터 ───────── */
/* id 값은 스프레드시트 Lecture 열의 값과 1:1 대응해야 함 */
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

/* ───────── Util ───────── */
const $ = (sel, ctx=document)=>ctx.querySelector(sel);
function api(params){
  const qs = new URLSearchParams(params).toString();
  return fetch(`${API_URL}?${qs}`).then(r=>r.json());
}
function showToast(msg){
  alert(msg);            // 간단한 얼럿 토스트
}

/* ───────── 연사 카드 렌더링 ───────── */
function renderSpeakers(){
  EL.speakerWrap.innerHTML = '';
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
        <div>${sp.time}</div>
        <div>${sp.title}</div>
      </div>`;
    card.addEventListener('click',()=>speakerClick(sp.id, card));
    EL.speakerWrap.appendChild(card);
  });
  // 기본 첫 연사 선택
  speakerClick(speakers[curSession][0].id, EL.speakerWrap.firstChild);
}

/* 클릭해서 활성화 */
function speakerClick(id, cardEl){
  curLecture=id;
  EL.speakerWrap.querySelectorAll('.speaker-card').forEach(c=>{
    c.classList.toggle('inactive', c!==cardEl);
  });
  load();
}

/* ───────── 질문 목록 로드 ───────── */
function load(){
  EL.qList.innerHTML='<p style="text-align:center;margin:60px 0;color:#666">질문을 불러오는 중…</p>';
  api({ action:'list', session:curSession, lecture:curLecture })
    .then(data=>{
      if(!data.length){
        EL.qList.innerHTML='<p style="text-align:center;margin:60px 0;color:#888">등록된 질문이 없습니다.</p>';return;
      }
      EL.qList.innerHTML='';
      data.forEach(renderQCard);
    })
    .catch(()=>{EL.qList.innerHTML='<p style="text-align:center;color:#f33">불러오기 실패</p>';});
}

/* 질문 카드 한 개 그리기 */
function renderQCard(item){
  const liked = myLikes.includes(item.id);
  const own   = myQs.includes(item.id);

  const li = document.createElement('div');
  li.className = 'q-card';

  li.innerHTML = `
    <div class="q-heart ${liked ? 'liked' : ''}" data-id="${item.id}">
      <img src="assets/heart-${liked ? 'on' : 'off'}.svg" alt="">
      <span>${item.like}</span>
    </div>

    <div class="q-body">
      <div class="q-name">${item.name || '익명'}</div>
      <div class="q-text">${item.q}</div>
      ${item.reply ? '<div class="q-reply">↳ ' + item.reply + '</div>' : ''}
    </div>

    <div class="q-actions">
      ${own ? '<button class="btn-edit"><img src="assets/icon-edit.svg" alt="edit"></button>' : ''}
      ${own ? '<button class="btn-del"><img src="assets/icon-delete.svg" alt="del"></button>' : ''}
      <button class="btn-reply"><img src="assets/icon-reply.svg"  alt="reply"></button>
    </div>
  `;

  // …(나머지 이벤트 바인딩 동일)
}

  /* 이벤트 연결 */
  li.querySelector('.q-heart').onclick = ()=>toggleLike(li.querySelector('.q-heart'));
  if(own){
    li.querySelector('.btn-edit').onclick = ()=>editQ(item);
    li.querySelector('.btn-del').onclick  = ()=>delQ(item.id);
  }
  li.querySelector('.btn-reply').onclick = ()=>replyQ(item);
  EL.qList.appendChild(li);
}

/* ───────── 질문 등록 ───────── */
EL.btnSubmit.addEventListener('click',()=>{
  const name=EL.nameInp.value.trim(), q=EL.qInp.value.trim();
  if(!q){showToast('질문을 입력해 주세요');return;}
  EL.btnSubmit.disabled=true;
  api({action:'add',session:curSession,lecture:curLecture,name,q})
     .then(res=>{
       myQs.push(res.id);localStorage.setItem('myQs',JSON.stringify(myQs));
       EL.nameInp.value='';EL.qInp.value='';load();
     })
     .finally(()=>EL.btnSubmit.disabled=false);
});

/* ───────── 수정 / 삭제 / 좋아요 / 답변 ───────── */
function editQ(item){
  openModal(item.q, txt=>{
    const next=txt.trim();if(!next||next===item.q)return;
    api({action:'edit',id:item.id,q:next}).then(load);
  });
}
function delQ(id){
  if(!confirm('삭제하시겠습니까?'))return;
  api({action:'delete',id}).then(load);
}
function toggleLike(div){
  const id=div.dataset.id, liked=div.classList.contains('liked');
  api({action:'setlike',id,delta:liked?-1:1}).then(res=>{
    div.classList.toggle('liked');
    div.querySelector('span').textContent=res.like;
    div.querySelector('svg use').setAttribute('href',`assets/heart-${!liked?'on':'off'}.svg#icon`);
    if(liked) myLikes=myLikes.filter(v=>v!==id); else myLikes.push(id);
    localStorage.setItem('likes',JSON.stringify(myLikes));
  });
}
function replyQ(item){
  openModal('', txt=>{
    const r=txt.trim(); if(!r)return;
    api({action:'reply',id:item.id,text:r}).then(load);
  }, '답변을 입력하세요');
}

/* ───────── 모달 ───────── */
function openModal(val, cb, ph='내용을 입력하세요'){
  EL.mTextarea.value=val; EL.mTextarea.placeholder=ph; modalCB=cb;
  EL.modalBack.style.display='flex';
}
EL.mCancel.onclick=closeModal;
EL.modalBack.addEventListener('click',e=>{if(e.target===EL.modalBack)closeModal()});
function closeModal(){EL.modalBack.style.display='none';modalCB=null;}
EL.mOk.onclick=()=>{
  if(modalCB) modalCB(EL.mTextarea.value);
  closeModal();
};

/* ───────── 세션 변경 드롭다운 ───────── */
EL.sessionSel.addEventListener('change',()=>{
  curSession=EL.sessionSel.value;
  EL.title.textContent=sessionTitles[curSession]||'QnA';
  renderSpeakers();
});

/* ---------- 전역 / 초기화 위쪽에 추가 ---------- */
let autoTimer = null;            // 자동 리로드용
const POLL_MS = 8000;            // 8초마다

/* === ❺ Config 시트에서 기본 Session 읽기 ============== */
function fetchConfig(){
  return api({action:'config'}).then(cfg=>{
    if(cfg.currentSession && speakers[cfg.currentSession]){
      curSession = cfg.currentSession;
    }
  });
}

/* ---------- init() 안쪽 : 타이틀 세팅 이전에 ------------ */
function init(){
  fetchConfig().finally(()=>{     // ← config 받든 말든 이어감
    buildSessionSelect();         // 기존 코드 분리
    renderSpeakers();
    startAutoRefresh();
  });
}

function buildSessionSelect(){
  Object.keys(sessionTitles).forEach(s=>{
    const opt=document.createElement('option');
    opt.textContent=s;opt.value=s;EL.sessionSel.appendChild(opt);
  });
  EL.sessionSel.value=curSession;
  EL.title.textContent=sessionTitles[curSession];
}

/* ❷ — 자동 새로고침 ---------------------------------- */
function startAutoRefresh(){
  clearInterval(autoTimer);
  autoTimer = setInterval(load, POLL_MS);
}
EL.sessionSel.addEventListener('change',()=>{
  curSession = EL.sessionSel.value;
  EL.title.textContent=sessionTitles[curSession];
  renderSpeakers();
  startAutoRefresh();             // 세션 바꾸면 타이머 리셋
});

/* ❶ — 질문 등록 버튼 로딩 표시 ----------------------- */
EL.btnSubmit.addEventListener('click',()=>{
  const name=EL.nameInp.value.trim(), q=EL.qInp.value.trim();
  if(!q){showToast('질문을 입력해 주세요');return;}

  EL.btnSubmit.classList.add('btn-loading');   // ← 스피너 켜기
  api({action:'add',session:curSession,lecture:curLecture,name,q})
     .then(res=>{
       myQs.push(res.id);
       localStorage.setItem('myQs',JSON.stringify(myQs));
       EL.nameInp.value=''; EL.qInp.value='';
       load();
     })
     .finally(()=>EL.btnSubmit.classList.remove('btn-loading')); // 끄기
});

/* ❸ — 하트 SVG → IMG 로 변경, liked 토글 로직 수정 ------ */
function renderQCard(item){
  const liked=myLikes.includes(item.id), own=myQs.includes(item.id);
  const li=document.createElement('div');
  li.className='q-card';
  li.innerHTML=`
    <div class="q-heart ${liked?'liked':''}" data-id="${item.id}">
      <img src="assets/heart-${liked?'on':'off'}.svg" alt="">
      <span>${item.like}</span>
    </div>
    … 동일 …`;
  …(이벤트 연결은 그대로)…
}
function toggleLike(div){
  …
  api({action:'setlike',id,delta:liked?-1:1}).then(res=>{
    div.classList.toggle('liked');
    div.querySelector('span').textContent=res.like;
    div.querySelector('img')
       .src=`assets/heart-${liked?'off':'on'}.svg`;   // 이미지 교체
    …
  });
}

/* ❹ — reply 권한 컨트롤 ------------------------------ */
/*  ▶ 일반 index.html :   const isAdmin = false;         */
/*  ▶ admin.html      :   const isAdmin = true;          */
const isAdmin = false;   // 맨 위쪽 정도에 선언

function renderQCard(item){
  …
  li.innerHTML=`
    …생략…
    <div class="q-actions">
      ${own||isAdmin?`<img src="assets/icon-edit.svg" class="btn-edit">`:''}
      ${own||isAdmin?`<img src="assets/icon-delete.svg" class="btn-del">`:''}
      ${isAdmin?`<img src="assets/icon-reply.svg" class="btn-reply">`:''}
    </div>`;
  if(isAdmin){
    li.querySelector('.btn-reply')
       ?.addEventListener('click',()=>replyQ(item));
  }
}

/* admin.html 에서는 app.js 를 그대로 불러오면서  
   <script>const isAdmin = true;</script> 를 먼저 삽입 */

/* ---------------- 초기화 ---------------- */
function init(){
  // 타이틀 세팅
  Object.keys(sessionTitles).forEach(s=>{
    const opt=document.createElement('option');opt.textContent=s;opt.value=s;
    EL.sessionSel.appendChild(opt);
  });
  EL.sessionSel.value=curSession;
  EL.title.textContent=sessionTitles[curSession];
  renderSpeakers();
}
init();
