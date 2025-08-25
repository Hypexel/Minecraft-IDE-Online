import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { ensureDir } from "./fileManager";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Runs maven package in projectDir, copies produced JAR to buildsDir/<id>/ and returns
 * { id, jarPath }
 */
export async function buildMaven(projectDir: string, buildsDir?: string): Promise<{ id: string; jarPath: string }> {
  const MAVEN_BIN = process.env.MAVEN_BIN || "mvn";
  const id = genId();
  const buildsBase = buildsDir || path.join(process.cwd(), "builds");
  const outDir = path.join(buildsBase, id);
  ensureDir(outDir);

  await runCmd(MAVEN_BIN, ["-DskipTests", "package"], { cwd: projectDir });

  const targetDir = path.join(projectDir, "target");
  if (!fs.existsSync(targetDir)) throw new Error("Maven target directory not found. Build probably failed.");

  const files = await readdir(targetDir);
  // pick first jar that isn't original-*.jar (take the shaded jar if produced)
  const jar = files.find((f) => f.endsWith(".jar") && !f.endsWith("-sources.jar") && !f.endsWith("-javadoc.jar"));
  if (!jar) throw new Error("No JAR produced. Check your pom.xml and mvn output.");

  const src = path.join(targetDir, jar);
  const dest = path.join(outDir, jar);
  fs.copyFileSync(src, dest);

  return { id, jarPath: dest };
}

function runCmd(cmd: string, args: string[], opts: { cwd: string }) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: opts.cwd, shell: true, stdio: ["ignore", "pipe", "pipe"] });

    p.stdout.on("data", (d) => process.stdout.write(d));
    p.stderr.on("data", (d) => process.stderr.write(d));

    p.on("error", (err) => {
      reject(err);
    });
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}
