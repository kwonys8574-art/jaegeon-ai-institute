// 공통 데이터 로직 (index.html, admin.html에서 함께 사용)
const STORAGE_KEY = "jaegeonAiSiteData";

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
  const content = "// 재건교회 AI 학술연구소 - 데이터 파일 (관리자 페이지에서 내보냄)\n" +
    "window.SITE_DATA = " + JSON.stringify(data, null, 2) + ";\n";
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
