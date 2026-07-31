// ===== 관리자 비밀번호 설정 =====
// 비밀번호를 바꾸려면 아래 따옴표 안의 문자만 원하는 값으로 바꾸고 저장하세요.
// GitHub Actions 시크릿 ADMIN_PASSWORD 도 같은 값으로 맞춰 주세요.
const ADMIN_PASSWORD = "jaegun2026";
// ================================

// ===== GitHub 자동 반영용 토큰 =====
// Fine-grained PAT: Repository permissions → Actions: Read and write
// (저장소: kwonys8574-art/jaegeon-ai-institute 만 허용)
// 관리자 3명은 이 값을 외울 필요 없습니다. 로그인 비밀번호만 사용합니다.
const GITHUB_DISPATCH_TOKEN = "";
// ==================================

const SESSION_KEY = "jaegeonAiAdminLoggedIn";
const SESSION_PW_KEY = "jaegeonAiAdminPassword";
const TOKEN_STORAGE_KEY = "jaegeonAiDispatchToken";

let siteData = null;
let adminUiBound = false;
let syncSeq = 0;

function getDispatchToken() {
  return (localStorage.getItem(TOKEN_STORAGE_KEY) || GITHUB_DISPATCH_TOKEN || "").trim();
}

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
    sessionStorage.removeItem(SESSION_PW_KEY);
    location.reload();
  });
}

function handleLogin() {
  const pw = document.getElementById("pwInput").value;
  if (pw === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "yes");
    sessionStorage.setItem(SESSION_PW_KEY, pw);
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

async function showAdmin() {
  document.getElementById("loginView").style.display = "none";
  document.getElementById("adminView").style.display = "block";
  document.getElementById("logoutLink").style.display = "inline";

  setSyncStatus("loading", "GitHub 최신 데이터를 불러오는 중...");
  try {
    siteData = await fetchRemoteSiteData();
    saveSiteData(siteData);
    setSyncStatus("ok", "GitHub 최신 데이터를 불러왔습니다. 저장 시 자동으로 반영됩니다.");
  } catch (e) {
    console.warn(e);
    siteData = loadSiteData();
    setSyncStatus(
      "warn",
      "원격 데이터를 불러오지 못해 이 브라우저 저장본을 사용합니다. (" + e.message + ")"
    );
  }

  populateCategorySelect();
  renderCategoryList();
  renderList();

  if (!adminUiBound) {
    adminUiBound = true;
    document.getElementById("newBtn").addEventListener("click", () => openForm(null));
    document.getElementById("cancelEntryBtn").addEventListener("click", closeForm);
    document.getElementById("saveEntryBtn").addEventListener("click", saveEntry);
    document.getElementById("exportBtn").addEventListener("click", () => downloadDataJsFile(siteData));
    document.getElementById("newCategoryBtn").addEventListener("click", addCategory);
    document.getElementById("saveTokenBtn").addEventListener("click", saveDispatchToken);
    document.getElementById("clearTokenBtn").addEventListener("click", clearDispatchToken);
  }

  updateTokenSetupUi();
}

function updateTokenSetupUi() {
  const box = document.getElementById("tokenSetupBox");
  const status = document.getElementById("tokenStatusText");
  const title = document.getElementById("tokenSetupTitle");
  if (!box) return;
  box.style.display = "block";
  if (getDispatchToken()) {
    if (title) title.textContent = "GitHub 자동 반영 토큰 (등록됨 · 재입력 가능)";
    if (status) {
      status.className = "sync-status sync-ok";
      status.textContent = "토큰이 이 브라우저에 저장되어 있습니다. 바꾸려면 새 토큰을 넣고 다시 저장하세요.";
    }
    setSyncStatus("ok", "GitHub 자동 반영 준비가 완료되었습니다. 저장 시 자동으로 반영됩니다.");
  } else {
    if (title) title.textContent = "GitHub 자동 반영 토큰 (미등록)";
    if (status) {
      status.className = "sync-status sync-error";
      status.textContent = "아직 토큰이 없습니다. 아래에 토큰을 입력하고 저장해 주세요.";
    }
    setSyncStatus(
      "error",
      "GitHub 자동 반영 토큰이 필요합니다. 아래 칸에 토큰을 입력해 주세요."
    );
  }
}

function saveDispatchToken() {
  const input = document.getElementById("dispatchTokenInput");
  const token = (input.value || "").trim();
  if (!token) {
    alert("토큰을 입력해 주세요.");
    return;
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  input.value = "";
  updateTokenSetupUi();
  alert("토큰이 이 브라우저에 저장되었습니다. 이제 저장할 때마다 GitHub에 자동 반영됩니다.");
}

function clearDispatchToken() {
  if (!confirm("이 브라우저에 저장된 GitHub 토큰을 삭제할까요?")) return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  const input = document.getElementById("dispatchTokenInput");
  if (input) input.value = "";
  updateTokenSetupUi();
}

function setSyncStatus(kind, message) {
  const el = document.getElementById("syncStatus");
  if (!el) return;
  el.className = "sync-status sync-" + kind;
  el.textContent = message;
}

function getSessionPassword() {
  return sessionStorage.getItem(SESSION_PW_KEY) || ADMIN_PASSWORD;
}

async function persistSiteData() {
  saveSiteData(siteData);
  const seq = ++syncSeq;
  const submittedData = JSON.parse(JSON.stringify(siteData));
  setSyncStatus("syncing", "GitHub에 반영 중...");
  try {
    const requestId = await dispatchSiteDataUpdate(
      submittedData,
      getSessionPassword(),
      getDispatchToken()
    );
    if (seq !== syncSeq) return;
    setSyncStatus("syncing", "GitHub Actions에서 반영 중...");
    monitorSyncCompletion(requestId, submittedData, seq);
  } catch (e) {
    if (seq !== syncSeq) return;
    console.error(e);
    setSyncStatus("error", e.message + " (이 브라우저에는 저장됨)");
  }
}

async function monitorSyncCompletion(requestId, submittedData, seq) {
  try {
    const run = await waitForDispatchCompletion(requestId);
    if (seq !== syncSeq) return;
    if (run.conclusion !== "success") {
      throw new Error("GitHub Actions 반영에 실패했습니다.");
    }

    setSyncStatus("syncing", "GitHub 반영 완료 · 공개 사이트 적용 확인 중...");
    await waitForPublishedSiteData(submittedData);
    if (seq !== syncSeq) return;

    const completedAt = new Date(run.updated_at || Date.now()).toLocaleString("ko-KR");
    setSyncStatus("ok", `반영 완료: ${completedAt}`);
    setTimeout(() => {
      if (seq === syncSeq) {
        setSyncStatus("ok", `GitHub 자동 반영 준비 완료 · 마지막 반영 ${completedAt}`);
      }
    }, 10000);
  } catch (e) {
    if (seq !== syncSeq) return;
    console.error(e);
    setSyncStatus("error", e.message);
  }
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

async function addCategory() {
  const name = prompt("새 카테고리 이름을 입력하세요.");
  if (!name || !name.trim()) return;
  siteData.categories.push({ id: slugify(name), name: name.trim() });
  await persistSiteData();
  populateCategorySelect();
  renderCategoryList();
  renderList();
}

async function renameCategory(id, btn) {
  const item = btn.closest(".category-admin-item");
  const input = item.querySelector('[data-role="cat-name-input"]');
  const newName = input.value.trim();
  if (!newName) {
    alert("카테고리 이름을 입력해 주세요.");
    return;
  }
  const cat = siteData.categories.find((c) => c.id === id);
  cat.name = newName;
  await persistSiteData();
  populateCategorySelect();
  renderCategoryList();
  renderList();
}

async function deleteCategory(id) {
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
  await persistSiteData();
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

async function saveEntry() {
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

  await persistSiteData();
  closeForm();
  renderList();
}

async function deleteEntry(id) {
  if (!confirm("이 챗봇을 삭제할까요?")) return;
  siteData.gpts = siteData.gpts.filter((g) => g.id !== id);
  await persistSiteData();
  renderList();
}

document.addEventListener("DOMContentLoaded", init);
