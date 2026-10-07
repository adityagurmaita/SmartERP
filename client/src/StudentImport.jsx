import { useState } from "react";
export default function StudentImport({ api }) {
  const [csv, setCsv] = useState(""),
    [preview, setPreview] = useState(null),
    [result, setResult] = useState(null),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel">
        <h2>Import students</h2>
        <p>
          Download the template, fill a CSV, then preview every row. This
          imports new accounts only. Existing students and passwords are never
          overwritten.
        </p>
        <p className="muted">
          Maximum 200 rows / 80 KB per batch. The public demo accepts only
          fictional .demo or example.invalid emails. Real data belongs in a
          college-approved private deployment.
        </p>
        <a className="small-btn" href="/api/admin/import/template" download>
          Download CSV template
        </a>
        <label>
          Student CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) =>
              run(async () => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 80000) throw Error("CSV must be at most 80 KB");
                setCsv(await file.text());
                setPreview(null);
                setResult(null);
              })
            }
          />
        </label>
        <label>
          CSV contents
          <textarea
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setPreview(null);
              setResult(null);
            }}
            rows={6}
            placeholder="name,rollNumber,email,department,semester,section"
          />
        </label>
        <button
          className="primary"
          disabled={busy || !csv.trim()}
          onClick={() =>
            run(async () => {
              setPreview(
                await api("/admin/import/preview", {
                  method: "POST",
                  body: JSON.stringify({ csv }),
                }),
              );
              setResult(null);
            })
          }
        >
          Preview import
        </button>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <section className="panel">
          <h2>Import preview</h2>
          <p>
            {preview.valid} valid · {preview.invalid} invalid. Preview expires
            in 15 minutes. Fix every invalid row before committing.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CSV row</th>
                  <th>Student</th>
                  <th>Email / roll</th>
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.data.name}</td>
                    <td>
                      {r.data.email}
                      <small className="block muted">{r.data.rollNumber}</small>
                    </td>
                    <td>{r.errors.length ? r.errors.join("; ") : "Ready"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!result && preview.invalid === 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !confirm(
                    `Create ${preview.valid} new student accounts? Existing accounts will not be changed.`,
                  )
                )
                  return;
                run(async () => {
                  setResult(
                    await api("/admin/import/commit", {
                      method: "POST",
                      body: JSON.stringify({
                        previewId: preview.previewId,
                        initialPassword: password,
                      }),
                    }),
                  );
                  setPassword("");
                });
              }}
            >
              <label>
                Initial password for these new accounts
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              <p className="muted">
                Prototype onboarding uses an initial batch password. A real
                college rollout needs secure individual invitations and
                first-login password changes. Never reuse your own password.
              </p>
              <button className="primary" disabled={busy}>
                Confirm import
              </button>
            </form>
          )}
        </section>
      )}
      {result && (
        <section className="panel" role="status">
          <h2>Import result</h2>
          <p>
            {result.created} created · {result.failed} failed.
          </p>
          {result.failed > 0 && (
            <p>
              Some rows failed at commit time. Created accounts remain. Retry
              only failed rows in a new CSV preview.
            </p>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Email</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.email}</td>
                    <td>
                      {r.status}
                      {r.error ? ": " + r.error : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
