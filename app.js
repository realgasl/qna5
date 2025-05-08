/* ===== 설정 ===== */
const API = 'https://script.google.com/macros/s/AKfycbye7m5cCG1DoQKiYO0lo3AArPDvo8x8WVW0ZBYCt9CxJvFrqI0-un0ZBCsgWs8zyQ0Y/exec';   // ← ★ 배포 URL
const POLL = 15000;

/* ===== 세션 & 스피커 ===== */
const sessions = {
  "Session 1":{
    "Lecture A":{
      name:"김무성 상무",org:"CMG제약",topic:"유전독성(ICH M7)…",time:"10:30 - 11:00",photo:"assets/speaker-01.webp"},
    "Lecture B":{
      name:"이용문 교수",org:"충북대 약대",topic:"신규 N-Nitrosamines 관리전략",time:"11:00 - 11:30",photo:"assets/speaker-02.webp"}
  },
  "Session 2":{/* 이후 추가 */}
};

/* ===== 상태 ===== */
let curSession="Session 1", curLecture="Lecture A";
const LS_MYQ='myQ', LS_MYLIKE='myLike';
let myQ=JSON.parse(localStorage.getItem(LS_MYQ)||'[]');
let myLike=JSON.parse(localStorage.getItem(LS_MYLIKE)||'[]');

/* ===== 초기화 ===== */
document.addEventListener('DOMContentLoaded',init);

async function init(){
  await loadConfig();
  buildSessionSel();
  buildSpeakers();
  poll(); setInterval(poll,POLL);
  document.getElementById('btnAdd').onclick=addQuestion;
  document.getElementById('btnCancel').onclick=()=>modal.style.display='none';
  document.getElementById('btnOk').onclick=submitReply;
}

/* ----- Config 시트 ----- */
async function loadConfig(){
  try{
    const cfg=await fetch(`${API}?action=config`).then(r=>r.json());
    if(cfg.currentSession && sessions[cfg.currentSession]) curSession=cfg.currentSession;
  }catch(e){console.warn('Config 실패',e);}
}

/* ----- 세션 드롭다운 ----- */
const sel=document.getElementById('selSession');
function buildSessionSel(){
  sel.innerHTML='';
  Object.keys(sessions).forEach(s=>{
    const o=document.createElement('option');o.value=o.textContent=s;
    if(s===curSession) o.selected=true; sel.appendChild(o);
  });
  sel.onchange=()=>{curSession=sel.value;buildSpeakers();}
}

/* ----- 스피커 카드 ----- */
const app=document.getElementById('app');
function buildSpeakers(){
  app.innerHTML=''; const lecObj=sessions[curSession];
  Object.entries(lecObj).forEach(([key,sp],i)=>{
    const div=document.createElement('div');
    div.className='speaker'+(i?' disabled':'');
    if(!i) curLecture=key;
    div.innerHTML=`
      <img src="${sp.photo}" class="photo">
      <div><h3>${sp.name}</h3><p>${sp.org}</p></div>
      <div style="margin-left:auto;border-left:1px solid rgba(255,255,255,.4);padding-left:16px">
        <div class="time">${sp.time}</div><div class="topic">${sp.topic}</div>
      </div>`;
    if(i){div.onclick=()=>{curLecture=key;document.querySelectorAll('.speaker').forEach(x=>x.classList.add('disabled'));div.classList.remove('disabled');poll(true);}};
    app.appendChild(div);
  });
  app.appendChild(document.createElement('div')).id='qWrap';
}

/* ----- 질문 목록 ----- */
async function poll(force){
  try{
    const res=await fetch(`${API}?action=list&session=${enc(curSession)}&lecture=${enc(curLecture)}`);
    const list=await res.json(); render(list);
  }catch(e){if(force) alert('질문 불러오기 실패');}
}
function render(list){
  const w=document.getElementById('qWrap');w.innerHTML='';
  list.forEach(o=>{
    const mine=myQ.includes(o.id), liked=myLike.includes(o.id);
    const c=document.createElement('div');c.className='qcard';c.dataset.id=o.id;
    c.innerHTML=`
      <div class="heart ${liked?'liked':''}"><img src="assets/${liked?'heart-on.svg':'heart-off.svg'}"><div>${o.like}</div></div>
      <div class="body"><b>${o.name||'익명'}</b><br>${o.q}</div>
      ${mine?`<div class="tools">
        <img src="assets/icon-edit.svg"  data-act="edit">
        <img src="assets/icon-delete.svg" data-act="del">
      </div>`:''}`;
    w.appendChild(c);
  });
  w.onclick=e=>{
    const h=e.target.closest('.heart'); if(h) toggleLike(h);
    const t=e.target.closest('.tools img'); if(t){
      const id=t.closest('.qcard').dataset.id;
      t.dataset.act==='del'? delQ(id): openReply(id);
    }
  };
}

/* ----- 좋아요 ----- */
function toggleLike(h){
  const id=h.closest('.qcard').dataset.id, liked=h.classList.contains('liked');
  h.classList.toggle('liked');
  h.querySelector('img').src='assets/'+(liked?'heart-off.svg':'heart-on.svg');
  const cnt=h.querySelector('div:nth-child(2)');
  cnt.textContent=+cnt.textContent+(liked?-1:1);
  liked? myLike=myLike.filter(x=>x!==id): myLike.push(id);
  localStorage.setItem(LS_MYLIKE,JSON.stringify(myLike));
  fetch(`${API}?action=setlike&id=${id}&delta=${liked?-1:1}`);
}

/* ----- 질문 추가 ----- */
async function addQuestion(){
  const n=document.getElementById('inpName').value.trim();
  const q=document.getElementById('inpQ').value.trim();
  if(!q){alert('질문 내용을 입력');return;}
  btnAdd.disabled=true;btnAdd.textContent='등록 중…';
  const r=await fetch(`${API}?action=add&session=${enc(curSession)}&lecture=${enc(curLecture)}&name=${enc(n)}&q=${enc(q)}`).then(r=>r.json());
  myQ.push(r.id);localStorage.setItem(LS_MYQ,JSON.stringify(myQ));
  btnAdd.disabled=false;btnAdd.textContent='질문 등록';document.getElementById('inpQ').value='';
  poll(true);
}

/* ----- 답변 모달 ----- */
let targetId='';
const modal=document.getElementById('modal');
function openReply(id){
  targetId=id; modal.style.display='flex';
  document.getElementById('replyText').value='';
}
async function submitReply(){
  const txt=document.getElementById('replyText').value.trim();
  if(!txt){alert('답변을 입력');return;}
  await fetch(`${API}?action=reply&id=${targetId}&text=${enc(txt)}`);
  modal.style.display='none'; poll(true);
}

/* ----- 삭제 ----- */
async function delQ(id){
  if(!confirm('삭제하시겠습니까?'))return;
  await fetch(`${API}?action=delete&id=${id}`); poll(true);
}

/* util */
function enc(s){return encodeURIComponent(s);}
