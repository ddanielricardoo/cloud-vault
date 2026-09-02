import { deleteFile, downloadFile, getFiles, uploadFile } from "./api.js";
import { categoryOf, fileIcon, formatBytes, formatDate } from "./file-utils.js";
import { icon } from "./icons.js";

const app = document.querySelector("#app");
const picker = document.querySelector("#file-picker");
const categories = [
  ["dashboard", "Dashboard", "grid"], ["documents", "Documents", "file-text"],
  ["images", "Images", "image"], ["media", "Media", "media"], ["others", "Others", "folder"],
];
const state = { files: [], page: "dashboard", query: "", sort: "newest", view: "grid", modal: null, menu: null, busy: false };

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function user() {
  // Replace this provider when authentication is connected.
  return { name: "Your account", email: "you@example.com", avatarUrl: "" };
}

function filesForPage() {
  let files = state.page === "dashboard" ? state.files : state.files.filter(file => categoryOf(file.name) === state.page);
  const query = state.query.trim().toLowerCase();
  if (query) files = files.filter(file => file.name.toLowerCase().includes(query));
  return [...files].sort((a, b) => state.sort === "name" ? a.name.localeCompare(b.name) : new Date(b.last_modified || 0) - new Date(a.last_modified || 0));
}

function storageUsed() { return state.files.reduce((total, file) => total + (Number(file.size) || 0), 0); }
function categoryFiles(category) { return state.files.filter(file => categoryOf(file.name) === category); }

function logo() {
  return `<a class="brand" href="#dashboard" data-page="dashboard"><img src="./assets/cloud-icon-12876.png" alt="" /><span>Storage</span></a>`;
}

function sideNav() {
  const account = user();
  return `<aside class="sidebar">
    ${logo()}
    <nav aria-label="File sections">${categories.map(([key, label, glyph]) => `<button class="nav-item ${state.page === key ? "active" : ""}" data-page="${key}">${icon(glyph, 17)}<span>${label}</span></button>`).join("")}</nav>
    <div class="sidebar-art" aria-hidden="true"><div class="art-folder">${icon("folder", 54)}</div><div class="art-search">${icon("search", 37)}</div><div class="art-file">${icon("file-text", 25)}</div></div>
    <div class="profile"><div class="avatar">${account.avatarUrl ? `<img src="${escapeHtml(account.avatarUrl)}" alt="" />` : account.name.slice(0, 1)}</div><div><strong>${escapeHtml(account.name)}</strong><small>${escapeHtml(account.email)}</small></div></div>
  </aside>`;
}

function header() {
  return `<header class="topbar"><label class="search"><span>${icon("search", 15)}</span><input id="search-input" value="${escapeHtml(state.query)}" placeholder="Search your files" /></label><button class="upload-button" data-action="pick-files">${icon("upload", 17)}<span>Upload</span></button></header>`;
}

function fileVisual(file, small = false) {
  const [glyph, className] = fileIcon(file.name);
  return `<span class="file-visual ${className} ${small ? "small" : ""}">${icon(glyph, small ? 17 : 25)}</span>`;
}

function actionMenu(file) {
  return `<div class="context-menu" role="menu"><button data-action="unavailable" data-feature="Rename">${icon("file-text", 16)}Rename</button><button data-action="details" data-file="${escapeHtml(file.name)}">${icon("info", 16)}Details</button><button data-action="unavailable" data-feature="Sharing">${icon("file", 16)}Share</button><button data-action="download" data-file="${escapeHtml(file.name)}">${icon("download", 16)}Download</button><button class="danger" data-action="delete" data-file="${escapeHtml(file.name)}">${icon("trash", 16)}Move to Trash</button></div>`;
}

function fileCard(file) {
  const selected = state.menu === file.name;
  return `<article class="file-card"><div class="file-card-head">${fileVisual(file)}<button class="more-button" aria-label="Actions for ${escapeHtml(file.name)}" data-action="menu" data-file="${escapeHtml(file.name)}">${icon("more", 20)}</button>${selected ? actionMenu(file) : ""}</div><strong title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong><div class="file-meta"><span>${formatDate(file.last_modified)}</span><span>${formatBytes(file.size)}</span></div></article>`;
}

function emptyState(message = "No files here yet") {
  return `<div class="empty-state">${icon("cloud", 44)}<h3>${message}</h3><p>Upload a file to keep it organized and available from CloudVault.</p><button class="upload-button" data-action="pick-files">${icon("upload", 17)}Upload files</button></div>`;
}

function fileGrid(files, title) {
  return `<main class="content-shell"><div class="content-heading"><div><h1>${title}</h1><p>Total: <b>${formatBytes(files.reduce((sum, file) => sum + (Number(file.size) || 0), 0))}</b></p></div><div class="toolbar"><label>Sort by <select id="sort-select"><option value="newest" ${state.sort === "newest" ? "selected" : ""}>Date created (newest)</option><option value="name" ${state.sort === "name" ? "selected" : ""}>Name (A-Z)</option></select></label><button class="view-button ${state.view === "list" ? "active" : ""}" data-action="view" data-view="list" aria-label="List view">${icon("list", 18)}</button><button class="view-button ${state.view === "grid" ? "active" : ""}" data-action="view" data-view="grid" aria-label="Grid view">${icon("grid", 18)}</button></div></div>${files.length ? `<section class="file-grid ${state.view === "list" ? "list-view" : ""}">${files.map(fileCard).join("")}</section>` : emptyState(state.query ? "No matching files" : "No files here yet")}</main>`;
}

function quotaCard() {
  const used = storageUsed();
  const limit = 128 * 1024 ** 3;
  const percentage = Math.min(100, Math.round((used / limit) * 100));
  return `<section class="quota-card"><div class="quota-ring" style="--percentage:${percentage}%"><div><b>${percentage}%</b><small>Space used</small></div></div><div><p>Available Storage</p><strong>${formatBytes(Math.max(0, limit - used))} <small>/ 128 GB</small></strong></div></section>`;
}

function statCard(category, label, glyph, color) {
  const files = categoryFiles(category); const bytes = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  return `<button class="stat-card" data-page="${category}"><span class="stat-icon ${color}">${icon(glyph, 19)}</span><span><b>${formatBytes(bytes)}</b><strong>${label}</strong><small>${files.length ? `${files.length} file${files.length === 1 ? "" : "s"}` : "No files yet"}</small></span></button>`;
}

function recentList(files) {
  return `<section class="recent-card"><h2>Recent files uploaded</h2>${files.length ? `<div class="recent-list">${files.slice(0, 8).map(file => `<button class="recent-row" data-action="details" data-file="${escapeHtml(file.name)}">${fileVisual(file, true)}<span><strong>${escapeHtml(file.name)}</strong><small>${formatDate(file.last_modified)}</small></span>${icon("chevron", 17)}</button>`).join("")}</div>` : `<div class="recent-empty">Your recent uploads will appear here.</div>`}</section>`;
}

function dashboard() {
  const recent = filesForPage();
  return `<main class="dashboard"><section class="dashboard-left">${quotaCard()}<div class="stat-grid">${statCard("documents", "Documents", "file-text", "blue")}${statCard("images", "Images", "image", "purple")}${statCard("media", "Media", "media", "mint")}${statCard("others", "Others", "folder", "pink")}</div></section>${recentList(recent)}</main>`;
}

function modal() {
  const file = state.modal && state.files.find(item => item.name === state.modal.name);
  if (!file) return "";
  const title = state.modal.type === "delete" ? "Move to Trash" : "File details";
  const body = state.modal.type === "delete"
    ? `<p class="confirm-copy">Are you sure you want to move <b>${escapeHtml(file.name)}</b> to Trash?</p><div class="modal-actions"><button class="text-button" data-action="close-modal">Cancel</button><button class="primary-button" data-action="confirm-delete">Move</button></div>`
    : `<div class="detail-file">${fileVisual(file)}<div><strong>${escapeHtml(file.name)}</strong><small>${formatDate(file.last_modified)}</small></div></div><dl class="details"><div><dt>Format</dt><dd>${escapeHtml(file.name.includes(".") ? file.name.split(".").pop().toUpperCase() : "Unknown")}</dd></div><div><dt>Size</dt><dd>${formatBytes(file.size)}</dd></div><div><dt>Category</dt><dd>${categoryOf(file.name)}</dd></div><div><dt>Last updated</dt><dd>${formatDate(file.last_modified)}</dd></div></dl><div class="modal-actions"><button class="text-button" data-action="download" data-file="${escapeHtml(file.name)}">Download</button><button class="primary-button" data-action="close-modal">Done</button></div>`;
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" aria-label="Close">${icon("close", 17)}</button><h2 id="modal-title">${title}</h2>${body}</section></div>`;
}

function render() {
  const pageLabel = categories.find(([key]) => key === state.page)?.[1] || "Dashboard";
  app.innerHTML = `<div class="app-layout">${sideNav()}<section class="workspace">${header()}<div class="page-body">${state.page === "dashboard" ? dashboard() : fileGrid(filesForPage(), pageLabel)}</div></section></div>${modal()}<div id="toast" class="toast" role="status"></div>`;
}

function toast(message, type = "success") { const element = document.querySelector("#toast"); element.textContent = message; element.className = `toast show ${type}`; window.setTimeout(() => { element.className = "toast"; }, 3500); }

async function refresh() { state.busy = true; render(); try { state.files = await getFiles(); } catch (error) { toast(`Could not load files: ${error.message}`, "error"); } finally { state.busy = false; render(); } }

app.addEventListener("click", async event => {
  const target = event.target.closest("[data-action], [data-page]"); if (!target) return;
  const action = target.dataset.action;
  if (target.dataset.page) { state.page = target.dataset.page; state.menu = null; state.query = ""; render(); return; }
  if (action === "pick-files") picker.click();
  if (action === "menu") { state.menu = state.menu === target.dataset.file ? null : target.dataset.file; render(); }
  if (action === "view") { state.view = target.dataset.view; render(); }
  if (action === "details") { state.menu = null; state.modal = { type: "details", name: target.dataset.file }; render(); }
  if (action === "unavailable") { state.menu = null; render(); toast(`${target.dataset.feature} will be available when its backend API is added.`); }
  if (action === "delete") { state.menu = null; state.modal = { type: "delete", name: target.dataset.file }; render(); }
  if (action === "close-modal") { state.modal = null; render(); }
  if (action === "download") downloadFile(target.dataset.file);
  if (action === "confirm-delete") { const name = state.modal.name; try { await deleteFile(name); state.modal = null; toast(`${name} moved to Trash`); await refresh(); } catch (error) { toast(`Could not delete file: ${error.message}`, "error"); } }
});

app.addEventListener("input", event => { if (event.target.id === "search-input") { state.query = event.target.value; render(); document.querySelector("#search-input")?.focus(); } });
app.addEventListener("change", event => { if (event.target.id === "sort-select") { state.sort = event.target.value; render(); } });
picker.addEventListener("change", async () => { const files = [...picker.files]; if (!files.length) return; try { for (const file of files) await uploadFile(file); toast(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`); await refresh(); } catch (error) { toast(`Upload failed: ${error.message}`, "error"); } finally { picker.value = ""; } });

render();
refresh();
