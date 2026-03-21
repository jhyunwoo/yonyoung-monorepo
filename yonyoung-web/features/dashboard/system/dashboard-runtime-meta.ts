import "server-only";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

const execFileAsync = promisify(execFile);

export type DashboardRuntimeProjectMeta = {
  version: string;
  updatedAt: number | null;
};

export type DashboardRuntimeMeta = {
  web: DashboardRuntimeProjectMeta;
  api: DashboardRuntimeProjectMeta;
};

const readPackageVersion = async (packageJsonPath: string): Promise<string> => {
  try {
    const packageJson = await readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(packageJson) as { version?: unknown };

    return typeof parsed.version === "string" && parsed.version.trim().length > 0
      ? parsed.version.trim()
      : "unknown";
  } catch {
    return "unknown";
  }
};

const readGitUpdatedAt = async (repoRoot: string): Promise<number | null> => {
  try {
    const { stdout } = await execFileAsync("git", [
      "-C",
      repoRoot,
      "log",
      "-1",
      "--format=%cI",
    ]);
    const timestampMs = Date.parse(stdout.trim());

    return Number.isFinite(timestampMs) ? timestampMs : null;
  } catch {
    return null;
  }
};

const readFileUpdatedAt = async (filePath: string): Promise<number | null> => {
  try {
    const packageStat = await stat(filePath);
    return Number.isFinite(packageStat.mtimeMs) ? packageStat.mtimeMs : null;
  } catch {
    return null;
  }
};

const readProjectMeta = async (projectRoot: string): Promise<DashboardRuntimeProjectMeta> => {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const [version, gitUpdatedAt, fileUpdatedAt] = await Promise.all([
    readPackageVersion(packageJsonPath),
    readGitUpdatedAt(projectRoot),
    readFileUpdatedAt(packageJsonPath),
  ]);

  return {
    version,
    updatedAt: gitUpdatedAt ?? fileUpdatedAt,
  };
};

export const readDashboardRuntimeMeta = cache(
  async (): Promise<DashboardRuntimeMeta> => {
    const webRoot = process.cwd();
    const apiRoot = path.resolve(webRoot, "../yonyoung-api");
    const [web, api] = await Promise.all([
      readProjectMeta(webRoot),
      readProjectMeta(apiRoot),
    ]);

    return {
      web,
      api,
    };
  },
);
