(() => {
  'use strict';
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  async function getJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  }
  function extractGoogleDriveFileId(url = '') {
    const value = String(url || '').trim();
    const patterns = [/\/file\/d\/([\w-]+)/, /[?&]id=([\w-]+)/, /\/d\/([\w-]+)/];
    for (const pattern of patterns) { const match = value.match(pattern); if (match) return match[1]; }
    return '';
  }
  function drivePreviewUrl(url = '') {
    const id = extractGoogleDriveFileId(url);
    return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : '';
  }
  async function loadGuideData() { return getJson('data/guide.json'); }

  async function initGuideIndex() {
    const root = document.getElementById('guide-steps');
    if (!root) return;
    try {
      const data = await loadGuideData();
      const published = (data.worksheets || []).filter(w => w.published !== false);
      root.innerHTML = (data.steps || []).map(step => {
        const count = published.filter(w => Number(w.step) === Number(step.id)).length;
        return `<a class="guide-step-link" href="guide-detail.html?step=${encodeURIComponent(step.id)}">
          <span class="guide-step-number"><small>STEP</small>${String(step.id).padStart(2,'0')}</span>
          <div><h2>${escapeHtml(step.title)}</h2><p>${escapeHtml(step.summary)}</p></div>
          <div class="guide-step-meta"><span class="worksheet-badge">${count}件のワークシート</span><span class="guide-step-arrow">→</span></div>
        </a>`;
      }).join('');
    } catch (err) {
      console.warn(err);
      root.innerHTML = '<div class="worksheet-empty"><strong>データを読み込めませんでした。</strong><p>時間をおいてもう一度お試しください。</p></div>';
    }
  }

  async function initGuideDetail() {
    const heading = document.getElementById('guide-detail-heading');
    const list = document.getElementById('worksheet-list');
    if (!heading || !list) return;
    try {
      const data = await loadGuideData();
      const stepId = Number(new URLSearchParams(location.search).get('step') || 1);
      const step = (data.steps || []).find(s => Number(s.id) === stepId) || data.steps?.[0];
      if (!step) throw new Error('step not found');
      document.title = `${step.title}｜研究の進め方｜商業探究アーカイブ`;
      heading.innerHTML = `<div class="guide-detail-title-wrap"><span class="guide-detail-step">STEP ${String(step.id).padStart(2,'0')}</span><h1>${escapeHtml(step.title)}</h1><p>${escapeHtml(step.summary)}</p></div>`;
      const items = (data.worksheets || []).filter(w => w.published !== false && Number(w.step) === Number(step.id));
      const count = document.getElementById('worksheet-count');
      if (count) count.textContent = `${items.length}件`;
      if (!items.length) {
        list.innerHTML = '<div class="worksheet-empty"><strong>このSTEPのワークシートはまだ登録されていません。</strong><p>各校から登録された資料がここに追加されます。</p></div>';
        return;
      }
      list.innerHTML = items.map(w => {
        const preview = drivePreviewUrl(w.pdf_url || '');
        const sample = w.sample ? '<span class="sample-label">表示サンプル</span>' : '';
        const actions = preview ? `<button class="worksheet-primary-button" type="button" data-preview="${escapeHtml(preview)}" data-title="${escapeHtml(w.title)}" data-school="${escapeHtml(w.school_name)}">ワークシートを見る</button><a class="worksheet-secondary-link" href="${escapeHtml(preview)}" target="_blank" rel="noopener">別タブで見る</a>` : '<span class="worksheet-unavailable">ワークシート準備中</span>';
        return `<article class="worksheet-card">
          <div class="worksheet-school"><span class="worksheet-prefecture">${escapeHtml(w.prefecture || '')}</span>${escapeHtml(w.school_name || '')}${sample}</div>
          <h3>${escapeHtml(w.title || '')}</h3>
          <span class="worksheet-description-label">ワークシートの説明</span>
          <p>${escapeHtml(w.description || '')}</p>
          <div class="worksheet-actions">${actions}</div>
        </article>`;
      }).join('');
      bindWorksheetReader();
    } catch (err) {
      console.warn(err);
      list.innerHTML = '<div class="worksheet-empty"><strong>データを読み込めませんでした。</strong><p>時間をおいてもう一度お試しください。</p></div>';
    }
  }

  function bindWorksheetReader() {
    const reader = document.getElementById('worksheet-reader');
    const frame = document.getElementById('worksheet-frame');
    const title = document.getElementById('worksheet-reader-title');
    const school = document.getElementById('worksheet-reader-school');
    const openNew = document.getElementById('worksheet-open-new');
    const close = document.getElementById('worksheet-close');
    const loading = document.getElementById('worksheet-loading');
    if (!reader || !frame) return;
    document.querySelectorAll('.worksheet-primary-button[data-preview]').forEach(button => {
      button.addEventListener('click', () => {
        const url = button.dataset.preview || '';
        title.textContent = button.dataset.title || 'ワークシート';
        school.textContent = button.dataset.school || '';
        openNew.href = url;
        loading?.classList.remove('is-hidden');
        frame.src = url;
        reader.classList.add('is-open');
        reader.scrollIntoView({ behavior:'smooth', block:'start' });
      });
    });
    frame.addEventListener('load', () => loading?.classList.add('is-hidden'));
    close?.addEventListener('click', () => {
      reader.classList.remove('is-open');
      frame.src = 'about:blank';
      loading?.classList.remove('is-hidden');
    });
  }

  if (document.getElementById('guide-steps')) initGuideIndex();
  if (document.getElementById('guide-detail-heading')) initGuideDetail();
})();
