import express from "express";
import path from "path";
import fs from "fs";
import { initTemplate } from "./projectTemplate";
import { listTree, readFileSafe, writeFileSafe, ensureDir, deletePath } from "./fileManager";
import { buildMaven } from "./maven";

const app = express();
app.use(express.json({ limit: "20mb" }));

// root project workspace (where the active plugin project will be)
const WORKSPACE = path.join(process.cwd(), "projects");
const PROJECT_DIR = path.join(WORKSPACE, "project"); // single active project; you can extend to multiple
const BUILDS_DIR = path.join(process.cwd(), "builds");

// ensure directories
fs.mkdirSync(WORKSPACE, { recursive: true });
fs.mkdirSync(BUILDS_DIR, { recursive: true });
fs.mkdirSync(PROJECT_DIR, { recursive: true });

// serve built jars
app.use("/downloads", express.static(BUILDS_DIR));

// helper for safe path resolution (prevents path traversal)
function resolveProjectPath(rel: string) {
  const target = path.join(PROJECT_DIR, rel || "");
  const normalized = path.normalize(target);
  if (!normalized.startsWith(PROJECT_DIR)) throw new Error("Invalid path");
  return normalized;
}

/* -------- API -------- */

// init project with template (overwrites)
app.post("/api/project/init", (req, res) => {
  try {
    const opts = req.body?.options || undefined;
    // remove existing project dir entirely and recreate template
    if (fs.existsSync(PROJECT_DIR)) fs.rmSync(PROJECT_DIR, { recursive: true, force: true });
    initTemplate(PROJECT_DIR, opts);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// list tree
app.get("/api/fs/tree", (req, res) => {
  try {
    const tree = listTree(PROJECT_DIR);
    res.json(tree);
  } catch (e: any) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// read file
app.get("/api/fs/read", (req, res) => {
  try {
    const p = String(req.query.path || "pom.xml");
    const full = resolveProjectPath(p);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) return res.status(400).json({ error: "path is a directory" });
    const data = readFileSafe(full);
    res.json({ path: p, data });
  } catch (e: any) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

// write/create file
app.post("/api/fs/write", (req, res) => {
  try {
    const { path: rel, data } = req.body as { path: string; data: string };
    if (!rel) return res.status(400).json({ error: "missing path" });
    const full = resolveProjectPath(rel);
    writeFileSafe(full, data);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// mkdir
app.post("/api/fs/mkdir", (req, res) => {
  try {
    const { path: rel } = req.body as { path: string };
    if (!rel) return res.status(400).json({ error: "missing path" });
    const full = resolveProjectPath(rel);
    ensureDir(full);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// delete
app.post("/api/fs/delete", (req, res) => {
  try {
    const { path: rel } = req.body as { path: string };
    if (!rel) return res.status(400).json({ error: "missing path" });
    const full = resolveProjectPath(rel);
    deletePath(full);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// build project with maven, return download URL
app.post("/api/build", async (req, res) => {
  try {
    const result = await buildMaven(PROJECT_DIR, BUILDS_DIR);
    // return path relative to /downloads (served statically)
    const relative = `/${result.id}/${path.basename(result.jarPath)}`;
    res.json({ ok: true, jarPath: `/downloads${relative}` });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  console.log(`[workspace] projectDir=${PROJECT_DIR}`);
});
