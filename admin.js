// ===== 관리자 비밀번호 설정 =====
// 비밀번호를 바꾸려면 아래 따옴표 안의 문자만 원하는 값으로 바꾸고 저장하세요.
const ADMIN_PASSWORD = "jaegeon2026";
// ================================

const SESSION_KEY = "jaegeonAiAdminLoggedIn";

let siteData = null;

function init() {
  const loggedIn = sessionStorage.getItem(SESSION_KEY) === "yes";
  if (loggedIn) {
    showAdmin();
  } else {
    showLogin();
  }

  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("pwInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });
  document.getElementById("logoutLink").addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}

function handleLogin() {
  const pw = document.getElementById("pwInput").value;
  if (pw === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "yes");
    showAdmin();
  } else {
    document.getElementById("loginError").textContent = "비밀번호가 올바르지 않습니다.";
  }
}

function showLogin() {
  document.getElementById("loginView").style.display = "block";
  document.getElementById("adminView").style.display = "none";
  document.getElementById("logoutLink").style.display = "none";
}

function showAdmin() {
  document.getElementById("loginView").style.display = "none";
  document.getElementById("adminView").style.display = "block";
  document.getElementById("logoutLink").style.display = "inline";

  siteData = loadSiteData();
  populateCategorySelect();
  renderList();

  document.getElementById("newBtn").addEventListener("click", () => openForm(null));
  document.getElementById("cancelEntryBtn").addEventListener("click", closeForm);
  document.getElementById("saveEntryBtn").addEventListener("click", saveEntry);
  document.getElementById("exportBtn").addEventListener("click", () => downloadDataJsFile(siteData));
}

function populateCategorySelect() {
  const sel = document.getElementById("fieldCategory");
  sel.innerHTML = siteData.categories
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join("");
}

function categoryName(id) {
  const c = siteData.categories.find((c) => c.id === id);
  return c ? c.name : id;
}

function renderList() {
  const wrap = document.getElementById("listWrap");
  if (siteData.gpts.length === 0) {
    wrap.innerHTML = `<p class="empty-msg">등록된 챗봇이 없습니다. "+ 새 챗봇 추가"로 등록해 보세요.</p>`;
    return;
  }
  wrap.innerHTML = siteData.gpts
    .map(
      (g) => `
    <div class="admin-list-item" data-id="${g.id}">
      <div class="info">
        <span class="tag">${escapeHtml(categoryName(g.category))}</span>
        <h4>${escapeHtml(g.title)}</h4>
        <p>${escapeHtml(g.description)}</p>
      </div>
      <div class="actions">
        <button class="edit-btn" data-action="edit" data-id="${g.id}">수정</button>
        <button class="del-btn" data-action="del" data-id="${g.id}">삭제</button>
      </div>
    </div>`
    )
    .join("");

  wrap.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (btn.getAttribute("data-action") === "edit") {
        openForm(id);
      } else {
        deleteEntry(id);
      }
    });
  });
}

function openForm(id) {
  document.getElementById("formBox").style.display = "block";
  document.getElementById("formTitle").textContent = id ? "챗봇 수정" : "새 챗봇 추가";
  document.getElementById("editId").value = id || "";

  if (id) {
    const g = siteData.gpts.find((x) => x.id === id);
    document.getElementById("fieldCategory").value = g.category;
    document.getElementById("fieldTitle").value = g.title;
    document.getElementById("fieldDesc").value = g.description;
    document.getElementById("fieldLink").value = g.link;
  } else {
    document.getElementById("fieldCategory").selectedIndex = 0;
    document.getElementById("fieldTitle").value = "";
    document.getElementById("fieldDesc").value = "";
    document.getElementById("fieldLink").value = "";
  }
  document.getElementById("formBox").scrollIntoView({ behavior: "smooth" });
}

function closeForm() {
  document.getElementById("formBox").style.display = "none";
}

function saveEntry() {
  const id = document.getElementById("editId").value;
  const category = document.getElementById("fieldCategory").value;
  const title = document.getElementById("fieldTitle").value.trim();
  const description = document.getElementById("fieldDesc").value.trim();
  const link = document.getElementById("fieldLink").value.trim();

  if (!title || !link) {
    alert("제목과 링크는 반드시 입력해 주세요.");
    return;
  }

  if (id) {
    const g = siteData.gpts.find((x) => x.id === id);
    Object.assign(g, { category, title, description, link });
  } else {
    siteData.gpts.push({
      id: "gpt-" + Date.now(),
      category,
      title,
      description,
      link,
    });
  }

  saveSiteData(siteData);
  closeForm();
  renderList();
}

function deleteEntry(id) {
  if (!confirm("이 챗봇을 삭제할까요?")) return;
  siteData.gpts = siteData.gpts.filter((g) => g.id !== id);
  saveSiteData(siteData);
  renderList();
}

document.addEventListener("DOMContentLoaded", init);
