/* ------- 환경 설정 ------- */
const API   = 'https://script.google.com/macros/s/AKfycbye7m5cCG1DoQKiYO0lo3AArPDvo8x8WVW0ZBYCt9CxJvFrqI0-un0ZBCsgWs8zyQ0Y/exec';   // 배포된 Apps Script WebApp URL
const POLL  = 15000;                    // ms 단위 – 15초마다 새로고침

/* ------- 세션 & 스피커 정의 ------- */
const sessions = {
  "Session 1":{
    "Lecture A":{
      name :"김무성 상무", org:"CMG제약",
      topic:"유전독성(ICH M7) 불순물 관리/허가 전략",
      time :"10:30 - 11:00",
      photo:"assets/spk_kim.webp"
    },
    "Lecture B":{
      name :"이용문 교수", org:"충북대학교 약대",
      topic:"의약품 중 신규 N-Nitrosamines의 통합 관리전략",
      time :"11:00 - 11:30",
      photo:"assets/spk_lee.webp"
    }
  },
  "Session 2":{
    /* … 오후 세션 정의 … */
  }
};

let curSession = "Session 1";
let curLecture = "Lecture A";

/* ------- 초기 로딩 ------- */
async function init(){
  await loadConfig();          // Sheet 에서 기본 세션 받아오기
  buildSessionDropdown();
  buildSpeakers();
  pollQuestions();             // 최초 + 주기 polling
  setInterval(pollQuestions, POLL);
}

async function loadConfig(){
  try{
    const cfg = await fetch(`${API}?action=config`).then(r=>r.json());
    if(cfg.currentSession && sessions[cfg.currentSession]){
      curSession = cfg.currentSession;
    }
  }catch(e){ console.warn('Config fetch fail', e); }
}

/* ------- UI 구성 ------- */
const app = document.getElementById('app');
const selSession = document.getElementById('selSession');
const sessionTitle = document.getElementById('sessionTitle');

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
  sessionTitle.textContent = /합성신약 일반/; // 필요 시 세션별 타이틀 변경
  app.innerHTML='';

  const lecObj = sessions[curSession];
  Object.keys(lecObj).forEach((lec,i)=>{
    const sp = lecObj[lec];
    const card = document.createElement('div');
    card.className='speaker'+(i? ' disabled':'');
    if(!i) curLecture = lec;
    card.innerHTML=`
      <img src="${sp.photo}" class="photo" />
      <div>
        <h3>${sp.name}</h3>
        <p>${sp.org}</p>
      </div>
      <div style="margin-left:16px;border-left:1px solid rgba(255,255,255,.3);padding-left:16px">
        <div class="time">${sp.time}</div>
        <div style="margin-top:8px;font-size:15px">${sp.topic}</div>
      </div>`;
    if(i){  // 클릭 시 lecture 전환
      card.onclick=()=>{curLecture=lec;document.querySelectorAll('.speaker').forEach(x=>x.classList.add('disabled'));card.classList.remove('disabled');pollQuestions(true);}
    }
    app.appendChild(card);
  });

  app.appendChild(document.createElement('hr'));
  app.appendChild(document.createElement('div')).id='qWrap';
  app.appendChild(buildForm());
}

/* ------- 질문 카드 렌더 ------- */
function renderQs(list){
  const wrap=document.getElementById('qWrap');
  wrap.innerHTML='';
  list.forEach(q=>{
    const card=document.createElement('div');card.className='qcard';
    card.innerHTML=`
      <div class="heart ${q.liked?'liked':''}" data-id="${q.id}">
        <div>${q.liked?'❤':'🤍'}</div><div>${q.like}</div>
      </div>
      <div class="body">
        <b>${q.name}</b><br>${q.q}
      </div>
      ${q.mine?`<div class="tools">
        <svg data-act="edit" data-id="${q.id}" ...>✏️</svg>
        <svg data-act="del"  data-id="${q.id}" ...>❌</svg>
      </div>`:''}`;
    wrap.appendChild(card);
  });

  // 이벤트 위임
  wrap.onclick=e=>{
    const heart=e.target.closest('.heart');
    if(heart) toggleLike(heart);
    const tool=e.target.closest('svg');
    if(tool){
      const id=tool.dataset.id;
      tool.dataset.act==='del'? delQ(id): editQ(id);
    }
  };
}

/* ------- 서버 통신 ------- */
async function pollQuestions(force){
  try{
    const res = await fetch(`${API}?action=list&session=${encodeURIComponent(curSession)}&lecture=${encodeURIComponent(curLecture)}`);
    const list = await res.json();
    renderQs(list);
  }catch(e){
    if(force) alert('질문 목록을 불러오지 못했습니다.');
  }
}

async function addQ(name,q){
  const r = await fetch(`${API}?action=add&session=${enc(curSession)}&lecture=${enc(curLecture)}&name=${enc(name)}&q=${enc(q)}`).then(r=>r.json());
  pollQuestions(true);
}

async function toggleLike(heart){
  const id=heart.dataset.id, liked=heart.classList.contains('liked');
  heart.classList.toggle('liked');          // 즉시 UI
  const cnt=heart.querySelector('div:nth-child(2)');
  cnt.textContent = liked? Number(cnt.textContent)-1 : Number(cnt.textContent)+1;
  fetch(`${API}?action=setLike&id=${id}&delta=${liked?-1:1}`);
}

async function editQ(id){ /* ... 생략 (기존 코드 유지) ... */ }
async function delQ(id){ /* ... 생략 */ }

function enc(s){return encodeURIComponent(s);}

/* ------- 질문 입력 폼 ------- */
function buildForm(){
  const wrap=document.createElement('div');wrap.style.margin='32px 0';
  wrap.innerHTML=`
    <input id="inpName" placeholder="이름을 입력하세요(선택)" />
    <textarea id="inpQ" rows="4" placeholder="질문 내용을 입력하세요(필수)"></textarea>
    <button class="submit" id="btnAdd">질문 등록</button>`;
  wrap.querySelector('#btnAdd').onclick=async()=>{
    const name=inpName.value.trim(), q=inpQ.value.trim();
    if(!q){alert('질문을 입력하세요');return;}
    btnAdd.disabled=true;btnAdd.textContent='등록 중…';
    await addQ(name,q);
    inpQ.value='';btnAdd.disabled=false;btnAdd.textContent='질문 등록';
  };
  return wrap;
}

/* ---------- GO ---------- */
document.addEventListener('DOMContentLoaded',init);
