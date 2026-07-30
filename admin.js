// ===== 관리자 비밀번호 설정 =====
// 비밀번호를 바꾸려면 아래 따옴표 안의 문자만 원하는 값으로 바꾸고 저장하세요.
const ADMIN_PASSWORD = "jaegun2026";
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
  renderCategoryList();
  renderList();

  document.getElementById("newBtn").addEventListener("click", () => openForm(null));
  document.getElementById("cancelEntryBtn").addEventListener("click", closeForm);
  document.getElementById("saveEntryBtn").addEventListener("click", saveEntry);
  document.getElementById("exportBtn").addEventListener("click", () => downloadDataJsFile(siteData));
  document.getElementById("newCategoryBtn").addEventListener("click", addCategory);
}

function slugify(name) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return (base || "cat") + "-" + Date.now().toString(36);
}

function renderCategoryList() {
  const wrap = document.getElementById("categoryListWrap");
  if (siteData.categories.length === 0) {
    wrap.innerHTML = `<p class="empty-msg">카테고리가 없습니다. "+ 새 카테고리 추가"로 만들어 보세요.</p>`;
    return;
  }
  wrap.innerHTML = siteData.categories
    .map((c) => {
      const count = siteData.gpts.filter((g) => g.category === c.id).length;
      return `
      <div class="category-admin-item" data-cat-id="${c.id}">
        <input type="text" value="${escapeHtml(c.name)}" data-role="cat-name-input" />
        <span class="count">챗봇 ${count}개</span>
        <button class="rename-btn" data-action="rename-cat" data-id="${c.id}">이름 저장</button>
        <button class="del-cat-btn" data-action="del-cat" data-id="${c.id}">삭제</button>
      </div>`;
    })
    .join("");

  wrap.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (btn.getAttribute("data-action") === "rename-cat") {
        renameCategory(id, btn);
      } else {
        deleteCategory(id);
      }
    });
  });
}

function addCategory() {
  const name = prompt("새 카테고리 이름을 입력하세요.");
  if (!name || !name.trim()) return;
  siteData.categories.push({ id: slugify(name), name: name.trim() });
  saveSiteData(siteData);
  populateCategorySelect();
  renderCategoryList();
  renderList();
}

function renameCategory(id, btn) {
  const item = btn.closest(".category-admin-item");
  const input = item.querySelector('[data-role="cat-name-input"]');
  const newName = input.value.trim();
  if (!newName) {
    alert("카테고리 이름을 입력해 주세요.");
    return;
  }
  const cat = siteData.categories.find((c) => c.id === id);
  cat.name = newName;
  saveSiteData(siteData);
  populateCategorySelect();
  renderCategoryList();
  renderList();
}

function deleteCategory(id) {
  const count = siteData.gpts.filter((g) => g.category === id).length;
  if (count > 0) {
    alert(
      `이 카테고리에는 아직 챗봇 ${count}개가 등록되어 있어 삭제할 수 없습니다.\n먼저 해당 챗봇들을 다른 카테고리로 옮기거나 삭제해 주세요.`
    );
    return;
  }
  if (siteData.categories.length <= 1) {
    alert("최소 1개의 카테고리는 남아 있어야 합니다.");
    return;
  }
  if (!confirm("이 카테고리를 삭제할까요?")) return;
  siteData.categories = siteData.categories.filter((c) => c.id !== id);
  saveSiteData(siteData);
  populateCategorySelect();
  renderCategoryList();
  renderList();
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
