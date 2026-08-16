// GitHub-backed storage for Sheetly.
// The budget snapshot lives in a single JSON file (DATA_PATH) in a private
// GitHub repo. Every save goes through the contents API, which creates a new
// commit - so the repo's git history is the backup system.
export type GitHubConfig = {
  owner: string;
  repo: string;
  token: string;
};

export type DataFile = {
  content: string;
  sha: string;
};

export type Commit = {
  sha: string;
  message: string;
  date: string;
  author: string;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function errMsg(e: unknown, fallback = "Something went wrong"): string {
  if (e instanceof Error && e.message) return e.message;
  return String(e);
}

export const DATA_PATH = "budget.json";

const CONFIG_KEY = "sheetly_github_config";
const API = "https://api.github.com";

type RepoInfo = {
  owner: { login?: string } | null;
  name?: string;
  private?: boolean;
};

type ContentsItem = {
  encoding?: string;
  content?: string;
  sha: string;
};

type CommitItem = {
  sha: string;
  commit?: {
    message?: string;
    committer?: { date?: string } | null;
    author?: { date?: string; name?: string } | null;
  };
};

type WriteBody = {
  message: string;
  content: string;
  sha?: string;
};

function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const repoPath = (cfg: GitHubConfig, suffix: string) =>
  `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}${suffix}`;

async function gh<T>(
  cfg: GitHubConfig,
  method: string,
  urlPath: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(API + urlPath, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const j = (await res.json()) as { message?: string };
      if (j && typeof j.message === "string") message = j.message;
    } catch {
      // keep default message
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export function loadConfig(): GitHubConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<GitHubConfig>;
    if (c && c.owner && c.repo && c.token) return c as GitHubConfig;
  } catch {
    // ignore
  }
  return null;
}

export function saveConfig(cfg: GitHubConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function clearConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

export async function testConnection(
  cfg: GitHubConfig,
): Promise<{ owner: string; repo: string; isPrivate: boolean }> {
  const repo = await gh<RepoInfo>(cfg, "GET", repoPath(cfg, ""));
  return {
    owner: repo.owner?.login ?? cfg.owner,
    repo: repo.name ?? cfg.repo,
    isPrivate: repo.private ?? false,
  };
}

export async function fetchDataFile(cfg: GitHubConfig): Promise<DataFile | null> {
  try {
    const res = await gh<ContentsItem>(cfg, "GET", repoPath(cfg, `/contents/${DATA_PATH}`));
    if (res.encoding === "base64" && typeof res.content === "string") {
      return { content: fromBase64(res.content), sha: res.sha };
    }
    return null;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function writeDataFile(
  cfg: GitHubConfig,
  content: string,
  sha?: string,
  message = "Update budget",
): Promise<void> {
  const body: WriteBody = { message, content: toBase64(content) };
  if (sha) body.sha = sha;
  await gh<unknown>(cfg, "PUT", repoPath(cfg, `/contents/${DATA_PATH}`), body);
}

export async function listCommits(cfg: GitHubConfig, perPage = 50): Promise<Commit[]> {
  const res = await gh<CommitItem[]>(
    cfg,
    "GET",
    repoPath(cfg, `/commits?path=${encodeURIComponent(DATA_PATH)}&per_page=${perPage}`),
  );
  return res.map((c) => ({
    sha: c.sha,
    message: c.commit?.message ?? "",
    date: c.commit?.committer?.date ?? c.commit?.author?.date ?? "",
    author: c.commit?.author?.name ?? "",
  }));
}

export async function fetchDataFileAtSha(cfg: GitHubConfig, sha: string): Promise<DataFile> {
  const res = await gh<ContentsItem>(
    cfg,
    "GET",
    repoPath(cfg, `/contents/${DATA_PATH}?ref=${encodeURIComponent(sha)}`),
  );
  if (res.encoding !== "base64" || typeof res.content !== "string") {
    throw new ApiError("Malformed file content", 200);
  }
  return { content: fromBase64(res.content), sha: res.sha };
}
