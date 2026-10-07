import { useEffect, useState } from "react";
import {
  GraduationCap,
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  ChartNoAxesCombined,
  Megaphone,
  MessageSquare,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Upload,
  Download,
  Menu,
  X,
  Plus,
  BookOpen,
  Sparkles,
  Bell,
} from "lucide-react";
const navigation = [
  ["Dashboard", LayoutDashboard],
  ["Assignments", ClipboardList],
  ["Attendance", CalendarCheck],
  ["Results", ChartNoAxesCombined],
  ["Notices", Megaphone],
  ["Assistant", MessageSquare],
  ["Courses", BookOpen],
];
async function api(url, options = {}) {
  const response = await fetch("/api" + url, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.message || "Request failed");
  return data;
}
const date = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const due = (a) => {
  const hours = (new Date(a.dueAt) - Date.now()) / 36e5;
  return hours < 0
    ? "Overdue"
    : hours < 24
      ? `Due in ${Math.max(1, Math.ceil(hours))}h`
      : `Due ${date(a.dueAt)}`;
};
function Badge({ children, tone = "" }) {
  return <span className={"badge " + tone}>{children}</span>;
}
function Empty({ children }) {
  return <div className="empty">{children}</div>;
}
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState("Dashboard"),
    [dark, setDark] = useState(localStorage.getItem("theme") === "dark"),
    [menu, setMenu] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [courses, setCourses] = useState([]),
    [assignments, setAssignments] = useState([]),
    [attendance, setAttendance] = useState([]),
    [results, setResults] = useState({ rows: [], cgpa: null }),
    [notices, setNotices] = useState([]),
    [modal, setModal] = useState(null),
    [submissions, setSubmissions] = useState([]),
    [students, setStudents] = useState([]),
    [chat, setChat] = useState([]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    api("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  async function refresh() {
    const [c, a, t, r, n] = await Promise.all([
      api("/courses"),
      api("/assignments"),
      api("/attendance"),
      api("/results"),
      api("/notices"),
    ]);
    setCourses(c);
    setAssignments(a);
    setAttendance(t);
    setResults(r);
    setNotices(n);
  }
  useEffect(() => {
    if (user) {
      setTab("Dashboard");
      setError("");
      refresh().catch((e) => setError(e.message));
    }
  }, [user]);
  async function action(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="loading">
        <GraduationCap size={48} />
        <p>Opening your campus workspace...</p>
      </div>
    );
  if (!user) return <Auth onLogin={setUser} dark={dark} setDark={setDark} />;
  const teacher = user.role === "teacher",
    pending = assignments.filter((a) => !a.submission),
    total = attendance.reduce((s, a) => s + a.total, 0),
    attended = attendance.reduce((s, a) => s + a.attended, 0),
    percentage = total ? Math.round((attended / total) * 100) : null;
  function go(name) {
    setTab(name);
    setMenu(false);
  }
  async function manageCourse(c) {
    setStudents(await api(`/courses/${c._id}/students`));
    setModal({ type: "manage", course: c });
  }
  async function viewSubmissions(a) {
    setSubmissions(await api(`/assignments/${a._id}/submissions`));
    setModal({ type: "submissions", assignment: a });
  }
  function assignmentList(list) {
    return list.length ? (
      list.map((a) => (
        <article className="assignment-row" key={a._id}>
          <div className="course-symbol">
            <ClipboardList size={21} />
          </div>
          <div className="grow">
            <small>{a.course?.code}</small>
            <h3>{a.title}</h3>
            <p>{a.description}</p>
            <span className="meta">
              <Clock size={13} />
              {new Date(a.dueAt).toLocaleString("en-IN")}{" "}
              {a.submission?.grade != null &&
                ` · Grade: ${a.submission.grade}/100`}
            </span>
            {a.submission?.feedback && <p>Feedback: {a.submission.feedback}</p>}
          </div>
          <div className="assignment-actions">
            <Badge
              tone={
                a.submission
                  ? "green"
                  : new Date(a.dueAt) < new Date()
                    ? "red"
                    : "amber"
              }
            >
              {a.submission ? "Submitted" : due(a)}
            </Badge>
            {a.attachment?.key && (
              <a
                className="text-link"
                href={`/api/assignments/${a._id}/download`}
              >
                <Download size={15} /> Brief
              </a>
            )}
            {teacher ? (
              <button className="small-btn" onClick={() => viewSubmissions(a)}>
                Review ({a.submissionCount})
              </button>
            ) : (
              <>
                <button
                  className="small-btn"
                  disabled={new Date(a.dueAt) < new Date()}
                  onClick={() => setModal({ type: "submit", assignment: a })}
                >
                  <Upload size={14} />
                  {a.submission ? "Replace" : "Submit"}
                </button>
                {a.submission && (
                  <a
                    className="text-link"
                    href={`/api/submissions/${a.submission._id}/download`}
                  >
                    My file
                  </a>
                )}
              </>
            )}
          </div>
        </article>
      ))
    ) : (
      <Empty>
        No assignments here.{" "}
        {teacher ? "Create your first assignment." : "You are all caught up."}
      </Empty>
    );
  }
  return (
    <div className="app">
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <a className="brand" href="#" onClick={() => go("Dashboard")}>
          <span className="brand-icon">
            <GraduationCap />
          </span>
          Smart<span>ERP</span>
        </a>
        <div className="workspace-label">CAMPUS WORKSPACE</div>
        <nav>
          {navigation
            .filter(
              ([n]) => !teacher || !["Attendance", "Assistant"].includes(n),
            )
            .map(([name, Icon]) => (
              <button
                key={name}
                className={tab === name ? "active" : ""}
                onClick={() => go(name)}
              >
                <Icon size={19} />
                {name}
                {name === "Assignments" && pending.length > 0 && !teacher && (
                  <span className="nav-count">{pending.length}</span>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <Sparkles size={20} />
            <strong>A little clarity. Every day.</strong>
            <p>Your campus life, all in one place.</p>
            <button onClick={() => go(teacher ? "Courses" : "Assistant")}>
              {teacher ? "Manage courses" : "Ask your assistant"}
              <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className="logout"
            onClick={async () => {
              setBusy(true);
              try {
                await api("/auth/logout", { method: "POST" });
                setError("");
                setUser(null);
                setCourses([]);
                setAssignments([]);
                setAttendance([]);
                setResults({ rows: [], cgpa: null });
                setNotices([]);
                setChat([]);
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button
            className="icon-btn mobile"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{tab}</strong>
          </div>
          <div className="top-actions">
            <span className="semester">ACADEMIC WORKSPACE</span>
            <button
              className="icon-btn"
              aria-label="Toggle dark mode"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="icon-btn notification"
              aria-label="View deadline alerts"
              onClick={() => go("Assignments")}
            >
              <Bell size={19} />
              {pending.length > 0 && <i />}
            </button>
            <div className="avatar">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="profile">
              <strong>{user.name}</strong>
              <small>
                {teacher
                  ? "Faculty workspace"
                  : user.rollNumber || "Student workspace"}
              </small>
            </div>
          </div>
        </header>
        <main className="content">
          <div className="demo-banner">
            Fictional-data demo. Do not enter real student information. Demo
            changes may be reset.
          </div>
          <div className="erp-profile">
            <div className="erp-profile-avatar">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <strong>{user.name}</strong>
            <small>
              {teacher
                ? "Faculty account"
                : user.rollNumber || "Student account"}
            </small>
            <div>
              <span>Workspace</span>
              <b>{teacher ? "Teacher" : "Student"}</b>
            </div>
            <div>
              <span>Courses</span>
              <b>{courses.length}</b>
            </div>
            <div>
              <span>Email</span>
              <b>{user.email}</b>
            </div>
          </div>
          <div className="erp-modules">
            {navigation
              .filter(
                ([n]) => !teacher || !["Attendance", "Assistant"].includes(n),
              )
              .map(([name, Icon]) => (
                <button
                  key={name}
                  className={tab === name ? "selected" : ""}
                  onClick={() => go(name)}
                >
                  <Icon size={25} />
                  <span>{name}</span>
                </button>
              ))}
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
              <button onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR CAMPUS, CONNECTED</div>
              <h1>
                {tab === "Dashboard"
                  ? `Welcome back, ${teacher ? user.name : user.name.split(" ")[0]}`
                  : tab}
              </h1>
              <p>
                {tab === "Dashboard"
                  ? "A clear view of your day. A little more room to focus."
                  : {
                      Assignments: "Keep every deadline in sight.",
                      Attendance: "Know where you stand, before you skip.",
                      Results: "Your progress, credit by credit.",
                      Notices: "Stay in the campus loop.",
                      Assistant: "Less searching. More doing.",
                      Courses: "Your subjects and classroom workspace.",
                    }[tab]}
              </p>
            </div>
            <span className="today">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          {tab === "Dashboard" && (
            <>
              <div className="welcome-banner">
                <div>
                  <Badge>SMARTER DAYS START HERE</Badge>
                  <h2>
                    {teacher
                      ? "Make room for better teaching."
                      : "One workspace. Zero guesswork."}
                  </h2>
                  <p>
                    {teacher
                      ? "Create assignments, track submissions and keep your classes moving."
                      : "Your deadlines, attendance and progress. Finally on the same page."}
                  </p>
                  <button
                    className="banner-btn"
                    onClick={() => go(teacher ? "Courses" : "Assistant")}
                  >
                    {teacher ? "Manage my courses" : "What is my pending work?"}
                    <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="banner-art">
                  <div className="art-ring" />
                  <GraduationCap size={80} />
                  <div className="floating-note">
                    <CheckCircle2 size={16} /> Stay one step ahead
                  </div>
                </div>
              </div>
              <div className="stats">
                <Stat
                  icon={CalendarCheck}
                  label={teacher ? "Active courses" : "Overall attendance"}
                  value={
                    teacher
                      ? courses.length
                      : percentage === null
                        ? "--"
                        : percentage + "%"
                  }
                  note={
                    teacher
                      ? "Courses you teach"
                      : percentage === null
                        ? "No attendance recorded"
                        : percentage >= 75
                          ? "Above the 75% target"
                          : "Below the 75% target"
                  }
                  tone="purple"
                />
                <Stat
                  icon={ClipboardList}
                  label={teacher ? "Assignments" : "Pending assignments"}
                  value={teacher ? assignments.length : pending.length}
                  note={
                    teacher
                      ? "Published to your classes"
                      : pending.some((a) => new Date(a.dueAt) < new Date())
                        ? "Some deadlines have passed"
                        : "Your next tasks, in one place"
                  }
                  tone="orange"
                />
                <Stat
                  icon={ChartNoAxesCombined}
                  label={teacher ? "Students enrolled" : "CGPA"}
                  value={
                    teacher
                      ? new Set(courses.flatMap((c) => c.students)).size
                      : results.cgpa?.toFixed(2) || "--"
                  }
                  note={
                    teacher
                      ? "Across your courses"
                      : "Credit-weighted · 10-point scale"
                  }
                  tone="green"
                />
                <Stat
                  icon={Megaphone}
                  label="Campus notices"
                  value={notices.length}
                  note="The latest from your campus"
                  tone="blue"
                />
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-title">
                    <h2>{teacher ? "Class assignments" : "On your radar"}</h2>
                    <button
                      className="text-link"
                      onClick={() => go("Assignments")}
                    >
                      View all
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {assignmentList(
                    (teacher ? assignments : pending).slice(0, 3),
                  )}
                </section>
                <section className="panel">
                  <div className="panel-title">
                    <h2>{teacher ? "Your courses" : "Attendance snapshot"}</h2>
                    <button
                      className="text-link"
                      onClick={() => go(teacher ? "Courses" : "Attendance")}
                    >
                      Details
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {teacher ? (
                    courses.map((c) => (
                      <div className="mini-course" key={c._id}>
                        <strong>{c.name}</strong>
                        <p>
                          {c.code} · {c.students.length} students
                        </p>
                      </div>
                    ))
                  ) : attendance.length ? (
                    attendance.map((a) => (
                      <div className="attendance-mini" key={a._id}>
                        <div>
                          <strong>{a.course.name}</strong>
                          <span>{Math.round(a.percentage)}%</span>
                        </div>
                        <div className="track">
                          <i
                            style={{
                              width: a.percentage + "%",
                              background: a.percentage < 75 ? "#f59e0b" : "",
                            }}
                          />
                        </div>
                        <small>
                          {a.mustAttend
                            ? `Attend ${a.mustAttend} more in a row to reach 75%`
                            : `You can miss ${a.canMiss} more classes`}
                        </small>
                      </div>
                    ))
                  ) : (
                    <Empty>
                      Attendance will appear once your teacher records it.
                    </Empty>
                  )}
                  <div className="tip">
                    <Sparkles size={17} />
                    <p>
                      {teacher
                        ? "Good feedback goes a long way. Review your latest submissions."
                        : "A little planning goes a long way. Keep your attendance at 75% or higher."}
                    </p>
                  </div>
                </section>
              </div>
              <section className="panel notices-panel">
                <div className="panel-title">
                  <h2>Campus bulletin</h2>
                  <button className="text-link" onClick={() => go("Notices")}>
                    All notices
                    <ArrowUpRight size={15} />
                  </button>
                </div>
                <div className="notice-grid">
                  {notices.slice(0, 3).map((n) => (
                    <article key={n._id}>
                      <Badge tone="blue">CAMPUS UPDATE</Badge>
                      <h3>{n.title}</h3>
                      <p>{n.body}</p>
                      <small>
                        {date(n.createdAt)} · {n.createdBy?.name || "Faculty"}
                      </small>
                    </article>
                  ))}
                  {!notices.length && <Empty>No campus notices yet.</Empty>}
                </div>
              </section>
            </>
          )}
          {tab === "Assignments" && (
            <section className="panel">
              <div className="panel-title">
                <h2>
                  {teacher
                    ? "Published assignments"
                    : `${pending.length} pending · ${assignments.length - pending.length} submitted`}
                </h2>
                {teacher && (
                  <button
                    className="primary"
                    onClick={() => setModal({ type: "assignment" })}
                  >
                    <Plus size={16} />
                    New assignment
                  </button>
                )}
              </div>
              {assignmentList(assignments)}
            </section>
          )}
          {tab === "Attendance" && (
            <>
              <section className="panel calculator">
                <h2>Plan your next class</h2>
                <p>
                  At least 75% attendance. Calculated from attended and total
                  classes.
                </p>
                <AttendanceCalculator />
              </section>
              <div className="course-grid">
                {attendance.map((a) => (
                  <section className="panel" key={a._id}>
                    <Badge>{a.course.code}</Badge>
                    <h2>{a.course.name}</h2>
                    <div className="big-value">
                      {a.percentage.toFixed(1)}
                      <small>%</small>
                    </div>
                    <p>
                      {a.attended} attended / {a.total} conducted
                    </p>
                    <Badge tone={a.mustAttend ? "amber" : "green"}>
                      {a.mustAttend
                        ? `Attend ${a.mustAttend} consecutive classes`
                        : `Safe to miss ${a.canMiss} more classes`}
                    </Badge>
                  </section>
                ))}
              </div>
            </>
          )}
          {tab === "Results" && (
            <section className="panel">
              <div className="panel-title">
                <h2>{teacher ? "Published results" : "Academic progress"}</h2>
                {!teacher && (
                  <Badge tone="green">
                    CGPA {results.cgpa?.toFixed(2) || "--"} / 10
                  </Badge>
                )}
              </div>
              <p className="muted">
                CGPA = sum of (course credits × grade points) ÷ total graded
                credits. Confirm your university's grading policy before using
                this for official records.
              </p>
              {results.rows.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Code</th>
                        <th>Credits</th>
                        <th>Grade point</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.rows.map((r) => (
                        <tr key={r._id}>
                          <td>{r.course.name}</td>
                          <td>{r.course.code}</td>
                          <td>{r.course.credits}</td>
                          <td>{r.gradePoint.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty>No grade points have been published yet.</Empty>
              )}
            </section>
          )}
          {tab === "Notices" && (
            <section className="panel">
              <div className="panel-title">
                <h2>Campus updates</h2>
                {teacher && (
                  <button
                    className="primary"
                    onClick={() => setModal({ type: "notice" })}
                  >
                    <Plus size={16} />
                    Post notice
                  </button>
                )}
              </div>
              {notices.map((n) => (
                <article className="notice-full" key={n._id}>
                  <small>
                    {date(n.createdAt)} · {n.createdBy?.name}
                  </small>
                  <h2>{n.title}</h2>
                  <p>{n.body}</p>
                </article>
              ))}
              {!notices.length && <Empty>No notices yet.</Empty>}
            </section>
          )}
          {tab === "Assistant" && (
            <section className="panel assistant">
              <div className="assistant-icon">
                <Sparkles size={28} />
              </div>
              <h2>Your campus copilot</h2>
              <p className="muted">
                Ask about pending work in English or Hindi. This version uses
                your live assignments, not an external AI model.
              </p>
              <button
                className="prompt-chip"
                onClick={() =>
                  action(async () => {
                    const d = await api("/assistant", {
                      method: "POST",
                      body: JSON.stringify({
                        message: "mera pending kaam kya hai",
                      }),
                    });
                    setChat([
                      ...chat,
                      {
                        question: "mera pending kaam kya hai",
                        answer: d.answer,
                      },
                    ]);
                  })
                }
              >
                mera pending kaam kya hai <ArrowUpRight size={16} />
              </button>
              {chat.map((m, i) => (
                <div className="chat-message" key={i}>
                  <strong>{m.question}</strong>
                  <p>{m.answer}</p>
                </div>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const message = new FormData(e.target).get("message");
                  action(async () => {
                    const d = await api("/assistant", {
                      method: "POST",
                      body: JSON.stringify({ message }),
                    });
                    setChat([...chat, { question: message, answer: d.answer }]);
                    e.target.reset();
                  });
                }}
              >
                <input
                  name="message"
                  required
                  maxLength="1000"
                  placeholder="Ask about your pending assignments..."
                />
                <button className="primary" disabled={busy}>
                  Ask <ArrowUpRight size={16} />
                </button>
              </form>
            </section>
          )}
          {tab === "Courses" && (
            <>
              <div className="section-actions">
                {teacher && (
                  <button
                    className="primary"
                    onClick={() => setModal({ type: "course" })}
                  >
                    <Plus size={16} />
                    Create course
                  </button>
                )}
              </div>
              <div className="course-grid">
                {courses.map((c) => (
                  <section className="panel" key={c._id}>
                    <div className="course-symbol">
                      <BookOpen />
                    </div>
                    <h2>{c.name}</h2>
                    <p>
                      {c.code} · {c.credits} credits
                    </p>
                    <small className="muted">
                      {teacher
                        ? `${c.students.length} enrolled students`
                        : c.teacher?.name}
                    </small>
                    {teacher && (
                      <button
                        className="small-btn block"
                        onClick={() => manageCourse(c)}
                      >
                        Manage students & grades <ChevronRight size={16} />
                      </button>
                    )}
                  </section>
                ))}
              </div>
              {!courses.length && (
                <Empty>
                  {teacher
                    ? "Create a course to begin."
                    : "Your teacher needs to enroll you in a course."}
                </Empty>
              )}
            </>
          )}
          <footer className="footer">
            <span>SmartERP · A better campus day.</span>
            <span>{teacher ? "Faculty" : "Student"} workspace</span>
          </footer>
        </main>
      </div>
      {modal && (
        <Modal
          title={
            {
              assignment: "New assignment",
              submit: "Submit assignment",
              course: "Create course",
              notice: "Post notice",
              manage: "Manage course",
              submissions: "Review submissions",
            }[modal.type]
          }
          onClose={() => setModal(null)}
        >
          {modal.type === "assignment" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.target),
                  course = f.get("course");
                f.delete("course");
                f.set("dueAt", new Date(f.get("dueAt")).toISOString());
                action(async () => {
                  await api(`/assignments?course=${course}`, {
                    method: "POST",
                    body: f,
                  });
                  setModal(null);
                });
              }}
            >
              <label>
                Course
                <select name="course" required>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Title
                <input name="title" minLength="3" maxLength="150" required />
              </label>
              <label>
                Instructions
                <textarea name="description" maxLength="5000" />
              </label>
              <label>
                Deadline (your local time)
                <input type="datetime-local" name="dueAt" required />
              </label>
              <FileInput optional />
              <button className="primary" disabled={busy || !courses.length}>
                Publish assignment
              </button>
            </form>
          )}
          {modal.type === "submit" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.target);
                action(async () => {
                  await api(`/assignments/${modal.assignment._id}/submit`, {
                    method: "POST",
                    body: f,
                  });
                  setModal(null);
                });
              }}
            >
              <p>{modal.assignment.title}</p>
              <FileInput />
              <p className="muted">
                You can replace your submission until the deadline. Replacing it
                clears any previous grade.
              </p>
              <button className="primary" disabled={busy}>
                Upload submission
              </button>
            </form>
          )}
          {modal.type === "course" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.target));
                f.credits = Number(f.credits);
                action(async () => {
                  await api("/courses", {
                    method: "POST",
                    body: JSON.stringify(f),
                  });
                  setModal(null);
                });
              }}
            >
              <label>
                Course name
                <input name="name" required minLength="2" maxLength="100" />
              </label>
              <label>
                Course code
                <input name="code" required minLength="2" maxLength="20" />
              </label>
              <label>
                Credits
                <input
                  name="credits"
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  defaultValue="4"
                  required
                />
              </label>
              <button className="primary" disabled={busy}>
                Create course
              </button>
            </form>
          )}
          {modal.type === "notice" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.target));
                action(async () => {
                  await api("/notices", {
                    method: "POST",
                    body: JSON.stringify(f),
                  });
                  setModal(null);
                });
              }}
            >
              <label>
                Title
                <input name="title" minLength="3" maxLength="120" required />
              </label>
              <label>
                Notice
                <textarea name="body" minLength="3" maxLength="3000" required />
              </label>
              <button className="primary" disabled={busy}>
                Post notice
              </button>
            </form>
          )}
          {modal.type === "manage" && (
            <>
              <h3>{modal.course.name}</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = Object.fromEntries(new FormData(e.target));
                  action(async () => {
                    await api(`/courses/${modal.course._id}/enroll`, {
                      method: "POST",
                      body: JSON.stringify(f),
                    });
                    setStudents(
                      await api(`/courses/${modal.course._id}/students`),
                    );
                    e.target.reset();
                  });
                }}
              >
                <label>
                  Enroll registered student by email
                  <input type="email" name="email" required />
                </label>
                <button className="primary" disabled={busy}>
                  Enroll student
                </button>
              </form>
              {students.map((s) => (
                <div className="student-manage" key={s._id}>
                  <strong>{s.name}</strong>
                  <small>{s.email}</small>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = Object.fromEntries(new FormData(e.target));
                      action(() =>
                        api(`/courses/${modal.course._id}/attendance`, {
                          method: "PUT",
                          body: JSON.stringify({
                            student: s._id,
                            attended: Number(f.attended),
                            total: Number(f.total),
                          }),
                        }),
                      );
                    }}
                  >
                    <label>
                      Attended
                      <input name="attended" type="number" min="0" required />
                    </label>
                    <label>
                      Total
                      <input name="total" type="number" min="0" required />
                    </label>
                    <button className="small-btn" disabled={busy}>
                      Save attendance
                    </button>
                  </form>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.target);
                      action(() =>
                        api(`/courses/${modal.course._id}/result`, {
                          method: "PUT",
                          body: JSON.stringify({
                            student: s._id,
                            gradePoint: Number(f.get("gradePoint")),
                          }),
                        }),
                      );
                    }}
                  >
                    <label>
                      Grade point (0-10)
                      <input
                        name="gradePoint"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        required
                      />
                    </label>
                    <button className="small-btn" disabled={busy}>
                      Publish grade
                    </button>
                  </form>
                </div>
              ))}
            </>
          )}
          {modal.type === "submissions" && (
            <>
              {submissions.length ? (
                submissions.map((s) => (
                  <div className="student-manage" key={s._id}>
                    <strong>{s.student.name}</strong>
                    <p>{new Date(s.submittedAt).toLocaleString("en-IN")}</p>
                    <a
                      className="text-link"
                      href={`/api/submissions/${s._id}/download`}
                    >
                      <Download size={16} />
                      {s.file.name}
                    </a>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = Object.fromEntries(new FormData(e.target));
                        f.grade = Number(f.grade);
                        action(async () => {
                          await api(`/submissions/${s._id}/grade`, {
                            method: "PUT",
                            body: JSON.stringify(f),
                          });
                          setSubmissions(
                            await api(
                              `/assignments/${modal.assignment._id}/submissions`,
                            ),
                          );
                        });
                      }}
                    >
                      <label>
                        Grade / 100
                        <input
                          type="number"
                          name="grade"
                          min="0"
                          max="100"
                          required
                          defaultValue={s.grade}
                        />
                      </label>
                      <label>
                        Feedback
                        <textarea
                          name="feedback"
                          maxLength="2000"
                          defaultValue={s.feedback}
                        />
                      </label>
                      <button className="small-btn" disabled={busy}>
                        Save feedback
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <Empty>No submissions yet.</Empty>
              )}
            </>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
function FileInput({ optional = false }) {
  return (
    <label>
      File {optional ? "(optional)" : ""}
      <input
        type="file"
        name="file"
        accept=".pdf,.txt,.docx"
        required={!optional}
      />
      <small>PDF, TXT or DOCX · Up to 10 MB</small>
    </label>
  );
}
function Stat({ icon: Icon, label, value, note, tone }) {
  return (
    <section className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <div className={"stat-icon " + tone}>
          <Icon size={20} />
        </div>
      </div>
      <strong className="stat-value">{value}</strong>
      <p>{note}</p>
    </section>
  );
}
function AttendanceCalculator() {
  const [attended, setAttended] = useState(32),
    [total, setTotal] = useState(40);
  const valid =
    Number.isInteger(attended) &&
    Number.isInteger(total) &&
    attended >= 0 &&
    total >= 0 &&
    attended <= total;
  const miss = valid
      ? Math.max(0, Math.floor(attended / 0.75 - total + 1e-9))
      : 0,
    need = valid
      ? Math.max(0, Math.ceil((0.75 * total - attended) / 0.25 - 1e-9))
      : 0;
  return (
    <div className="calc-row">
      <label>
        Classes attended
        <input
          type="number"
          min="0"
          value={attended}
          onChange={(e) => setAttended(Number(e.target.value))}
        />
      </label>
      <label>
        Total conducted
        <input
          type="number"
          min="0"
          value={total}
          onChange={(e) => setTotal(Number(e.target.value))}
        />
      </label>
      <div className="calc-answer">
        {!valid
          ? "Attended cannot exceed total."
          : total === 0
            ? "No classes recorded yet."
            : need
              ? `Attend the next ${need} classes to reach 75%.`
              : `You can miss ${miss} more classes and stay at or above 75%.`}
      </div>
    </div>
  );
}
function Auth({ onLogin, dark, setDark }) {
  const [register, setRegister] = useState(false),
    [role, setRole] = useState("student"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="auth-page">
      <section className="auth-art">
        <div className="brand">
          <span className="brand-icon">
            <GraduationCap />
          </span>
          SmartERP
        </div>
        <div>
          <Badge>BUILT FOR YOUR CAMPUS DAY</Badge>
          <h1>
            Less admin.
            <br />
            More possibilities.
          </h1>
          <p>
            Every class, deadline and small win.
            <br />
            One connected workspace.
          </p>
          <div className="auth-feature">
            <CheckCircle2 />
            Attendance that makes sense
          </div>
          <div className="auth-feature">
            <CheckCircle2 />
            Deadlines that don't slip away
          </div>
          <div className="auth-feature">
            <CheckCircle2 />
            Progress you can see
          </div>
        </div>
        <small>SmartERP · Campus, connected.</small>
      </section>
      <section className="auth-form">
        <button
          className="icon-btn theme-auth"
          aria-label="Toggle dark mode"
          onClick={() => setDark(!dark)}
        >
          {dark ? <Sun /> : <Moon />}
        </button>
        <div className="auth-box">
          <div className="eyebrow">YOUR NEXT CHAPTER</div>
          <h1>{register ? "Join your campus" : "Welcome back"}</h1>
          <p className="muted">
            {register
              ? "Create your student or faculty account."
              : "Demo: student@smarterp.demo or teacher@smarterp.demo. Password: SmartERPdemo123!"}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const f = Object.fromEntries(new FormData(e.target));
                if (register) f.role = role;
                const d = await api(
                  "/auth/" + (register ? "register" : "login"),
                  { method: "POST", body: JSON.stringify(f) },
                );
                onLogin(d.user);
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {register && (
              <>
                <div className="role-choice">
                  <button
                    type="button"
                    className={role === "student" ? "selected" : ""}
                    onClick={() => setRole("student")}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    className={role === "teacher" ? "selected" : ""}
                    onClick={() => setRole("teacher")}
                  >
                    Teacher
                  </button>
                </div>
                <label>
                  Full name
                  <input
                    name="name"
                    required
                    minLength="2"
                    maxLength="80"
                    autoComplete="name"
                  />
                </label>
                {role === "student" ? (
                  <label>
                    Roll number (optional)
                    <input name="rollNumber" maxLength="40" />
                  </label>
                ) : (
                  <label>
                    Teacher invite code
                    <input
                      name="teacherCode"
                      type="password"
                      required
                      autoComplete="off"
                    />
                  </label>
                )}
              </>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                placeholder="you@college.edu"
                required
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                minLength={register ? 10 : 1}
                maxLength="128"
                required
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={
                  register ? "At least 10 characters" : "Your password"
                }
              />
            </label>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Please wait..."
                : register
                  ? "Create account"
                  : "Sign in"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to SmartERP?"}{" "}
            <button
              className="text-link"
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Sign in" : "Create account"}
            </button>
          </p>
          <small className="muted">
            Teacher accounts require a private invitation code.
          </small>
        </div>
      </section>
    </div>
  );
}
