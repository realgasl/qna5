/* ============ 설정 ============ */
const API   = 'https://script.google.com/macros/s/---YOUR_ID---/exec'; // WebApp URL
const POLL  = 15000;                                   // 15초마다 갱신

/* ------------ 세션 & 스피커 데이터 ----------- */
const sessions = {
  "Session 1":{
    "Lecture A":{
      name :"김무성 상무", org:"CMG제약",
      topic:"유전독성(ICH M7) 불순물 관리/허가 전략",
      time :"10:30 - 11:00",
      photo:"https://realgasl.github.io/assets/speaker-01.webp"
    },
    "Lecture B":{
      name :"이용문 교수", org:"충북대 약대",
      topic:"의약품 중 신규 N‑Nitrosamines의 통합 관리전략",
      time :"11:00 - 11:30",
      photo:"https://realgasl.github.io/assets/speaker-02.webp"
    }
  },
  "Session 2":{
    /* 오후 세션 정의 */
  }
};

/* ------------ 상태 ------------ */
let curSession = "Session 1";
let curLecture = "Lecture A";
let myQ   = JSON.parse(localStorage.getItem('myQ')||'[]');
let myLike= JSON.parse(localStorage.getItem('myLike')||'[]');

/* ------------ 초기화 ------------ */
document.addEventListener('DOMContentLoaded',init);

async function init(){
  await loadConfig();              // Sheet Config 반영
  buildSessionDropdown();
  buildSpeakers();
  poll();
  setInterval(poll, POLL);
}

/* ------------ Config (기본 세션) ----------- */
async function loadConfig(){
  try{
    const cfg = await fetch(`${API}?action=config`).then(r=>r.json());
    if(cfg.currentSession && sessions[cfg.currentSession]){
      curSession = cfg.currentSession;
    }
  }catch(e){console.warn('CONFIG 실패',e);}
}

/* ------------ 세션 · 스피커 UI ----------- */
const app        = document.getElementById('app');
const selSession = document.getElementById('selSession');
const sessionTit = document.getElementById('sessionTitle');

function buildSessionDropdown(){
  selSession.innerHTML='';
  Object.keys(sessions).forEach(s=>{
    const o=document.createElement('option');o.value=o.textContent=s;
    if(s===curSession) o.selected=true;
    selSession.appendChild(o);
  });
  selSession.onchange=()=>{curSession=selSession.value;buildSpeakers();}
}

function buildSpeakers(){
  app.innerHTML='';
  const lectures=sessions[curSession], keys=Object.keys(lectures);
  keys.forEach((k,i)=>{
    const d=lectures[k], div=document.createElement('div');
    div.className='speaker'+(i? ' disabled':'');
    if(!i) curLecture=k;
    div.innerHTML=`
      <img src="${d.photo}" class="photo" />
      <div>
        <h3>${d.name}</h3><p>${d.org}</p>
      </div>
      <div style="margin-left:auto;border-left:1px solid rgba(255,255,255,.3);padding-left:16px">
        <div class="time">${d.time}</div><div style="margin-top:6px">${d.topic}</div>
      </div>`;
    if(i){
      div.onclick=()=>{curLecture=k;document.querySelectorAll('.speaker').forEach(x=>x.classList.add('disabled'));div.classList.remove('disabled');poll(true);}
    }
    app.appendChild(div);
  });
  app.appendChild(document.createElement('div')).id='qWrap';
}

/* ------------ 질문 목록 ------------ */
async function poll(force){
  try{
    const res = await fetch(`${API}?action=list&session=${enc(curSession)}&lecture=${enc(curLecture)}`);
    const list = await res.json();
    render(list);
  }catch(e){
    if(force) alert('질문 불러오기 실패'); console.error(e);
  }
}

function render(arr){
  const wrap=document.getElementById('qWrap');wrap.innerHTML='';
  arr.forEach(o=>{
    const mine=myQ.includes(o.id), liked=myLike.includes(o.id);
    const card=document.createElement('div');card.className='qcard';
    card.innerHTML=`
      <div class="heart ${liked?'liked':''}" data-id="${o.id}">
        <div>${liked?'❤️':'🤍'}</div><div>${o.like}</div>
      </div>
      <div class="body"><b>${o.name}</b><br>${o.q}</div>
      ${mine?`<div class="tools">
          <svg data-act="edit" data-id="${o.id}">✏️</svg>
          <svg data-act="del"  data-id="${o.id}">❌</svg>
        </div>`:''}`;
    wrap.appendChild(card);
  });

  /* 이벤트 */
  wrap.onclick=e=>{
    const h=e.target.closest('.heart');
    if(h) likeToggle(h);
    const t=e.target.closest('svg');
    if(t){
      t.dataset.act==='del'? delQ(t.dataset.id): editQ(t.dataset.id);
    }
  };
}

/* ------------ CRUD & 좋아요 ------------ */
async function likeToggle(h){
  const id=h.dataset.id, liked=h.classList.contains('liked');
  h.classList.toggle('liked');
  const cnt=h.querySelector('div:nth-child(2)');
  cnt.textContent = liked? cnt.textContent-1 : +cnt.textContent+1;
  if(liked)  myLike=myLike.filter(x=>x!==id);
  else       myLike.push(id);
  localStorage.setItem('myLike',JSON.stringify(myLike));
  fetch(`${API}?action=setlike&id=${id}&delta=${liked?-1:1}`);
}

async function addQ(name,q){
  const r=await fetch(`${API}?action=add&session=${enc(curSession)}&lecture=${enc(curLecture)}&name=${enc(name)}&q=${enc(q)}`).then(r=>r.json());
  myQ.push(r.id);localStorage.setItem('myQ',JSON.stringify(myQ));
  poll(true);
}
async function editQ(id){/* 모달 – 이전 코드 재사용 */}
async function delQ(id){/* 모달 + 삭제 */}

/* ------------ 입력 폼 ------------ */
const inpName=document.getElementById('inpName');
const inpQ   =document.getElementById('inpQ');
const btnAdd =document.getElementById('btnAdd');
btnAdd.onclick=async()=>{
  const name=inpName.value.trim(), q=inpQ.value.trim();
  if(!q){alert('질문 입력!');return;}
  btnAdd.disabled=true;btnAdd.textContent='등록 중…';
  await addQ(name,q);
  inpQ.value='';btnAdd.disabled=false;btnAdd.textContent='질문 등록';
};

/* util */
function enc(s){return encodeURIComponent(s);}
