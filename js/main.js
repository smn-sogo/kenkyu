const menuButton = document.querySelector('.menu-button');
const globalNav = document.querySelector('.global-nav');
if (menuButton && globalNav) {
  menuButton.addEventListener('click', () => {
    const open = globalNav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
}

const sampleResearches = [
  {
    year: 2026,
    school: '島根県立出雲商業高等学校',
    title: '地域の食を、働く人の日常へ',
    summary: '地域飲食店と企業をつなぐ仕組みについて、地域課題の調査からサービス開発・実証まで取り組んだ研究。',
    tags: ['地域活性化', '情報・DX', 'マーケティング']
  },
  {
    year: 2026,
    school: '島根県立○○商業高等学校',
    title: '地域観光資源を活用した商品開発',
    summary: '地域の観光資源に着目し、調査・企画・試作を通して新たな商品価値の創出を目指した研究。',
    tags: ['観光', '商品開発', '地域活性化']
  },
  {
    year: 2026,
    school: '島根県立○○高等学校',
    title: '高校生の視点から考える商店街の活性化',
    summary: 'フィールドワークやアンケートをもとに、若者が訪れたくなる商店街づくりについて提案した研究。',
    tags: ['地域活性化', '調査', 'マーケティング']
  }
];

const latest = document.getElementById('latest-research');
if (latest) {
  latest.innerHTML = sampleResearches.map(item => `
    <article class="research-card">
      <div class="research-meta">${item.year}年度　${item.school}</div>
      <h3>${item.title}</h3>
      <p>${item.summary}</p>
      <div class="tag-list">${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
      <a class="card-link" href="research-detail.html">詳しく見る →</a>
    </article>
  `).join('');
}
