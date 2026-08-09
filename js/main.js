(() => {
  const menuBtn = document.querySelector('.menu-button');
  const nav = document.querySelector('#global-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
  }

  const escapeHtml = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  async function loadData() {
    try {
      const [researchRes, schoolRes, materialRes] = await Promise.all([
        fetch('data/researches.json', {cache:'no-store'}),
        fetch('data/schools.json', {cache:'no-store'}),
        fetch('data/materials.json', {cache:'no-store'})
      ]);
      const researches = researchRes.ok ? await researchRes.json() : [];
      const schools = schoolRes.ok ? await schoolRes.json() : [];
      const materials = materialRes.ok ? await materialRes.json() : [];
      updateStats(researches, schools, materials);
      renderLatest(researches);
    } catch (e) {
      console.warn('データ読み込みに失敗しました。', e);
      const grid = document.querySelector('#latest-research');
      if (grid) grid.innerHTML = '<div class="notice-card">研究データを読み込めませんでした。</div>';
    }
  }

  function updateStats(researches, schools, materials) {
    const activeSchools = schools.filter(s => s.active !== false).length;
    const publishedResearches = researches.filter(r => r.published !== false).length;
    const publishedMaterials = materials.filter(m => m.published !== false).length;
    const values = {
      'school-count': activeSchools,
      'hero-school-count': activeSchools,
      'research-count': publishedResearches,
      'hero-research-count': publishedResearches,
      'material-count': publishedMaterials
    };
    Object.entries(values).forEach(([id, val]) => {
      const el = document.getElementById(id); if (el) el.textContent = val;
    });
  }

  function renderLatest(researches) {
    const grid = document.querySelector('#latest-research');
    if (!grid) return;
    const latest = researches.filter(r => r.published !== false)
      .sort((a,b) => String(b.created_at||'').localeCompare(String(a.created_at||'')))
      .slice(0,3);
    if (!latest.length) {
      grid.innerHTML = '<div class="notice-card">研究成果はこれから登録されます。</div>';
      return;
    }
    grid.innerHTML = latest.map(r => {
      const tags = (r.keywords||[]).slice(0,3).map(t=>`<span class="tag">#${escapeHtml(t)}</span>`).join('');
      const link = `research-detail.html?id=${encodeURIComponent(r.id)}`;
      return `<article class="research-card">
        <div class="research-card-top"><span class="research-school">${escapeHtml(r.school_name||'')}</span><span class="research-year">${escapeHtml(r.year||'')}年度</span></div>
        <h3>${escapeHtml(r.title||'')}</h3>
        <p class="research-summary">${escapeHtml(r.summary||'')}</p>
        <div class="tag-list">${tags}</div>
        <div class="research-card-bottom"><span class="category-label">${escapeHtml(r.category||'その他')}</span><a class="card-link" href="${link}">詳しく見る →</a></div>
      </article>`;
    }).join('');
  }

  loadData();
})();
