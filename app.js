function renderSite() {
  // 공개 사이트는 배포된 data.js를 기준으로 표시합니다.
  // 관리자 페이지가 남긴 브라우저 localStorage를 사용하면 다른 기기에서
  // 반영된 최신 내용 대신 오래된 목록이 다시 보일 수 있습니다.
  const data = JSON.parse(JSON.stringify(window.SITE_DATA));

  document.getElementById("brandName").textContent = data.siteName;
  document.getElementById("heroTitle").textContent = data.siteName;
  document.getElementById("heroTagline").textContent = data.tagline;
  document.title = data.siteName;

  const navEl = document.getElementById("categoryNav");
  navEl.innerHTML = data.categories
    .map((c) => `<a href="#cat-${c.id}">${escapeHtml(c.name)}</a>`)
    .join("");

  const mainEl = document.getElementById("categorySections");
  mainEl.innerHTML = data.categories
    .map((cat) => {
      const items = data.gpts.filter((g) => g.category === cat.id);
      const cardsHtml =
        items.length === 0
          ? `<p class="empty-msg">아직 등록된 챗봇이 없습니다. 관리자 페이지에서 추가해 주세요.</p>`
          : `<div class="card-grid">${items
              .map(
                (g) => `
              <div class="card">
                <h3>${escapeHtml(g.title)}</h3>
                <p>${escapeHtml(g.description)}</p>
                <a class="open-btn" href="${escapeHtml(g.link)}" target="_blank" rel="noopener">챗봇 열기</a>
              </div>`
              )
              .join("")}</div>`;

      return `
        <section class="category-section" id="cat-${cat.id}">
          <h2>${escapeHtml(cat.name)}</h2>
          ${cardsHtml}
        </section>`;
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", renderSite);
