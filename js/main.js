(() => {
  'use strict';

  const page = document.body.dataset.page || '';
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[ch]));

  const normalize = (value = '') => String(value).trim().toLocaleLowerCase('ja');

  // Mobile navigation
  const menuBtn = document.querySelector('.menu-button');
  const nav = document.querySelector('#global-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
  }

  async function getJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  }

  async function loadCommonData() {
    const [researches, schools, prefectures, materials] = await Promise.all([
      getJson('data/researches.json'),
      getJson('data/schools.json'),
      getJson('data/prefectures.json'),
      getJson('data/materials.json')
    ]);
    return { researches, schools, prefectures, materials };
  }

  function researchCard(r) {
    const tags = (r.keywords || []).slice(0, 3).map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('');
    const sample = String(r.id || '').startsWith('SAMPLE-') ? '<span class="sample-label">表示サンプル</span>' : '';
    return `<article class="research-card">
      <div class="research-meta">${escapeHtml(r.year)}年度　${escapeHtml(r.school_name || '')}${sample}</div>
      <h3>${escapeHtml(r.title || '')}</h3>
      <p class="research-summary">${escapeHtml(r.summary || '')}</p>
      <div class="tag-list">${tags}</div>
      <div class="research-card-footer">
        <span class="category-label">${escapeHtml(r.category || 'その他')}</span>
        <a class="card-link" href="research-detail.html?id=${encodeURIComponent(r.id)}">研究を見る →</a>
      </div>
    </article>`;
  }

  function updateStats(researches, schools, materials) {
    const activeSchoolIds = new Set(researches.filter(r => r.published !== false).map(r => Number(r.school_id)));
    const registeredSchools = schools.filter(s => s.active !== false && activeSchoolIds.has(Number(s.id))).length || schools.filter(s => s.active !== false).length;
    const publishedResearches = researches.filter(r => r.published !== false).length;
    const publishedMaterials = materials.filter(m => m.published !== false).length;
    const mapping = {'school-count':registeredSchools,'research-count':publishedResearches,'material-count':publishedMaterials};
    Object.entries(mapping).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = String(value); });
  }

  function renderLatest(researches) {
    const grid = document.getElementById('latest-research');
    if (!grid) return;
    const latest = researches.filter(r => r.published !== false).sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 3);
    grid.innerHTML = latest.length ? latest.map(researchCard).join('') : '<div class="notice-card">研究成果はこれから登録されます。</div>';
  }

  async function initHome() {
    try {
      const { researches, schools, materials } = await loadCommonData();
      updateStats(researches, schools, materials);
      renderLatest(researches);
    } catch (err) {
      console.warn('データの読み込みに失敗しました。', err);
      const grid = document.getElementById('latest-research');
      if (grid) grid.innerHTML = '<div class="notice-card">研究データを読み込めませんでした。</div>';
    }
  }

  async function initResearchSearch() {
    const form = document.getElementById('research-filter-form');
    if (!form) return;
    const qInput = document.getElementById('search-q');
    const prefSelect = document.getElementById('pref');
    const schoolSelect = document.getElementById('school');
    const yearSelect = document.getElementById('year');
    const categorySelect = document.getElementById('category');
    const activitySelect = document.getElementById('activity');
    const sortSelect = document.getElementById('sort');
    const clearButton = document.getElementById('clear-filters');
    const resultGrid = document.getElementById('research-results');
    const resultCount = document.getElementById('result-count');
    const activeFilters = document.getElementById('active-filters');

    try {
      const { researches, schools, prefectures } = await loadCommonData();
      const published = researches.filter(r => r.published !== false);
      prefectures.forEach(pref => prefSelect.add(new Option(pref.name, pref.name)));
      [...new Set(published.map(r => Number(r.year)).filter(Boolean))].sort((a,b) => b-a).forEach(year => yearSelect.add(new Option(`${year}年度`, String(year))));
      [...new Set(published.map(r => r.category).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'ja')).forEach(category => categorySelect.add(new Option(category, category)));
      [...new Set(published.map(r => r.activity).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'ja')).forEach(activity => activitySelect.add(new Option(activity, activity)));

      const params = new URLSearchParams(location.search);
      const initial = {q:params.get('q')||'',pref:params.get('pref')||'',school:params.get('school')||'',year:params.get('year')||'',category:params.get('category')||'',activity:params.get('activity')||'',sort:params.get('sort')||'newest'};
      qInput.value = initial.q; prefSelect.value = initial.pref; yearSelect.value = initial.year; categorySelect.value = initial.category; activitySelect.value = initial.activity; sortSelect.value = ['newest','oldest','title'].includes(initial.sort) ? initial.sort : 'newest';

      function rebuildSchools(selectedSchool = '') {
        const pref = prefSelect.value;
        const available = schools.filter(s => s.active !== false && (!pref || s.prefecture === pref)).sort((a,b) => a.name.localeCompare(b.name, 'ja'));
        schoolSelect.innerHTML = '<option value="">すべての学校</option>';
        available.forEach(s => schoolSelect.add(new Option(s.name, String(s.id))));
        if (selectedSchool && available.some(s => String(s.id) === String(selectedSchool))) schoolSelect.value = String(selectedSchool);
        schoolSelect.disabled = available.length === 0;
        if (!available.length) schoolSelect.innerHTML = '<option value="">登録校はありません</option>';
      }
      rebuildSchools(initial.school);
      prefSelect.addEventListener('change', () => rebuildSchools(''));

      function currentCriteria(){return {q:qInput.value.trim(),pref:prefSelect.value,school:schoolSelect.disabled?'':schoolSelect.value,year:yearSelect.value,category:categorySelect.value,activity:activitySelect.value,sort:sortSelect.value};}
      function filterResearch(c){const query=normalize(c.q);return published.filter(r=>{if(c.pref&&r.prefecture!==c.pref)return false;if(c.school&&String(r.school_id)!==String(c.school))return false;if(c.year&&String(r.year)!==String(c.year))return false;if(c.category&&r.category!==c.category)return false;if(c.activity&&r.activity!==c.activity)return false;if(query){const h=normalize([r.title,r.subtitle,r.summary,r.school_name,r.prefecture,r.category,r.activity,...(r.keywords||[])].filter(Boolean).join(' '));if(!h.includes(query))return false;}return true;});}
      function sortResearch(list,sort){const copy=[...list];if(sort==='oldest')return copy.sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||''))||Number(a.year)-Number(b.year));if(sort==='title')return copy.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'ja'));return copy.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))||Number(b.year)-Number(a.year));}
      function updateUrl(c){const next=new URLSearchParams();Object.entries(c).forEach(([k,v])=>{if(v&&!(k==='sort'&&v==='newest'))next.set(k,v);});const query=next.toString();history.replaceState(null,'',`${location.pathname}${query?'?'+query:''}`);}
      function labelForSchool(id){return schools.find(s=>String(s.id)===String(id))?.name||'';}
      function renderFilterChips(c){const chips=[];if(c.q)chips.push(`キーワード：${c.q}`);if(c.pref)chips.push(c.pref);if(c.school)chips.push(labelForSchool(c.school));if(c.year)chips.push(`${c.year}年度`);if(c.category)chips.push(c.category);if(c.activity)chips.push(c.activity);activeFilters.innerHTML=chips.map(label=>`<span class="filter-chip">${escapeHtml(label)}</span>`).join('');}
      function render(){const c=currentCriteria();const matches=sortResearch(filterResearch(c),c.sort);resultCount.textContent=String(matches.length);renderFilterChips(c);updateUrl(c);if(!matches.length){resultGrid.innerHTML='<div class="empty-state"><strong>条件に合う研究が見つかりませんでした。</strong><p>キーワードや絞り込み条件を減らして、もう一度検索してみてください。</p><button class="small-button secondary" id="empty-clear" type="button">条件をクリア</button></div>';document.getElementById('empty-clear')?.addEventListener('click',clearAll);return;}resultGrid.innerHTML=matches.map(researchCard).join('');}
      function clearAll(){form.reset();qInput.value='';prefSelect.value='';yearSelect.value='';categorySelect.value='';activitySelect.value='';sortSelect.value='newest';rebuildSchools('');render();}
      form.addEventListener('submit',e=>{e.preventDefault();render();});clearButton.addEventListener('click',clearAll);sortSelect.addEventListener('change',render);render();
    } catch(err){console.warn('検索データの読み込みに失敗しました。',err);resultGrid.innerHTML='<div class="notice-card">研究データを読み込めませんでした。GitHub Pages上で再読み込みしてください。</div>';}
  }

  function extractGoogleDriveFileId(url = '') {
    const value = String(url).trim();
    if (!value) return '';
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/uc\?.*?id=([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/
    ];
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match?.[1]) return match[1];
    }
    return '';
  }

  function drivePreviewUrl(url = '') {
    const id = extractGoogleDriveFileId(url);
    return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : '';
  }

  function scoreRelated(current, other) {
    let score = 0;
    if (current.category && current.category === other.category) score += 4;
    if (current.activity && current.activity === other.activity) score += 1;
    if (Number(current.school_id) === Number(other.school_id)) score += 1;
    const currentKeywords = new Set((current.keywords || []).map(normalize));
    (other.keywords || []).forEach(k => { if (currentKeywords.has(normalize(k))) score += 2; });
    return score;
  }

  function relatedCard(r) {
    return `<article class="related-card">
      <div class="related-card-meta">${escapeHtml(r.year)}年度　${escapeHtml(r.school_name || '')}</div>
      <h3>${escapeHtml(r.title || '')}</h3>
      <p>${escapeHtml(r.summary || '')}</p>
      <a href="research-detail.html?id=${encodeURIComponent(r.id)}">研究を見る →</a>
    </article>`;
  }

  async function initResearchDetail() {
    const host = document.getElementById('research-detail');
    if (!host) return;
    try {
      const { researches, materials } = await loadCommonData();
      const id = new URLSearchParams(location.search).get('id');
      const r = researches.find(item => String(item.id) === String(id) && item.published !== false);
      if (!r) {
        host.innerHTML = '<div class="empty-state"><strong>研究が見つかりませんでした。</strong><p>研究一覧からもう一度選択してください。</p><a class="back-link" href="research.html">← 研究一覧へ戻る</a></div>';
        return;
      }

      document.title = `${r.title}｜商業探究アーカイブ`;
      const tags = (r.keywords || []).map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('');
      const points = Array.isArray(r.points) && r.points.length ? r.points : [];
      const previewUrl = drivePreviewUrl(r.pdf_url || '');
      const reportMeta = [r.pdf_size, r.pdf_pages ? `${r.pdf_pages}ページ` : '', r.year ? `${r.year}年度` : ''].filter(Boolean);
      const reportMetaHtml = reportMeta.map(item => `<span>${escapeHtml(item)}</span>`).join('');

      const related = researches
        .filter(item => item.published !== false && String(item.id) !== String(r.id))
        .map(item => ({ item, score: scoreRelated(r, item) }))
        .filter(x => x.score > 0)
        .sort((a,b) => b.score - a.score || String(b.item.created_at || '').localeCompare(String(a.item.created_at || '')))
        .slice(0, 3)
        .map(x => x.item);

      const linkedMaterialIds = new Set((r.material_ids || []).map(String));
      const linkedMaterials = materials.filter(m => m.published !== false && (linkedMaterialIds.has(String(m.id)) || String(m.research_id || '') === String(r.id)));

      const reportAction = previewUrl
        ? `<button class="report-primary-button" id="open-pdf-reader" type="button">研究報告書を読む</button>
           <a class="report-secondary-button" href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener">別タブで読む</a>`
        : `<span class="report-unavailable">研究報告書は準備中です</span>`;

      host.innerHTML = `
        <div class="research-detail-main">
          <div class="research-detail-primary">
            <article class="research-detail-hero-card">
              <div class="research-detail-meta">
                <span>${escapeHtml(r.prefecture || '')}</span>
                <span>${escapeHtml(r.school_name || '')}</span>
                <span>${escapeHtml(r.year)}年度</span>
                <span>${escapeHtml(r.activity || '')}</span>
              </div>
              <h1>${escapeHtml(r.title || '')}</h1>
              ${r.subtitle ? `<p class="research-detail-subtitle">${escapeHtml(r.subtitle)}</p>` : ''}
              <div class="tag-list">${tags}</div>
            </article>

            <section class="detail-section-card">
              <div class="detail-section-head"><h2>研究概要</h2></div>
              <p>${escapeHtml(r.summary || '')}</p>
            </section>

            ${points.length ? `<section class="detail-section-card">
              <div class="detail-section-head"><h2>研究のポイント</h2></div>
              <ul class="point-list">${points.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul>
            </section>` : ''}

            <section class="report-card" aria-labelledby="report-heading">
              <div class="report-card-inner">
                <div class="report-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2.75h8l4 4V21.25H6z"/><path d="M14 2.75v4h4"/><path d="M8.5 12h7M8.5 15.5h7"/></svg>
                </div>
                <div>
                  <h2 id="report-heading">研究報告書</h2>
                  <p>研究の内容を報告書で詳しく読むことができます。</p>
                  ${reportMetaHtml ? `<div class="report-meta">${reportMetaHtml}</div>` : ''}
                </div>
              </div>
              <div class="report-actions">${reportAction}</div>
            </section>
          </div>

          <aside class="research-detail-side" aria-label="研究情報">
            <dl class="detail-facts">
              <div class="detail-fact"><dt>研究分野</dt><dd>${escapeHtml(r.category || '—')}</dd></div>
              <div class="detail-fact"><dt>対象学年</dt><dd>${escapeHtml(r.grade || '—')}</dd></div>
              <div class="detail-fact"><dt>研究人数</dt><dd>${r.members ? `${escapeHtml(r.members)}人` : '—'}</dd></div>
              <div class="detail-fact"><dt>外部連携先</dt><dd>${escapeHtml(r.partner || '—')}</dd></div>
            </dl>
            <section class="detail-section-card">
              <div class="detail-section-head"><h2>この研究で使われた資料</h2></div>
              ${linkedMaterials.length ? `<div class="material-list">${linkedMaterials.map(m => `<div class="material-item"><div><strong>${escapeHtml(m.title || '')}</strong><small>${escapeHtml(m.type || '研究資料')}</small></div>${m.file_url ? `<a href="${escapeHtml(m.file_url)}" target="_blank" rel="noopener">資料を見る →</a>` : ''}</div>`).join('')}</div>` : '<p class="material-empty">関連する研究資料はまだ登録されていません。</p>'}
            </section>
          </aside>
        </div>

        ${previewUrl ? `<section id="pdf-reader" class="pdf-reader-section" aria-label="研究報告書ビューア">
          <div class="pdf-reader-header">
            <div class="pdf-reader-title"><strong>${escapeHtml(r.title || '')}</strong><small>研究報告書</small></div>
            <div class="pdf-reader-tools">
              <a class="pdf-tool-link" href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener">別タブ</a>
              <button class="pdf-close-button" id="close-pdf-reader" type="button">閉じる</button>
            </div>
          </div>
          <div class="pdf-reader-frame-wrap">
            <div class="pdf-reader-loading" id="pdf-reader-loading">研究報告書を読み込んでいます…</div>
            <iframe class="pdf-reader-frame" id="pdf-reader-frame" title="${escapeHtml(r.title || '')} 研究報告書" loading="lazy" data-src="${escapeHtml(previewUrl)}"></iframe>
          </div>
          <p class="pdf-reader-note">PDFはブラウザ上で閲覧できます。専用アプリは必要ありません。</p>
        </section>` : ''}

        <section class="detail-section-card">
          <div class="detail-section-head"><h2>関連する研究</h2><small>研究分野やキーワードをもとに表示</small></div>
          ${related.length ? `<div class="related-grid">${related.map(relatedCard).join('')}</div>` : '<p class="material-empty">関連する研究はまだ登録されていません。</p>'}
        </section>`;

      const openButton = document.getElementById('open-pdf-reader');
      const closeButton = document.getElementById('close-pdf-reader');
      const reader = document.getElementById('pdf-reader');
      const frame = document.getElementById('pdf-reader-frame');
      const loading = document.getElementById('pdf-reader-loading');

      if (openButton && reader && frame) {
        openButton.addEventListener('click', () => {
          reader.classList.add('is-open');
          if (!frame.src) frame.src = frame.dataset.src || '';
          reader.scrollIntoView({ behavior:'smooth', block:'start' });
        });
        frame.addEventListener('load', () => loading?.classList.add('is-hidden'));
      }
      closeButton?.addEventListener('click', () => {
        reader?.classList.remove('is-open');
        document.querySelector('.report-card')?.scrollIntoView({ behavior:'smooth', block:'center' });
      });
    } catch (err) {
      console.warn('研究詳細の読み込みに失敗しました。', err);
      host.innerHTML = '<div class="notice-card">研究データを読み込めませんでした。</div>';
    }
  }

  if (page === 'home') initHome();
  if (page === 'research') initResearchSearch();
  if (page === 'research-detail') initResearchDetail();
})();
