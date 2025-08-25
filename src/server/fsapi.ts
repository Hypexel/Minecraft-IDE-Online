import fs from 'fs';
import path from 'path';


export function ensureDir(p: string) {
fs.mkdirSync(p, { recursive: true });
}


export function writeFileSafe(full: string, data: string) {
ensureDir(path.dirname(full));
fs.writeFileSync(full, data, 'utf8');
}


export function copyDir(src: string, dst: string) {
ensureDir(dst);
for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
const s = path.join(src, entry.name);
const d = path.join(dst, entry.name);
if (entry.isDirectory()) copyDir(s, d);
else fs.copyFileSync(s, d);
}
}


export function deletePath(p: string) {
if (!fs.existsSync(p)) return;
const stat = fs.statSync(p);
if (stat.isDirectory()) fs.rmSync(p, { recursive: true, force: true });
else fs.unlinkSync(p);
}


export function listTree(root: string) {
function walk(p: string): any {
const rel = path.relative(root, p) || '';
const name = path.basename(p) || path.basename(root);
const stat = fs.statSync(p);
if (stat.isDirectory()) {
return {
type: 'dir', name, path: rel,
children: fs.readdirSync(p).map(c => walk(path.join(p, c)))
};
}
return { type: 'file', name, path: rel };
<ver
