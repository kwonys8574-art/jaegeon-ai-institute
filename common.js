// 공통 데이터 로직 (index.html, admin.html에서 함께 사용)
const STORAGE_KEY = "jaegeonAiSiteData";

const GITHUB_REPO = {
  owner: "kwonys8574-art",
  repo: "jaegeon-ai-institute",
  branch: "main",
};

function loadSiteData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn("저장된 데이터를 읽는 중 오류, 기본 데이터를 사용합니다.", e);
    }
  }
  // 기본값은 깊은 복사해서 반환 (원본 훼손 방지)
  return JSON.parse(JSON.stringify(window.SITE_DATA));
}

function saveSiteData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function resetSiteData() {
  localStorage.removeItem(STORAGE_KEY);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function downloadDataJsFile(data) {
  const content =
    "// 재건교회 AI 학술연구소 - 데이터 파일 (관리자 페이지에서 내보냄)\n" +
    "window.SITE_DATA = " +
    JSON.stringify(data, null, 2) +
    ";\n";
  const blob = new Blob([content], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.js";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseSiteDataJs(text) {
  const match = text.match(/window\.SITE_DATA\s*=\s*(\{[\s\S]*\});?\s*$/m);
  if (!match) {
    throw new Error("data.js 형식을 읽을 수 없습니다.");
  }
  return JSON.parse(match[1]);
}

async function fetchRemoteSiteData() {
  const url =
    `https://raw.githubusercontent.com/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/` +
    `${GITHUB_REPO.branch}/data.js?t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("원격 data.js를 불러오지 못했습니다. (" + res.status + ")");
  }
  return parseSiteDataJs(await res.text());
}

async function dispatchSiteDataUpdate(data, password, token) {
  if (!token) {
    throw new Error("GitHub 동기화 토큰이 설정되지 않았습니다.");
  }
  const requestId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        event_type: "update-site-data",
        client_payload: {
          password,
          requestId,
          siteData: JSON.stringify(data),
        },
      }),
    }
  );
  if (res.status === 204) return requestId;
  let detail = "";
  try {
    const body = await res.json();
    detail = body.message || JSON.stringify(body);
  } catch (_) {
    detail = res.statusText;
  }
  throw new Error("GitHub 반영 요청 실패: " + (detail || res.status));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDispatchRun(requestId) {
  const url =
    `https://api.github.com/repos/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/` +
    `actions/runs?event=repository_dispatch&per_page=20&t=${Date.now()}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    throw new Error("GitHub Actions 상태를 확인하지 못했습니다. (" + res.status + ")");
  }
  const body = await res.json();
  return (body.workflow_runs || []).find(
    (run) => run.display_title === "Admin update " + requestId
  );
}

async function waitForDispatchCompletion(requestId, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const run = await fetchDispatchRun(requestId);
    if (run && run.status === "completed") return run;
    await delay(3000);
  }
  throw new Error("GitHub Actions 완료 확인 시간이 초과되었습니다.");
}

async function fetchPublishedSiteData() {
  const url =
    `https://${GITHUB_REPO.owner}.github.io/${GITHUB_REPO.repo}/data.js?t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("공개 사이트 데이터를 확인하지 못했습니다. (" + res.status + ")");
  }
  return parseSiteDataJs(await res.text());
}

async function waitForPublishedSiteData(expected, timeoutMs = 120000) {
  const expectedJson = JSON.stringify(expected);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const published = await fetchPublishedSiteData();
      if (JSON.stringify(published) === expectedJson) return;
    } catch (e) {
      console.warn(e);
    }
    await delay(4000);
  }
  throw new Error("GitHub에는 반영됐지만 공개 사이트 반영 확인 시간이 초과되었습니다.");
}
