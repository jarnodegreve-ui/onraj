// Minimale GitHub Contents-API helper (rauwe fetch, geen SDK) om notitie-
// bestanden naar een privé repo te schrijven. Die repo synct Jarno via de
// Obsidian Git-plugin naar zijn lokale vault.

const API_BASE = "https://api.github.com";

const token = process.env.GITHUB_TOKEN ?? "";
const repo = process.env.GITHUB_REPO ?? ""; // formaat: "eigenaar/repo"
const branch = process.env.GITHUB_BRANCH ?? "main";

export const githubConfigured = Boolean(token && repo);

// Submap in de repo/vault waar de ONRAJ-notities terechtkomen.
export const vaultDir = (process.env.GITHUB_NOTES_DIR ?? "ONRAJ").replace(
  /^\/+|\/+$/g,
  "",
);

function ghHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

// Huidige blob-sha van een bestand (vereist om te updaten/verwijderen), of null.
async function getSha(path: string): Promise<string | null> {
  const res = await fetch(
    `${API_BASE}/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`,
    { headers: ghHeaders(), cache: "no-store" },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub-status ${res.status} bij ophalen ${path}`);
  }
  const data = (await res.json()) as { sha?: string };
  return data.sha ?? null;
}

export async function putFile(
  path: string,
  content: string,
  message: string,
): Promise<void> {
  const sha = await getSha(path);
  const res = await fetch(
    `${API_BASE}/repos/${repo}/contents/${encodePath(path)}`,
    {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
        ...(sha ? { sha } : {}),
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `GitHub-status ${res.status} bij schrijven ${path}: ${text.slice(0, 200)}`,
    );
  }
}

// Lijst van bestandspaden in een map (voor opruimen van weesbestanden, bv. na
// het hernoemen van notities). Lege array als de map nog niet bestaat.
export async function listDir(path: string): Promise<string[]> {
  const res = await fetch(
    `${API_BASE}/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`,
    { headers: ghHeaders(), cache: "no-store" },
  );
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`GitHub-status ${res.status} bij lijst ${path}`);
  }
  const data = (await res.json()) as Array<{ path: string; type: string }>;
  return data.filter((entry) => entry.type === "file").map((entry) => entry.path);
}

// Alle bestandspaden onder een prefix, recursief (incl. submappen per categorie)
// via de Git Trees-API. Lege array bij een lege repo / ontbrekende branch.
export async function listTreeFiles(prefix: string): Promise<string[]> {
  const res = await fetch(
    `${API_BASE}/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: ghHeaders(), cache: "no-store" },
  );
  if (res.status === 404 || res.status === 409) return [];
  if (!res.ok) {
    throw new Error(`GitHub-status ${res.status} bij boom-listing`);
  }
  const data = (await res.json()) as {
    tree?: Array<{ path: string; type: string }>;
  };
  const pre = prefix.endsWith("/") ? prefix : `${prefix}/`;
  return (data.tree ?? [])
    .filter((entry) => entry.type === "blob" && entry.path.startsWith(pre))
    .map((entry) => entry.path);
}

export async function deleteFile(path: string, message: string): Promise<void> {
  const sha = await getSha(path);
  if (!sha) return; // bestaat al niet meer
  const res = await fetch(
    `${API_BASE}/repos/${repo}/contents/${encodePath(path)}`,
    {
      method: "DELETE",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message, sha, branch }),
    },
  );
  if (!res.ok) {
    throw new Error(`GitHub-status ${res.status} bij verwijderen ${path}`);
  }
}
