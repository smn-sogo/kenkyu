(() => {
  'use strict';
  const SESSION_KEY='staAdminSession';
  const STORE_RESEARCH='staDraftResearch';
  const STORE_WORKSHEET='staDraftWorksheet';
  const $=(q,root=document)=>root.querySelector(q);
  const $$=(q,root=document)=>[...root.querySelectorAll(q)];
  const escapeHtml=(v='')=>String(v).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const getSession=()=>{try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{return null}};
  const setSession=s=>sessionStorage.setItem(SESSION_KEY,JSON.stringify(s));
  const clearSession=()=>sessionStorage.removeItem(SESSION_KEY);
  function demoLogin(role){
    const session=role==='system_admin'
      ?{role:'system_admin',name:'総合学習部会 管理者',prefecture:'',school_id:null,school_name:'全校管理'}
      :{role:'school_admin',name:'学校管理者（デモ）',prefecture:'島根県',school_id:32001,school_name:'島根県立出雲商業高等学校'};
    setSession(session); location.href='index.html';
  }
  function guard(){
    if(document.body.dataset.adminPage==='login')return;
    const s=getSession(); if(!s){location.href='login.html';return null}
    $$('.system-only').forEach(el=>el.hidden=s.role!=='system_admin');
    $$('[data-admin-name]').forEach(el=>el.textContent=s.name);
    $$('[data-admin-school]').forEach(el=>el.textContent=s.school_name);
    return s;
  }
  async function getJson(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(path);return r.json()}
  async function setupSchoolFields(session){
    const pref=$('#prefecture'); const school=$('#school');
    if(!pref||!school)return;
    if(session.role==='school_admin'){
      pref.innerHTML=`<option>${escapeHtml(session.prefecture)}</option>`;pref.disabled=true;
      school.innerHTML=`<option value="${session.school_id}">${escapeHtml(session.school_name)}</option>`;school.disabled=true;return;
    }
    try{
      const [prefs,schools]=await Promise.all([getJson('../data/prefectures.json'),getJson('../data/schools.json')]);
      const prefItems=Array.isArray(prefs)?prefs:(prefs.prefectures||[]); const schoolItems=Array.isArray(schools)?schools:(schools.schools||[]);
      pref.innerHTML='<option value="">都道府県を選択</option>'+prefItems.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
      const update=()=>{const id=Number(pref.value);school.innerHTML='<option value="">学校を選択</option>'+schoolItems.filter(s=>Number(s.prefecture_id)===id&&s.active!==false).map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')};
      pref.addEventListener('change',update); update();
    }catch(e){console.warn(e)}
  }
  function valueOf(form,name){const el=form.elements[name];if(!el)return'';if(el.disabled)return el.options?.[el.selectedIndex]?.text||el.value||'';return el.value||''}
  function formDataObject(form,kind,session){
    const o={kind,created_at:new Date().toISOString(),prefecture:valueOf(form,'prefecture'),school:valueOf(form,'school')};
    [...form.elements].forEach(el=>{if(el.name&&!['prefecture','school'].includes(el.name)){o[el.name]=el.value}});
    if(session.role==='school_admin'){o.prefecture=session.prefecture;o.school=session.school_name;o.school_id=session.school_id}
    return o;
  }
  function renderConfirm(data,labels){
    const dl=$('#confirm-list'); if(!dl)return; dl.innerHTML='';
    labels.forEach(([key,label])=>{const val=data[key]||'—';dl.insertAdjacentHTML('beforeend',`<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(val)}</dd>`)});
  }
  function bindEntryForm(session){
    const form=$('#entry-form');if(!form)return;
    const kind=form.dataset.kind; const labels=kind==='worksheet'?
      [['prefecture','都道府県'],['school','学校'],['step','STEP'],['title','ワークシート名'],['description','ワークシートの説明'],['pdf_url','Google Drive共有URL']]:
      [['prefecture','都道府県'],['school','学校'],['year','年度'],['title','研究タイトル'],['subtitle','サブタイトル'],['activity','授業・活動'],['category','研究分野'],['keywords','キーワード'],['summary','研究概要'],['pdf_url','Google Drive共有URL']];
    form.addEventListener('submit',e=>{e.preventDefault();const data=formDataObject(form,kind,session);sessionStorage.setItem('staPendingEntry',JSON.stringify(data));renderConfirm(data,labels);form.classList.add('is-hidden');$('#confirm-panel')?.classList.add('is-open');window.scrollTo({top:0,behavior:'smooth'})});
    $('#edit-entry')?.addEventListener('click',()=>{$('#confirm-panel')?.classList.remove('is-open');form.classList.remove('is-hidden');});
    $('#commit-entry')?.addEventListener('click',()=>{const data=JSON.parse(sessionStorage.getItem('staPendingEntry')||'{}');const key=kind==='worksheet'?STORE_WORKSHEET:STORE_RESEARCH;const list=JSON.parse(localStorage.getItem(key)||'[]');data.id=(kind==='worksheet'?'WS-LOCAL-':'R-LOCAL-')+Date.now();list.unshift(data);localStorage.setItem(key,JSON.stringify(list));$('#confirm-panel')?.classList.remove('is-open');$('#success-box')?.classList.add('is-open');sessionStorage.removeItem('staPendingEntry');});
  }
  function renderDashboard(){
    const r=JSON.parse(localStorage.getItem(STORE_RESEARCH)||'[]');const w=JSON.parse(localStorage.getItem(STORE_WORKSHEET)||'[]');
    const rc=$('#draft-research-count');if(rc)rc.textContent=r.length;const wc=$('#draft-worksheet-count');if(wc)wc.textContent=w.length;
  }
  function renderList(kind){
    const root=$('#entry-list');if(!root)return;const key=kind==='worksheet'?STORE_WORKSHEET:STORE_RESEARCH;const list=JSON.parse(localStorage.getItem(key)||'[]');
    if(!list.length){root.innerHTML='<div class="empty-list">このブラウザで登録したデータはまだありません。</div>';return}
    root.innerHTML='<div class="list-row header"><span>登録日</span><span>タイトル</span><span>学校</span><span>状態</span></div>'+list.map(x=>`<div class="list-row"><span>${escapeHtml((x.created_at||'').slice(0,10))}</span><strong>${escapeHtml(x.title||'')}</strong><span>${escapeHtml(x.school||'')}</span><span><span class="status-pill">実証保存</span></span></div>`).join('');
  }
  $$('.demo-login').forEach(b=>b.addEventListener('click',()=>demoLogin(b.dataset.role)));
  $$('.logout-button').forEach(b=>b.addEventListener('click',()=>{clearSession();location.href='login.html'}));
  const toggle=$('.mobile-sidebar-toggle');toggle?.addEventListener('click',()=>$('.admin-sidebar')?.classList.toggle('is-open'));
  const session=guard(); if(session){setupSchoolFields(session);bindEntryForm(session);renderDashboard();if(document.body.dataset.listKind)renderList(document.body.dataset.listKind)}
})();
