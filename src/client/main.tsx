import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { FileNode } from "./types";

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "/api";

function api(path: string, opts?: RequestInit) {
  return fetch(API_BASE + path, opts).then(async (r) => {
    const t = await r.json().catch(() => null);
    if (!r.ok) throw t || new Error("Network error");
    return t;
  });
}

function FileTree({
  node,
  onOpen,
  onNewFile,
  onNewFolder,
  onDelete,
}: {
  node: FileNode | null;
  onOpen: (p: string) => void;
  onNewFile: (dir: string) => void;
  onNewFolder: (dir: string) => void;
  onDelete: (p: string) => void;
}) {
  if (!node) return <div className="muted">Loading…</div>;

  function render(n: FileNode) {
    if (n.type === "file") {
      return (
        <div key={n.path} className="file" onClick={() => onOpen(n.path)}>
          <span>📄 {n.name}</span>
          <span>
            <button onClick={(e) => { e.stopPropagation(); onDelete(n.path); }}>✖</button>
          </span>
        </div>
      );
    }
    return (
      <div key={n.path} style={{ marginBottom: 6 }}>
        <div className="dir">
          📁 {n.name}
          <span style={{ float: "right" }}>
            <button onClick={() => onNewFile(n.path)}>+file</button>{" "}
            <button onClick={() => onNewFolder(n.path)}>+dir</button>{" "}
            {n.path && <button onClick={() => onDelete(n.path)}>✖</button>}
          </span>
        </div>
        <div style={{ paddingLeft: 12 }}>
          {n.children?.map((c) => render(c))}
        </div>
      </div>
    );
  }

  return <div>{render(node)}</div>;
}

function App() {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [path, setPath] = useState<string>("pom.xml");
  const [code, setCode] = useState<string>("");
  const [jarUrl, setJarUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function refreshTree(openPath?: string) {
    try {
      const t = await api("/fs/tree");
      setTree(t);
      if (openPath) openFile(openPath);
    } catch (e: any) {
      alert("Failed to list tree: " + (e?.error || e?.message || e));
    }
  }

  async function initProject() {
    if (!confirm("Reset project to default template? This will overwrite current project.")) return;
    setLoading(true);
    try {
      await api("/project/init", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      await refreshTree("pom.xml");
      alert("Project initialized.");
    } catch (e: any) {
      alert("Init failed: " + (e?.error || e?.message || e));
    } finally { setLoading(false); }
  }

  async function openFile(p: string) {
    try {
      const res = await api("/fs/read?path=" + encodeURIComponent(p));
      setPath(res.path);
      setCode(res.data);
    } catch (e: any) {
      alert("Read failed: " + (e?.error || e?.message || e));
    }
  }

  async function save() {
    try {
      await api("/fs/write", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path, data: code }) });
      await refreshTree(path);
      alert("Saved.");
    } catch (e: any) {
      alert("Save failed: " + (e?.error || e?.message || e));
    }
  }

  async function newFile(dir: string) {
    const name = prompt("File name (relative to " + (dir || "/") + "):");
    if (!name) return;
    const p = (dir ? dir + "/" : "") + name;
    try {
      await api("/fs/write", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: p, data: "" }) });
      await refreshTree(p);
    } catch (e: any) { alert("Create file failed: " + (e?.error || e?.message || e)); }
  }

  async function newFolder(dir: string) {
    const name = prompt("Folder name (relative to " + (dir || "/") + "):");
    if (!name) return;
    const p = (dir ? dir + "/" : "") + name;
    try {
      await api("/fs/mkdir", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: p }) });
      await refreshTree();
    } catch (e: any) { alert("Create folder failed: " + (e?.error || e?.message || e)); }
  }

  async function remove(p: string) {
    if (!confirm("Delete " + p + "?")) return;
    try {
      await api("/fs/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: p }) });
      await refreshTree();
      if (p === path) { setPath(""); setCode(""); }
    } catch (e: any) { alert("Delete failed: " + (e?.error || e?.message || e)); }
  }

  async function build() {
    setLoading(true);
    try {
      const r = await api("/build", { method: "POST" });
      setJarUrl(r.jarPath);
      alert("Build finished — download at the link shown.");
    } catch (e: any) {
      alert("Build failed: " + (e?.error || e?.message || e));
    } finally { setLoading(false); }
  }

  useEffect(() => { refreshTree("pom.xml"); }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="topbar">
          <strong>Project</strong>
          <div style={{ marginLeft: "auto" }}>
            <button onClick={initProject} disabled={loading}>New Project</button>{" "}
            <button className="primary" onClick={build} disabled={loading}>Build JAR</button>
          </div>
        </div>

        {jarUrl && (
          <div style={{ padding: 8, background: "linear-gradient(90deg, rgba(16,185,129,0.08), transparent)", borderRadius: 6 }}>
            ✅ Built: <a className="download" href={jarUrl} target="_blank" rel="noreferrer">Download JAR</a>
          </div>
        )}

        <div className="file-tree" role="navigation">
          <FileTree node={tree} onOpen={openFile} onNewFile={newFile} onNewFolder={newFolder} onDelete={remove} />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <div className="muted">Backend: {API_BASE}</div>
          <div className="muted">Status: {loading ? "Working…" : "Idle"}</div>
        </div>
      </aside>

      <main className="editor-panel">
        <div className="editor-toolbar">
          <div><strong>{path || "No file selected"}</strong> <span className="muted"> — click files to open</span></div>
          <div style={{ marginLeft: "auto" }} className="controls">
            <button onClick={() => { if (!path) return alert("No path selected"); save(); }}>Save</button>
            <button onClick={() => { if (!path) return alert("No path selected"); navigator.clipboard.writeText(path).then(()=>alert("Path copied")); }}>Copy Path</button>
          </div>
        </div>

        <div className="editor">
          <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="// Open a file from the left to edit" />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { if (!path) return alert("No file open"); setCode("// revert to saved content\n" + code); alert("This action is a placeholder — you can implement revision tracking later."); }}>Revert (placeholder)</button>
          <div className="muted" style={{ marginLeft: "auto" }}>Tip: use the file tree to add / delete files & folders</div>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
