/* ====== 설정 ====== */
const API = 'https://script.google.com/macros/s/AKfycb………………………/exec';  // ← 본인 URL
const speakerData = {
  'Session 1': [
    { id:'Lecture A', img:'speaker-01.webp', name:'김무성 상무', org:'CMG제약',
      time:'10:30 - 11:00', title:'유전독성(ICH M7) 불순물 관리/허가 전략' },
    { id:'Lecture B', img:'speaker-02.webp', name:'이용문 교수', org:'충북대 약대',
      time:'11:00 - 11:30', title:'신규 N-Nitrosamines 관리전략' }
  ],
  'Session 2': [
    { id:'Lecture C', img:'speaker-03.webp', name:'박찬수 이사', org:'퓨처켐',
      time:'13:00 - 13:30', title:'방사성의약품 개발 시 CMC 주요 고려사항' },
    { id:'Lecture D', img:'speaker-04.webp', name:'최희경 상무', org:'지투지바이오',
      time:'13:30 - 14:00', title:'합성펩타이드 의약품 연구개발 관련 CMC 고려사항' }
  ]
};

/* ===== Session 타이틀 ===== */
const sessionTitle = {
  'Session 1': '합성신약 일반 QnA',
  'Session 2': '방사성의약품 / 합성 펩타이드 치료제 QnA'
};
function renderSubTitle(){
  qs('#subTitle').textContent = sessionTitle[curSession] || '';
}

/* ====== 상태 ====== */
let curSession = 'Session 1';
let curLecture = 'Lecture A';
let myLikes = JSON.parse(localStorage.getItem('likes')||'[]');
let myEdits = JSON.parse(localStorage.getItem('myq')||'[]');

/* ====== DOM ====== */
const speakerWrap = qs('#speakerWrap');
const qList       = qs('#qList');
const emptyMsg    = qs('#emptyMsg');
const nameInp     = qs('#nameInp');
const qInp        = qs('#qInp');

/* ===== util ===== */
function qs(s, p=document){ return p.querySelector(s); }
function qsa(s,p=document){ return [...p.querySelectorAll(s)]; }
function fetchJSON(url){ return fetch(url).then(r=>r.json()); }

/* ====== 초기 렌더 ====== */
renderSpeakers();
load();

/* ── 세션 드롭다운 ── */
qs('#sessionSel').onchange = e=>{
  curSession = e.target.value;
  curLecture = speakerData[curSession][0].id;
  renderSpeakers();
  load();
};

/* ── 질문 등록 ── */
qs('#addBtn').onclick = ()=>{
  const q=qInp.value.trim(); if(!q){alert('질문을 입력하세요');return;}
  qs('#addBtn').textContent='등록 중…';qs('#addBtn').disabled=true;
  const url=`${API}?action=add&session=${encodeURIComponent(curSession)}&lecture=${encodeURIComponent(curLecture)}&name=${encodeURIComponent(nameInp.value)}&q=${encodeURIComponent(q)}`;
  fetchJSON(url).then(r=>{
    qInp.value='';qs('#addBtn').textContent='질문 등록';qs('#addBtn').disabled=false;load();
  });
};

/* ── 목록 로드 ── */
function load(){
  const url=`${API}?action=list&session=${encodeURIComponent(curSession)}&lecture=${encodeURIComponent(curLecture)}`;
  fetchJSON(url).then(renderList);
}

/* ── 질문 리스트 렌더 ── */
function renderList(arr){
  qList.innerHTML='';
  emptyMsg.hidden = arr.length>0;
  arr.forEach(o=>{
    const li=document.createElement('li');li.className='question';
    li.innerHTML=`
      <div class="heart" data-id="${o.id}">
        <img src="assets/${myLikes.includes(o.id)?'heart-on':'heart-off'}.svg">
        <span>${o.like}</span>
      </div>
      <div class="body">
        <p class="q-name">${o.name||'(익명)'}</p>
        <p class="q-text">${o.q}</p>
        ${o.reply?`<div class="reply">${o.reply}</div>`:''}
      </div>
      ${myEdits.includes(o.id)?
        `<div class="btns">
           <img src="assets/icon-edit.svg"   class="edit" data-id="${o.id}">
           <img src="assets/icon-delete.svg" class="del"  data-id="${o.id}">
         </div>`:''
      }`;
    qList.append(li);
  });

  /* 좋아요 */
  qsa('.heart',qList).forEach(h=>{
    h.onclick = ()=>{
      const id=h.dataset.id, liked=myLikes.includes(id);
      const url=`${API}?action=setLike&id=${id}&delta=${liked?-1:1}`;
      fetchJSON(url).then(r=>{
        h.querySelector('span').textContent=r.like;
        h.querySelector('img').src=`assets/${liked?'heart-off':'heart-on'}.svg`;
        if(liked) myLikes=myLikes.filter(v=>v!==id); else myLikes.push(id);
        localStorage.setItem('likes',JSON.stringify(myLikes));
      });
    };
  });

  /* 수정 / 삭제 */
  qsa('.edit',qList).forEach(btn=>btn.onclick=()=>openModal('질문 수정',btn.dataset.id));
  qsa('.del',qList).forEach(btn=>delQ(btn.dataset.id));
}

/* ── 스피커 카드 렌더 ── */
function renderSpeakers(){
  speakerWrap.innerHTML='';
  speakerData[curSession].forEach(sp=>{
    const div=document.createElement('div');
    div.className='speaker'+(sp.id===curLecture?' active':'');
    div.innerHTML=`
      <img src="assets/${sp.img}">
      <div class="info">
        <p class="name">${sp.name}</p>
        <p class="org">${sp.org}</p>
      </div>
      <div class="info">
        <p class="time">${sp.time}</p>
        <p class="title">${sp.title}</p>
      </div>`;
    div.onclick=()=>{
      curLecture=sp.id;
      renderSpeakers();
      load();
    };
    speakerWrap.append(div);
  });
}

/* ── 삭제 ── */
function delQ(id){
  return ()=>{
    if(!confirm('삭제하시겠습니까?')) return;
    fetchJSON(`${API}?action=delete&id=${id}`).then(()=>load());
  };
}

/* ── 모달 편집·답변 ── */
let mId='', isReply=false;
function openModal(tit,id){
  mId=id; isReply=false;
  qs('#modalTit').textContent=tit;
  qs('#modalTxt').value=qsa(`[data-id="${id}"]`,qList.closest('.q-list'))[0]
                   .closest('.question').querySelector('.q-text').textContent.trim();
  showModal();
}
/* 답변 모드 (관리자만 호출) */
function openReply(id){
  mId=id; isReply=true;
  qs('#modalTit').textContent='답변 작성';
  qs('#modalTxt').value='';
  showModal();
}

function showModal(){ qs('#modalDim').hidden=qs('#modalBox').hidden=false; }
function closeModal(){ qs('#modalDim').hidden=qs('#modalBox').hidden=true; }

qs('#mCancel').onclick=closeModal;
qs('#mOk').onclick=()=>{
  const txt=qs('#modalTxt').value.trim(); if(!txt){alert('내용을 입력');return;}
  const act=isReply?'reply':'edit';
  fetchJSON(`${API}?action=${act}&id=${mId}&${isReply?'text':'q'}=${encodeURIComponent(txt)}`)
    .then(()=>{closeModal();load();});
};
