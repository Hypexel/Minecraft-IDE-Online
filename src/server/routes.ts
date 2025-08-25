import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import Archiver from 'archiver';
import { initTemplate, listTree, writeFileSafe, deletePath, ensureDir } from './fsapi.js';
import { buildMaven } from './build/maven.js';


export function router({ WORKDIR }: { WORKDIR: string }) {
const r = Router();
const PROJECT = path.join(WORKDIR, 'project');
const BUILDS = path.join(WORKDIR, '.builds');
ensureDir(PROJECT);
ensureDir(BUILDS);


// Create a fresh 1.21.5 Spigot Maven template project
r.post('/project/init', (_req, res) => {
initTemplate(PROJECT);
return res.json({ ok: true });
});


// List file tree
r.get('/fs/tree', (_req, res) => {
return res.json(listTree(PROJECT));
});


// Read a file
r.get('/fs/read', (req, res) => {
const p = req.query.path as string;
const full = path.join(PROJECT, p);
if (!full.startsWith(PROJECT)) return res.status(400).json({ error: 'bad path' });
if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) return res.status(404).json({ error: 'not found' });
const data = fs.readFileSync(full, 'utf8');
res.json({ path: p, data });
});


// Write/create a file (also creates folders)
r.post('/fs/write', (req, res) => {
const { path: rp, data } = req.body as { path: string; data: string };
const full = path.join(PROJECT, rp);
if (!full.startsWith(PROJECT)) return res.status(400).json({ error: 'bad path' });
writeFileSafe(full, data);
res.json({ ok: true });
});


// Make directory
r.post('/fs/mkdir', (req, res) => {
const { path: rp } = req.body as { path: string };
const full = path.join(PROJECT, rp);
if (!full.startsWith(PROJECT)) return res.status(400).json({ error: 'bad path' });
fs.mkdirSync(full, { recursive: true });
res.json({ ok: true });
});


// Delete file or directory (recursive)
r.post('/fs/delete', (req, res) => {
const { path: rp } = req.body as { path: string };
const full = path.join(PROJECT, rp);
if (!full.startsWith(PROJECT)) return res.status(400).json({ error: 'bad path' });
deletePath(full);
res.json({ ok: true });
});


// Download the whole project as zip
r.get('/project/archive.zip', (_req, res) => {
const archive = Archiver('zip', { zlib: { level: 9 } });
res.attachment('project.zip');
archive.pipe(res);
archive.directory(PROJECT, false);
archive.finalize();
});


// Build with Maven and return download URL
r.post('/build', async (_req, res) => {
try {
const { jarPath, id } = await buildMaven({ projectDir: PROJECT, buildsDir: BUILDS });
return res.json({ ok: true, jarPath: `/downloads/${id}/${path.basename(jarPath)}` });
} catch (e: any) {
return res.status(500).json({ ok: false, error: String(e?.message || e) });
}
});


return r;
}
