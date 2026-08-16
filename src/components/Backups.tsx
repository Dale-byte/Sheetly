import { useCallback, useEffect, useState } from "react";
import {
  errMsg,
  fetchDataFile,
  fetchDataFileAtSha,
  listCommits,
  writeDataFile,
  type Commit,
  type GitHubConfig,
} from "@/lib/github-store";

function fmtDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

function forceDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Backups({ cfg, onReload }: { cfg: GitHubConfig; onReload: () => void }) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCommits(await listCommits(cfg, 50));
    } catch (e: unknown) {
      setErr(errMsg(e));
    }
  }, [cfg]);

  useEffect(() => {
    setErr(null);
    load();
  }, [load]);

  async function downloadVersion(sha: string) {
    try {
      const file = await fetchDataFileAtSha(cfg, sha);
      forceDownload(
        new Blob([file.content], { type: "application/json" }),
        `sheetly-${sha.slice(0, 7)}.json`,
      );
    } catch (e: unknown) {
      setErr(errMsg(e));
    }
  }

  async function restoreVersion(sha: string) {
    if (
      !confirm(
        "Restore this version? This overwrites your current budget with the data saved in this version.",
      )
    )
      return;
    setErr(null);
    setBusy(true);
    try {
      const file = await fetchDataFileAtSha(cfg, sha);
      const current = await fetchDataFile(cfg);
      await writeDataFile(cfg, file.content, current?.sha, `Restore ${sha.slice(0, 7)}`);
      onReload();
      await load();
    } catch (e: unknown) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function runNow() {
    setBusy(true);
    setErr(null);
    try {
      const current = await fetchDataFile(cfg);
      if (!current)
        throw new Error("No budget data yet - open the Budget tab and make a change first.");
      await writeDataFile(cfg, current.content, current.sha, "Manual backup");
      await load();
    } catch (e: unknown) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function importBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const snapshot =
        parsed?.budget_data?.data ?? parsed?.budget_data ?? (parsed?.sheets ? parsed : null);
      if (!snapshot) throw new Error("Could not find budget data in that file.");
      if (!confirm("Restore this backup's budget data now? This replaces your current data.")) {
        return;
      }
      const current = await fetchDataFile(cfg);
      const content = typeof snapshot === "string" ? snapshot : JSON.stringify(snapshot);
      await writeDataFile(cfg, content, current?.sha, "Import backup");
      onReload();
      await load();
    } catch (e: unknown) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div
      style={{
        padding: 24,
        color: "#f3f4f6",
        fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 24 }}>Backups</h1>
      <p style={{ color: "#9ca3af", marginTop: 4, fontSize: 14 }}>
        Every save creates a new version in your repo's git history. Download a copy to your
        computer, or restore an older version. <strong>Run backup now</strong> snapshots the current
        state as a marked version.
      </p>

      <section style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16 }}>Version history ({commits.length})</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label
              style={{
                ...btnPrimary,
                background: "#374151",
                display: "inline-flex",
                alignItems: "center",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              Import backup
              <input
                type="file"
                accept="application/json,.json"
                onChange={importBackup}
                disabled={busy}
                style={{ display: "none" }}
              />
            </label>
            <button onClick={runNow} disabled={busy} style={btnPrimary}>
              {busy ? "Working…" : "Run backup now"}
            </button>
          </div>
        </div>

        {err && <div style={{ color: "#fca5a5", fontSize: 13, marginTop: 8 }}>{err}</div>}

        {commits.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 12 }}>
            No versions yet. Open the Budget tab and make a change to create your first one.
          </p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr
                  style={{ textAlign: "left", color: "#9ca3af", borderBottom: "1px solid #374151" }}
                >
                  <th style={th}>Commit</th>
                  <th style={th}>Message</th>
                  <th style={th}>Saved</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {commits.map((c) => (
                  <tr key={c.sha} style={{ borderBottom: "1px solid #1f2937" }}>
                    <td style={td}>{c.sha.slice(0, 7)}</td>
                    <td style={td}>{c.message}</td>
                    <td style={td}>{fmtDate(c.date)}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button onClick={() => downloadVersion(c.sha)} style={btnGhost}>
                        Download
                      </button>
                      <button onClick={() => restoreVersion(c.sha)} style={btnGhost}>
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#1f2937",
  padding: 16,
  borderRadius: 10,
  marginTop: 16,
  border: "1px solid #374151",
};
const btnPrimary: React.CSSProperties = {
  padding: "6px 14px",
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
};
const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "#93c5fd",
  border: "1px solid #374151",
  borderRadius: 4,
  padding: "3px 10px",
  cursor: "pointer",
  fontSize: 12,
  marginLeft: 4,
};
const th: React.CSSProperties = { padding: "8px 8px", fontWeight: 500 };
const td: React.CSSProperties = { padding: "8px 8px", color: "#e5e7eb" };
