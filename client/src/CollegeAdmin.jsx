import { useEffect, useState } from "react";
export default function CollegeAdmin({
  api,
  user,
  dark,
  setDark,
  onLogout,
  Fees,
  Requests,
}) {
  const [tab, setTab] = useState("Overview"),
    [users, setUsers] = useState([]),
    [courses, setCourses] = useState([]),
    [overview, setOverview] = useState(null),
    [notices, setNotices] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(null),
    [search, setSearch] = useState(""),
    [message, setMessage] = useState("");
  const tabs = [
    "Overview",
    "Students",
    "Faculty",
    "Subjects",
    "Notices",
    "Fees",
    "Requests",
  ];
  async function load() {
    const [u, c, o, n] = await Promise.all([
      api("/admin/users"),
      api("/admin/courses"),
      api("/admin/overview"),
      api("/notices"),
    ]);
    setUsers(u);
    setCourses(c);
    setOverview(o);
    setNotices(n);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function action(fn) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await load();
      setEditing(null);
      setMessage("Saved successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function change(n) {
    setTab(n);
    setEditing(null);
    setSearch("");
    setMessage("");
    setError("");
  }
  const people = users.filter(
    (u) =>
      u.role === (tab === "Faculty" ? "teacher" : "student") &&
      `${u.name} ${u.email} ${u.rollNumber || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="admin-workspace college-admin">
      <header className="topbar">
        <strong>SmartERP · College administration</strong>
        <div>
          <button className="small-btn" onClick={() => setDark(!dark)}>
            Toggle dark mode
          </button>
          <button className="small-btn" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="admin-fees">
        <div className="demo-warning">
          {user.privateWorkspace
            ? "Private workspace. Use only approved college records."
            : "Fictional-data demo. Do not enter real student information. Public demo changes and accounts reset on restart."}
        </div>
        <nav className="section-menu" aria-label="College admin sections">
          {tabs.map((n) => (
            <button
              key={n}
              className={"small-btn " + (tab === n ? "selected" : "")}
              onClick={() => change(n)}
              aria-current={tab === n ? "page" : undefined}
            >
              {n}
            </button>
          ))}
        </nav>
        <div className="panel-title">
          <div>
            <div className="eyebrow">COLLEGE OPERATIONS</div>
            <h1>{tab}</h1>
            <p className="muted">{user.name} · Administrator</p>
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {tab === "Overview" && overview && (
          <>
            <div className="college-stats">
              {[
                ["Students", overview.students],
                ["Faculty", overview.faculty],
                ["Subjects", overview.subjects],
                ["Notices", overview.notices],
              ].map(([n, v]) => (
                <section className="panel" key={n}>
                  <p className="muted">{n}</p>
                  <h2>{v}</h2>
                </section>
              ))}
            </div>
            <section className="panel">
              <h2>Getting your college ready</h2>
              <p>
                Add faculty and students, assign subjects, then let faculty
                publish attendance, assignments and grades for their own
                classes.
              </p>
              <p>
                Deactivate accounts rather than deleting academic history.
                Existing passwords are never changed by this panel.
              </p>
            </section>
            <section className="panel">
              <h2>Recent admin activity</h2>
              {overview.activity.length ? (
                overview.activity.map((a) => (
                  <p key={a._id}>
                    {a.actor?.name || "Administrator"} · {a.action} ·{" "}
                    {new Date(a.createdAt).toLocaleString("en-IN")}
                  </p>
                ))
              ) : (
                <p className="muted">Admin changes will appear here.</p>
              )}
            </section>
          </>
        )}
        {["Students", "Faculty"].includes(tab) && (
          <>
            <section className="panel">
              <div className="panel-title">
                <label>
                  Search {tab.toLowerCase()}
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, email or roll"
                  />
                </label>
                <button className="primary" onClick={() => setEditing({})}>
                  Add {tab === "Faculty" ? "faculty" : "student"}
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Account</th>
                      <th>Department / class</th>
                      <th>Status</th>
                      <th>Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((u) => (
                      <tr key={u._id}>
                        <td>
                          {u.name}
                          <small className="block muted">{u.rollNumber}</small>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          {u.department || "-"}{" "}
                          {u.semester ? ` / Sem ${u.semester}` : ""} {u.section}
                        </td>
                        <td>{u.active === false ? "Inactive" : "Active"}</td>
                        <td>
                          <button
                            className="small-btn"
                            onClick={() => setEditing(u)}
                          >
                            Edit
                          </button>
                          <button
                            className="small-btn"
                            disabled={busy}
                            onClick={() => {
                              if (
                                confirm(
                                  `${u.active === false ? "Activate" : "Deactivate"} ${u.name}?`,
                                )
                              )
                                action(() =>
                                  api("/admin/users/" + u._id, {
                                    method: "PATCH",
                                    body: JSON.stringify({
                                      active: u.active === false,
                                    }),
                                  }),
                                );
                            }}
                          >
                            {u.active === false ? "Activate" : "Deactivate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!people.length && <p className="muted">No matching accounts.</p>}
            </section>
            {editing && (
              <section className="panel" key={editing._id || "new"}>
                <h2>
                  {editing._id
                    ? "Edit account"
                    : "New " + (tab === "Faculty" ? "faculty" : "student")}
                </h2>
                <form
                  className="college-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.target));
                    if (f.semester) f.semester = Number(f.semester);
                    else delete f.semester;
                    if (!editing._id)
                      f.role = tab === "Faculty" ? "teacher" : "student";
                    action(() =>
                      api(
                        "/admin/users" + (editing._id ? "/" + editing._id : ""),
                        {
                          method: editing._id ? "PATCH" : "POST",
                          body: JSON.stringify(f),
                        },
                      ),
                    );
                  }}
                >
                  <label>
                    Full name
                    <input
                      name="name"
                      defaultValue={editing.name || ""}
                      required
                      minLength={2}
                      maxLength={80}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      name="email"
                      type="email"
                      defaultValue={editing.email || ""}
                      required
                    />
                  </label>
                  <label>
                    Department
                    <input
                      name="department"
                      defaultValue={editing.department || ""}
                      maxLength={80}
                    />
                  </label>
                  {tab === "Students" && (
                    <>
                      <label>
                        Roll number
                        <input
                          name="rollNumber"
                          defaultValue={editing.rollNumber || ""}
                          maxLength={40}
                        />
                      </label>
                      <label>
                        Semester
                        <input
                          name="semester"
                          type="number"
                          min={1}
                          max={12}
                          defaultValue={editing.semester || ""}
                        />
                      </label>
                      <label>
                        Section
                        <input
                          name="section"
                          defaultValue={editing.section || ""}
                          maxLength={20}
                        />
                      </label>
                    </>
                  )}
                  {!editing._id && (
                    <label>
                      Initial password
                      <input
                        name="password"
                        type="password"
                        minLength={12}
                        maxLength={128}
                        autoComplete="new-password"
                        required
                      />
                      <small>
                        Set only for a new account. Share outside the public
                        demo.
                      </small>
                    </label>
                  )}
                  <div>
                    <button className="primary" disabled={busy}>
                      Save account
                    </button>
                    <button
                      className="small-btn"
                      type="button"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            )}
          </>
        )}
        {tab === "Subjects" && (
          <>
            <section className="panel">
              <div className="panel-title">
                <h2>Subject allocation</h2>
                <button
                  className="primary"
                  onClick={() => setEditing({ students: [] })}
                >
                  Add subject
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Faculty</th>
                      <th>Enrollment</th>
                      <th>Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c) => (
                      <tr key={c._id}>
                        <td>
                          {c.name}
                          <small className="block muted">
                            {c.code} · {c.credits} credits
                          </small>
                        </td>
                        <td>{c.teacher?.name || "Unassigned"}</td>
                        <td>{c.students.length} students</td>
                        <td>
                          <button
                            className="small-btn"
                            onClick={() => setEditing(c)}
                          >
                            Edit allocation
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {editing && (
              <section className="panel" key={editing._id || "new"}>
                <h2>{editing._id ? "Edit subject" : "New subject"}</h2>
                <form
                  className="college-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.target);
                    const b = Object.fromEntries(f);
                    b.credits = Number(b.credits);
                    b.students = f.getAll("students");
                    action(() =>
                      api(
                        "/admin/courses" +
                          (editing._id ? "/" + editing._id : ""),
                        {
                          method: editing._id ? "PUT" : "POST",
                          body: JSON.stringify(b),
                        },
                      ),
                    );
                  }}
                >
                  <label>
                    Subject name
                    <input
                      name="name"
                      defaultValue={editing.name || ""}
                      required
                      minLength={2}
                    />
                  </label>
                  <label>
                    Subject code
                    <input
                      name="code"
                      defaultValue={editing.code || ""}
                      required
                      minLength={2}
                    />
                  </label>
                  <label>
                    Credits
                    <input
                      name="credits"
                      type="number"
                      min={1}
                      max={10}
                      defaultValue={editing.credits || 4}
                      required
                    />
                  </label>
                  <label>
                    Department
                    <input
                      name="department"
                      defaultValue={editing.department || ""}
                    />
                  </label>
                  <label>
                    Faculty
                    <select
                      name="teacher"
                      defaultValue={editing.teacher?._id || ""}
                      required
                    >
                      <option value="">Choose faculty</option>
                      {users
                        .filter(
                          (u) => u.role === "teacher" && u.active !== false,
                        )
                        .map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <fieldset className="college-enroll">
                    <legend>Enroll active students</legend>
                    {users
                      .filter((u) => u.role === "student" && u.active !== false)
                      .map((u) => (
                        <label key={u._id}>
                          <input
                            type="checkbox"
                            name="students"
                            value={u._id}
                            defaultChecked={editing.students?.some(
                              (s) => (s._id || s) === u._id,
                            )}
                          />
                          {u.name} · {u.rollNumber || u.email}
                        </label>
                      ))}
                  </fieldset>
                  <div>
                    <button className="primary" disabled={busy}>
                      Save subject
                    </button>
                    <button
                      className="small-btn"
                      type="button"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            )}
          </>
        )}
        {tab === "Notices" && (
          <>
            <section className="panel">
              <h2>Publish campus notice</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target;
                  const b = Object.fromEntries(new FormData(form));
                  action(async () => {
                    await api("/admin/notices", {
                      method: "POST",
                      body: JSON.stringify(b),
                    });
                    form.reset();
                  });
                }}
              >
                <label>
                  Title
                  <input name="title" minLength={3} maxLength={120} required />
                </label>
                <label>
                  Message
                  <textarea
                    name="body"
                    minLength={3}
                    maxLength={3000}
                    required
                  />
                </label>
                <button className="primary" disabled={busy}>
                  Publish notice
                </button>
              </form>
            </section>
            {notices.map((n) => (
              <section className="panel" key={n._id}>
                <h2>{n.title}</h2>
                <p>{n.body}</p>
                <small className="muted">
                  {n.course ? "Class notice" : "Campus notice"} ·{" "}
                  {n.createdBy?.name}
                </small>
                <button
                  className="small-btn"
                  disabled={busy}
                  onClick={() => {
                    if (confirm("Remove this notice?"))
                      action(() =>
                        api("/admin/notices/" + n._id, { method: "DELETE" }),
                      );
                  }}
                >
                  Remove
                </button>
              </section>
            ))}
          </>
        )}
        {tab === "Fees" && <Fees teacher={true} />}{" "}
        {tab === "Requests" && <Requests admin={true} />}
      </main>
    </div>
  );
}
