const API_BASE = window.CLOUDVAULT_API_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { const body = await response.json(); message = body.detail || body.message || message; } catch { /* no JSON */ }
    throw new Error(message);
  }
  return response;
}

export async function getFiles() { return (await request("/files")).json(); }
export async function uploadFile(file) {
  const data = new FormData(); data.append("file", file);
  return (await request("/files", { method: "POST", body: data })).json();
}
export function downloadFile(name) { window.location.assign(`${API_BASE}/files/${encodeURIComponent(name)}/download`); }
export async function deleteFile(name) { return (await request(`/files/${encodeURIComponent(name)}`, { method: "DELETE" })).json(); }
