import { useEffect, useState } from "react";
import {
  Settings,
  UserRound,
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
  Wallet,
  CalendarDays,
  LibraryBig,
  NotebookPen,
} from "lucide-react";
const navigation = [
  ["Dashboard", LayoutDashboard],
  ["Profile", UserRound],
  ["Assignments", ClipboardList],
  ["Attendance", CalendarCheck],
  ["Results", ChartNoAxesCombined],
  ["Fees", Wallet],
  ["Notices", Megaphone],
  ["Assistant", MessageSquare],
  ["Courses", BookOpen],
  ["Timetable", CalendarDays],
  ["Library", LibraryBig],
  ["Exams", NotebookPen],
  ["Applications", ClipboardList],
  ["Hostel", CalendarDays],
  ["Grievances", MessageSquare],
  ["Resources", BookOpen],
  ["Clubs", GraduationCap],
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
  return location.pathname === "/Setup" ? <SetupPassword /> : <WorkspaceApp />;
}
function WorkspaceApp() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState(
      decodeURIComponent(location.pathname.slice(1)) || "Dashboard",
    ),
    [dark, setDark] = useState(localStorage.getItem("theme") === "dark"),
    [menu, setMenu] = useState(false),
    [moduleSearch, setModuleSearch] = useState(""),
    [showAlerts, setShowAlerts] = useState(false),
    [feeAlerts, setFeeAlerts] = useState([]),
    [feeAlertError, setFeeAlertError] = useState(""),
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
  useEffect(() => {
    if (!user?.privateWorkspace) return;
    api("/fees")
      .then((d) =>
        setFeeAlerts(
          d.rows.filter(
            (f) =>
              f.amountPaise > f.payments.reduce((s, p) => s + p.amountPaise, 0),
          ),
        ),
      )
      .catch((e) => setFeeAlertError(e.message));
  }, [user, tab]);
  useEffect(() => {
    const change = () => {
      const t = decodeURIComponent(location.pathname.slice(1));
      setTab(
        [
          "Dashboard",
          "Profile",
          "Assignments",
          "Attendance",
          "Results",
          "Fees",
          "Notices",
          "Assistant",
          "Courses",
          "Timetable",
          "Library",
          "Exams",
          "Applications",
          "Hostel",
          "Grievances",
          "Resources",
          "Clubs",
          "Requests",
        ].includes(t)
          ? t
          : "Dashboard",
      );
      setMenu(false);
    };
    window.addEventListener("popstate", change);
    return () => window.removeEventListener("popstate", change);
  }, []);
  async function refresh() {
    if (user?.role === "admin") return;
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
      setTab(decodeURIComponent(location.pathname.slice(1)) || "Dashboard");
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
  if (user.role === "admin")
    return (
      <div className="admin-workspace">
        <header className="topbar">
          <strong>SmartERP · Accounts admin</strong>
          <div>
            <button className="small-btn" onClick={() => setDark(!dark)}>
              Toggle dark mode
            </button>
            <button
              className="small-btn"
              onClick={async () => {
                await api("/auth/logout", { method: "POST" });
                setUser(null);
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="admin-fees">
          <div className="demo-warning">
            {user.privateWorkspace
              ? "Private student workspace. Only your login can access these records. Academic activity and fees are demo records. Public demo admin review is unavailable. Uploaded files may reset; do not upload real documents."
              : "Fictional-data demo. Do not enter real student information. Demo changes may be reset."}
          </div>
          <nav className="section-menu" aria-label="Admin sections">
            {["Fees", "Requests"].map((n) => (
              <button
                className="small-btn"
                key={n}
                onClick={() => {
                  history.pushState({}, "", "/" + n);
                  setTab(n);
                }}
              >
                {n}
              </button>
            ))}
          </nav>
          <h1>{tab === "Requests" ? "Request review" : "Fees"}</h1>
          <p className="muted">{user.name} · Demo admin workspace</p>
          {tab === "Requests" ? (
            <RequestWorkspace admin={true} />
          ) : (
            <Fees teacher={true} />
          )}
        </main>
      </div>
    );
  const teacher = user.role === "teacher",
    pending = assignments.filter((a) => !a.submission),
    total = attendance.reduce((s, a) => s + a.total, 0),
    attended = attendance.reduce((s, a) => s + a.attended, 0),
    percentage = total ? Math.round((attended / total) * 100) : null;
  function go(name) {
    history.pushState({}, "", "/" + encodeURIComponent(name));
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
    <div
      className={"app " + (user.privateWorkspace ? "private-college-app" : "")}
    >
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
              ([n]) =>
                (n !== "Profile" || user.privateWorkspace) &&
                (!teacher ||
                  ![
                    "Attendance",
                    "Assistant",
                    "Fees",
                    "Applications",
                    "Hostel",
                    "Grievances",
                    "Clubs",
                  ].includes(n)),
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
              aria-label={
                user.privateWorkspace
                  ? "View campus alerts"
                  : "View deadline alerts"
              }
              onClick={() =>
                user.privateWorkspace
                  ? setShowAlerts(!showAlerts)
                  : go("Assignments")
              }
            >
              <Bell size={19} />
              {(pending.length > 0 ||
                attendance.some((a) => a.percentage < 75) ||
                feeAlerts.length > 0) && <i />}
            </button>
            <button
              className="avatar profile-link"
              aria-label="Open my profile"
              onClick={() => user.privateWorkspace && go("Profile")}
            >
              {user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </button>
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
        <main className={"content module-page module-" + tab.toLowerCase()}>
          <div className="demo-banner">
            {user.privateWorkspace
              ? "Private student workspace. Only your login can access these records. Academic activity and fees are demo records. Public demo admin review is unavailable. Uploaded files may reset; do not upload real documents."
              : "Fictional-data demo. Do not enter real student information. Demo changes may be reset."}
          </div>
          {user.privateWorkspace && tab === "Dashboard" && (
            <PrivateStudentHeader user={user} onProfile={() => go("Profile")} />
          )}
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
          {user.privateWorkspace && tab === "Dashboard" ? (
            <section className="college-module-launcher">
              <label>
                <input
                  type="search"
                  aria-label="Search Modules"
                  placeholder="Search Modules..."
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                />
              </label>
              <div className="college-module-grid">
                {navigation
                  .filter(
                    ([n]) =>
                      !["Dashboard", "Profile"].includes(n) &&
                      (n + " " + collegeModuleLabel(n))
                        .toLowerCase()
                        .includes(moduleSearch.toLowerCase()),
                  )
                  .sort(
                    ([a], [b]) =>
                      collegeModuleOrder.indexOf(a) -
                      collegeModuleOrder.indexOf(b),
                  )
                  .map(([n, Icon]) => (
                    <button key={n} onClick={() => go(n)}>
                      <Icon size={32} />
                      <span>{collegeModuleLabel(n)}</span>
                    </button>
                  ))}
              </div>
              {!navigation.some(
                ([n]) =>
                  !["Dashboard", "Profile"].includes(n) &&
                  (n + " " + collegeModuleLabel(n))
                    .toLowerCase()
                    .includes(moduleSearch.toLowerCase()),
              ) && <p>No modules match. Try a different name.</p>}
            </section>
          ) : (
            !user.privateWorkspace && (
              <div className="erp-modules">
                {navigation
                  .filter(
                    ([n]) =>
                      n !== "Profile" &&
                      (!teacher ||
                        ![
                          "Attendance",
                          "Assistant",
                          "Fees",
                          "Applications",
                          "Hostel",
                          "Grievances",
                          "Clubs",
                        ].includes(n)),
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
            )
          )}
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
          {user.privateWorkspace && (
            <nav className="college-bottom-nav" aria-label="Student navigation">
              {[
                ["Dashboard", LayoutDashboard, "Home"],
                ["Attendance", CalendarCheck, "Attendance"],
                ["Assignments", ClipboardList, "Assignment"],
                ["Profile", Settings, "Settings"],
              ].map(([n, Icon, label]) => (
                <button
                  key={n}
                  className={tab === n ? "active" : ""}
                  onClick={() => go(n)}
                >
                  <Icon size={23} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          )}
          {tab !== "Dashboard" && (
            <div className="module-heading">
              <button className="small-btn" onClick={() => go("Dashboard")}>
                ← Campus home
              </button>
              <Badge>{tab} workspace</Badge>
            </div>
          )}
          {showAlerts && user.privateWorkspace && (
            <section className="panel campus-alerts">
              <div className="panel-title">
                <h2>Campus alerts</h2>
                <button
                  className="icon-btn"
                  aria-label="Close campus alerts"
                  onClick={() => setShowAlerts(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <p className="muted">
                Based on your fictional workspace records. In-app only, not
                official college reminders.
              </p>
              {attendance
                .filter((a) => a.percentage < 75)
                .map((a) => (
                  <button
                    className="campus-alert-row"
                    key={a._id}
                    onClick={() => {
                      go("Attendance");
                      setShowAlerts(false);
                    }}
                  >
                    <CalendarCheck size={19} />
                    <span>
                      <strong>
                        {a.course.name}: {Math.round(a.percentage)}% attendance
                      </strong>
                      <small>
                        Below the 75% target. Open attendance for the catch-up
                        plan.
                      </small>
                    </span>
                  </button>
                ))}
              {feeAlerts.map((f) => (
                <button
                  className="campus-alert-row"
                  key={f._id}
                  onClick={() => {
                    go("Fees");
                    setShowAlerts(false);
                  }}
                >
                  <Wallet size={19} />
                  <span>
                    <strong>
                      {f.title || f.category || "Fee"}:{" "}
                      {new Date(f.dueAt) < new Date()
                        ? "overdue"
                        : "due " + date(f.dueAt)}
                    </strong>
                    <small>
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(
                        (f.amountPaise -
                          f.payments.reduce((s, p) => s + p.amountPaise, 0)) /
                          100,
                      )}{" "}
                      demo balance remaining
                    </small>
                  </span>
                </button>
              ))}
              {pending.length > 0 && (
                <button
                  className="campus-alert-row"
                  onClick={() => {
                    go("Assignments");
                    setShowAlerts(false);
                  }}
                >
                  <ClipboardList size={19} />
                  <span>
                    <strong>{pending.length} assignments pending</strong>
                    <small>Open assignment deadlines</small>
                  </span>
                </button>
              )}
              {feeAlertError && (
                <p role="alert">
                  Could not load fee alerts. Open Fees to check your records.
                </p>
              )}
              {!pending.length &&
                !feeAlerts.length &&
                !attendance.some((a) => a.percentage < 75) && (
                  <p className="muted">
                    No attendance or assignment alerts. Fee records may still be
                    loading.
                  </p>
                )}
            </section>
          )}
          {user.privateWorkspace &&
            !["Dashboard", "Profile", "Attendance", "Results"].includes(
              tab,
            ) && (
              <ModuleSpotlight
                tab={tab}
                assignments={assignments}
                pending={pending}
                notices={notices}
              />
            )}
          {tab === "Profile" && user.privateWorkspace && (
            <StudentProfile
              user={user}
              courses={courses}
              results={results}
              attendance={attendance}
            />
          )}
          {tab === "Dashboard" && !user.privateWorkspace && (
            <>
              <div className="welcome-banner">
                <div>
                  <Badge>CAMPUS OVERVIEW</Badge>
                  <h2>
                    {teacher
                      ? "Make room for better teaching."
                      : "Your campus overview"}
                  </h2>
                  <p>
                    {teacher
                      ? "Create assignments, track submissions and keep your classes moving."
                      : "Check upcoming work, track attendance and open your campus tools."}
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
              {!teacher && (
                <Analytics attendance={attendance} results={results} />
              )}
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
          {tab === "Attendance" && user.privateWorkspace && (
            <AttendanceStudio attendance={attendance} />
          )}
          {tab === "Attendance" && !user.privateWorkspace && (
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
          {["Timetable", "Library", "Exams"].includes(tab) && (
            <CampusModule key={tab} type={tab} user={user} courses={courses} />
          )}
          {["Applications", "Hostel", "Grievances"].includes(tab) && (
            <RequestWorkspace key={tab} kind={tab} />
          )}
          {["Resources", "Clubs"].includes(tab) && (
            <CampusExtras key={tab} type={tab} user={user} />
          )}
          {tab === "Exams" && !teacher && (
            <RequestWorkspace kind="Exam requests" />
          )}
          {tab === "Fees" && <Fees teacher={teacher} user={user} />}
          {tab === "Results" && (
            <>
              {user.privateWorkspace && <ResultsStudio results={results} />}
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
            </>
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
                  <span className="notice-label">
                    <Megaphone size={14} /> CAMPUS CIRCULAR
                  </span>
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
function PrivateStudentHeader({ user, onProfile }) {
  const p = user.profile;
  return (
    <section className="college-profile-header">
      {p?.photoDataUrl ? (
        <img src={p.photoDataUrl} alt="Student profile photo" />
      ) : (
        <div className="college-initial-avatar">
          {user.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
        </div>
      )}
      <h2>{p?.displayName || user.name}</h2>
      {p?.hindiName && <h3>{p.hindiName}</h3>}
      {p?.headerEnrollment && <strong>{p.headerEnrollment}</strong>}
      <p>{p?.contactEmail || user.email}</p>
      {p?.phone && <p>{p.phone}</p>}
      {onProfile && (
        <button onClick={onProfile}>
          View my profile <ChevronRight size={15} />
        </button>
      )}
    </section>
  );
}
const collegeModuleLabel = (n) =>
  ({
    Courses: "Academic",
    Fees: "Fee",
    Notices: "Circular",
    Exams: "Exam",
    Clubs: "Club/Committee",
    Hostel: "Hostel",
    Grievances: "Grievance",
  })[n] || n;
const collegeModuleOrder = [
  "Courses",
  "Fees",
  "Notices",
  "Library",
  "Exams",
  "Clubs",
  "Hostel",
  "Grievances",
  "Applications",
  "Assignments",
  "Attendance",
  "Results",
  "Timetable",
  "Resources",
  "Assistant",
];
function StudentProfile({ user, courses, results, attendance }) {
  const [section, setSection] = useState("Personal details");
  if (user.profile)
    return (
      <div className="student-profile-page">
        <PrivateStudentHeader user={user} />
        <dl className="college-profile-rows">
          {user.profile.rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label} :</dt>
              <dd>{value || ""}</dd>
            </div>
          ))}
        </dl>
        <p className="muted">
          Profile details from your supplied college screenshot. Attendance,
          grades and fees in this workspace remain fictional demo records.
        </p>
      </div>
    );
  const details = {
    "Personal details": [
      ["Full name", user.name],
      ["Roll number", user.rollNumber || "Not provided"],
      ["Email address", user.email],
      ["Phone number", "Not provided"],
      ["Date of birth", "Not provided"],
      ["Gender", "Not provided"],
      ["Address", "Not provided"],
    ],
    "Academic details": [
      ["Program", "Computer Science - demo workspace"],
      ["Branch", "Computing - fictional demo"],
      ["Semester", "Semester 5 - demo fee records"],
      ["Enrollment status", "Active demo account"],
      ["Academic year", "Not provided"],
      ["Admission number", "Not provided"],
      [
        "CGPA",
        results.cgpa == null
          ? "Not recorded"
          : results.cgpa.toFixed(2) + " / 10 (fictional)",
      ],
    ],
    "Family and mentor": [
      ["Parent / guardian name", "Not provided"],
      ["Guardian contact", "Not provided"],
      ["Mentor name", "Not provided"],
      ["Mentor contact", "Not provided"],
      ["Emergency contact", "Not provided"],
    ],
  };
  return (
    <div className="student-profile-page">
      <section className="student-profile-hero">
        <div className="student-profile-photo">
          {user.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
          <small>No photo added</small>
        </div>
        <div>
          <Badge>PRIVATE STUDENT ACCOUNT</Badge>
          <h2>{user.name}</h2>
          <p>Roll {user.rollNumber || "Not provided"}</p>
          <p>{user.email}</p>
          <small>
            Personal details supplied by you. Academic records are fictional
            demo data, not an official college record.
          </small>
        </div>
      </section>
      <div className="profile-section-menu">
        {Object.keys(details).map((n) => (
          <button
            className={section === n ? "active" : ""}
            key={n}
            onClick={() => setSection(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="panel-title">
          <h2>{section}</h2>
        </div>
        <dl className="profile-details-grid">
          {details[section].map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="panel">
        <div className="panel-title">
          <h2>My enrolled demo subjects</h2>
          <Badge>{courses.length} courses</Badge>
        </div>
        {courses.map((c) => {
          const a = attendance.find((a) => a.course._id === c._id),
            r = results.rows?.find((r) => r.course._id === c._id);
          return (
            <div className="profile-subject" key={c._id}>
              <div>
                <strong>{c.name}</strong>
                <p>
                  {c.code} · {c.credits} credits
                </p>
              </div>
              <div>
                <strong>
                  {a
                    ? Math.round(a.percentage) + "% attendance"
                    : "Not recorded"}
                </strong>
                <p>
                  {r ? "Grade " + r.gradePoint + " / 10" : "Grade not recorded"}
                </p>
              </div>
            </div>
          );
        })}
        <p className="muted">
          Family, contact and mentor fields stay blank until you provide them.
          No photo is assumed or copied from your college.
        </p>
      </section>
    </div>
  );
}
function SetupPassword() {
  const [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  const token = new URLSearchParams(location.hash.slice(1)).get("token");
  useEffect(() => {
    document.querySelector('meta[name="referrer"]')?.remove();
    const m = document.createElement("meta");
    m.name = "referrer";
    m.content = "no-referrer";
    document.head.append(m);
  }, []);
  return (
    <main className="private-setup-page">
      <section className="private-setup-card">
        <h1>Set your private demo password</h1>
        <p>
          Only your account can see its own fictional records. Never enter real
          student documents or financial details.
        </p>
        {done ? (
          <>
            <p role="status">
              Password set. Your setup link is now used. Sign in with your own
              email.
            </p>
            <a href="/">Go to sign in</a>
          </>
        ) : (
          <form
            className="request-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget);
              if (f.get("password") !== f.get("confirm")) {
                setError("Passwords do not match");
                setBusy(false);
                return;
              }
              try {
                await api("/auth/setup", {
                  method: "POST",
                  body: JSON.stringify({ token, password: f.get("password") }),
                });
                history.replaceState({}, "", "/Setup");
                setDone(true);
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              This private link expires after 24 hours and works once. Use a new
              password you do not use elsewhere.
            </p>
            <label>
              New password
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm password
              <input
                name="confirm"
                type="password"
                minLength={12}
                maxLength={128}
                required
                autoComplete="new-password"
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="primary" disabled={busy || !token}>
              {busy ? "Saving..." : "Set password"}
            </button>
          </form>
        )}
      </section>
    </main>
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
              : "Demo: student@smarterp.demo, teacher@smarterp.demo or admin@smarterp.demo. Password: SmartERPdemo123!"}
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

function Fees({ teacher, user }) {
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState({ rows: [], students: [] });
  const [section, setSection] = useState("Fee details");
  const [semester, setSemester] = useState("All semesters");
  const [feeType, setFeeType] = useState("All fee heads");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [success, setSuccess] = useState(null);
  const money = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(n / 100);
  const paid = (f) => f.payments.reduce((sum, p) => sum + p.amountPaise, 0);
  const balance = (f) => f.amountPaise - paid(f);
  const state = (f) =>
    balance(f) === 0
      ? "Paid"
      : new Date(f.dueAt) < new Date()
        ? "Overdue"
        : paid(f)
          ? "Part paid"
          : "Pending";
  const refresh = () =>
    api("/fees").then((d) => {
      setData(d);
      setLoaded(true);
    });
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  const total = data.rows.reduce((n, f) => n + f.amountPaise, 0);
  const collected = data.rows.reduce((n, f) => n + paid(f), 0);
  const overdue = data.rows
    .filter((f) => state(f) === "Overdue")
    .reduce((n, f) => n + balance(f), 0);
  async function simulateCheckout() {
    setBusy(true);
    setError("");
    try {
      const saved = await api(`/fees/${checkout._id}/demo-checkout`, {
        method: "POST",
        body: JSON.stringify({ expectedAmountPaise: balance(checkout) }),
      });
      const payment = saved.payments.at(-1);
      setSuccess({
        fee: saved._id,
        payment: payment._id,
        receipt: payment.receiptNumber,
      });
      await refresh();
      setCheckout(null);
      setSection("Fee receipts");
    } catch (e) {
      setError(e.message);
      await refresh();
      setCheckout(null);
    } finally {
      setBusy(false);
    }
  }
  async function savePlan(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const b = {
        baseAmountPaise: Math.round(Number(fd.get("base")) * 100),
        finePaise: Math.round(Number(fd.get("fine")) * 100),
        scholarshipPaise: Math.round(Number(fd.get("scholarship")) * 100),
        adjustmentNote: fd.get("note"),
        installments: [],
      };
      for (let i = 1; i <= 3; i++) {
        const amount = fd.get("part" + i),
          due = fd.get("due" + i);
        if (amount || due) {
          if (!amount || !due)
            throw Error("Each installment needs amount and due date");
          b.installments.push({
            label: "Installment " + i,
            amountPaise: Math.round(Number(amount) * 100),
            dueAt: new Date(due + "T23:59:59+05:30").toISOString(),
          });
        }
      }
      await api("/fees/" + form.fee._id + "/plan", {
        method: "PATCH",
        body: JSON.stringify(b),
      });
      await refresh();
      setForm(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const amountPaise = Math.round(Number(fd.get("amount")) * 100);
    try {
      if (form.type === "payment") {
        await api(`/fees/${form.fee._id}/payments`, {
          method: "POST",
          body: JSON.stringify({
            amountPaise,
            paidAt: new Date(
              fd.get("paidAt") + "T00:00:00+05:30",
            ).toISOString(),
            reference: fd.get("reference"),
          }),
        });
      } else {
        const body = {
          title: fd.get("title"),
          semester: fd.get("semester"),
          amountPaise,
          dueAt: new Date(fd.get("dueAt") + "T23:59:59+05:30").toISOString(),
        };
        if (form.type === "new") body.student = fd.get("student");
        await api(form.type === "new" ? "/fees" : `/fees/${form.fee._id}`, {
          method: form.type === "new" ? "POST" : "PATCH",
          body: JSON.stringify(body),
        });
      }
      await refresh();
      setForm(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!loaded)
    return (
      <section className="panel" aria-live="polite">
        <h2>Fees</h2>
        <p>{error || "Loading your fee records..."}</p>
      </section>
    );
  if (!teacher) {
    const rows = data.rows.filter(
      (f) =>
        (semester === "All semesters" || f.semester === semester) &&
        (feeType === "All fee heads" || f.title === feeType),
    );
    const transactions = rows
      .flatMap((f) => f.payments.map((p) => ({ ...p, fee: f })))
      .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
    const sum = rows.reduce((n, f) => n + f.amountPaise, 0),
      recorded = rows.reduce((n, f) => n + paid(f), 0);
    return (
      <section className="student-fee-module">
        <nav className="student-fee-menu" aria-label="Student fee sections">
          {[
            "Fee details",
            "Pay demo fees",
            "Fee receipts",
            "Transaction history",
          ].map((n) => (
            <button
              key={n}
              className={section === n ? "active" : ""}
              onClick={() => setSection(n)}
            >
              {n}
            </button>
          ))}
        </nav>
        {error && (
          <p role="alert" className="fee-error">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="demo-payment-success">
            Simulated checkout complete. No real money was charged. Receipt{" "}
            {success.receipt} is in Fee receipts and Transaction history.
          </p>
        )}
        {checkout && (
          <Modal
            title="Review simulated payment"
            onClose={() => !busy && setCheckout(null)}
          >
            <div className="demo-checkout">
              <p className="demo-warning">
                FICTIONAL DEMO ONLY. No real payment, card or bank details. This
                only updates your demo ledger.
              </p>
              <h3>{checkout.title}</h3>
              <p>
                {checkout.semester} · {user?.name}
              </p>
              <dl className="fee-summary">
                <dt>Demo balance to settle</dt>
                <dd>
                  <strong>{money(balance(checkout))}</strong>
                </dd>
              </dl>
              <p>No real fees are paid. Demo records reset on restart.</p>
              <button
                className="primary"
                disabled={busy}
                onClick={simulateCheckout}
              >
                {busy ? "Simulating..." : "Confirm simulated payment"}
              </button>
              <button
                className="small-btn"
                disabled={busy}
                onClick={() => setCheckout(null)}
              >
                Cancel
              </button>
            </div>
          </Modal>
        )}
        <div className="student-fee-content">
          <div className="fee-filters">
            <label>
              Fee type
              <select
                value={feeType}
                onChange={(e) => setFeeType(e.target.value)}
              >
                <option>All fee heads</option>
                {[...new Set(data.rows.map((f) => f.title))].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Duration
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                <option>All semesters</option>
                {[...new Set(data.rows.map((f) => f.semester))].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="muted">
            Fictional student fee view. No real payment gateway or university
            receipt. Amounts shown are demo ledger entries.
          </p>
          {error && (
            <p role="alert" className="fee-error">
              {error}
            </p>
          )}
          {data.rows.some((f) => f.baseAmountPaise) && (
            <section className="panel request-workspace">
              <h2>Configured demo fee plans</h2>
              {rows
                .filter((f) => f.baseAmountPaise)
                .map((f) => (
                  <FeePlan key={f._id} fee={f} money={money} />
                ))}
            </section>
          )}
          {section === "Pay demo fees" ? (
            <section className="panel">
              <div className="panel-title">
                <h2>Pay demo fees</h2>
              </div>
              <p className="demo-warning">
                Simulated checkout only. No real money, card details or payment
                gateway.
              </p>
              {rows.map((f) => (
                <article className="demo-pay-row" key={f._id}>
                  <div>
                    <h3>{f.title}</h3>
                    <p>
                      {f.semester} · Due {date(f.dueAt)}
                    </p>
                    <strong>{money(balance(f))}</strong>
                    <p>{state(f)}</p>
                  </div>
                  <button
                    className="primary"
                    disabled={balance(f) === 0 || busy}
                    onClick={() => {
                      setCheckout(f);
                      setError("");
                      setSuccess(null);
                    }}
                  >
                    {balance(f) === 0 ? "Paid (demo)" : "Simulate payment"}
                  </button>
                </article>
              ))}
              {!rows.length && (
                <Empty>No fee records for this selection.</Empty>
              )}
            </section>
          ) : section === "Fee details" ? (
            <div className="student-fee-columns">
              <section className="panel">
                <div className="panel-title">
                  <h2>Academic fee detail (INR)</h2>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Sem/Year</th>
                        <th>Fee head</th>
                        <th>Current dues</th>
                        <th>Scholarship / Discount</th>
                        <th>Recorded paid</th>
                        <th>Balance</th>
                        <th>Due date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((f) => (
                        <tr key={f._id}>
                          <td>{f.semester}</td>
                          <td>{f.title}</td>
                          <td>{money(f.amountPaise)}</td>
                          <td>
                            {f.baseAmountPaise
                              ? money(f.scholarshipPaise || 0)
                              : "Not recorded"}
                          </td>
                          <td>{money(paid(f))}</td>
                          <td>{money(balance(f))}</td>
                          <td>{date(f.dueAt)}</td>
                          <td>
                            <Badge tone={state(f) === "Paid" ? "green" : ""}>
                              {state(f)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!rows.length && (
                  <Empty>No fee records for this selection.</Empty>
                )}
                <p className="muted">
                  Swipe the table to see all columns on your phone. Adjustments
                  appear only when configured by the demo admin; no automatic
                  university rule is assumed.
                </p>
              </section>
              <aside>
                <section className="panel">
                  <div className="panel-title">
                    <h2>Student details</h2>
                  </div>
                  <dl className="student-fee-info">
                    <dt>Student name</dt>
                    <dd>{user?.name}</dd>
                    <dt>Roll number</dt>
                    <dd>{user?.rollNumber || "--"}</dd>
                    <dt>Student email</dt>
                    <dd>{user?.email}</dd>
                    <dt>Duration</dt>
                    <dd>{semester}</dd>
                  </dl>
                </section>
                <section className="panel">
                  <div className="panel-title">
                    <h2>Fee details</h2>
                  </div>
                  <dl className="student-fee-info">
                    <dt>Total dues</dt>
                    <dd>{money(sum)}</dd>
                    <dt>Recorded paid</dt>
                    <dd>{money(recorded)}</dd>
                    <dt>Balance amount</dt>
                    <dd>
                      <strong>{money(sum - recorded)}</strong>
                    </dd>
                    <dt>Overdue balance</dt>
                    <dd>
                      {money(
                        rows
                          .filter((f) => state(f) === "Overdue")
                          .reduce((n, f) => n + balance(f), 0),
                      )}
                    </dd>
                    <dt>Next pending due</dt>
                    <dd>
                      {rows.find((f) => balance(f) > 0)
                        ? date(rows.find((f) => balance(f) > 0).dueAt)
                        : "None"}
                    </dd>
                  </dl>
                  <p className="muted">
                    Use Pay demo fees to simulate settling your own balance. No
                    real money is charged. Accounts admin can also record demo
                    entries.
                  </p>
                  <button
                    className="small-btn"
                    onClick={() => setSection("Fee receipts")}
                  >
                    View my demo receipts
                  </button>
                </section>
              </aside>
            </div>
          ) : (
            <section className="panel">
              <div className="panel-title">
                <h2>
                  {section === "Fee receipts"
                    ? "Fee receipt details"
                    : "Recorded transaction history"}
                </h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Receipt no.</th>
                      <th>Receipt date</th>
                      <th>Fee head</th>
                      <th>Amount</th>
                      <th>Remarks / Reference</th>
                      <th>Demo receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((p) => (
                      <tr key={p._id}>
                        <td>{p.receiptNumber}</td>
                        <td>{date(p.paidAt)}</td>
                        <td>{p.fee.title}</td>
                        <td>{money(p.amountPaise)}</td>
                        <td>{p.reference}</td>
                        <td>
                          <a
                            className="small-btn"
                            href={`/api/fees/${p.fee._id}/receipts/${p._id}`}
                            download
                          >
                            Download demo TXT
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!transactions.length && (
                <Empty>No recorded payments for this selection.</Empty>
              )}
              <p className="muted">
                Every download is marked fictional. It is not proof of a real
                university payment.
              </p>
            </section>
          )}
        </div>
      </section>
    );
  }
  return (
    <>
      <section className="panel">
        <div className="panel-title">
          <h2>{teacher ? "Student fee records" : "Your fees"}</h2>
          {teacher && (
            <button
              className="primary"
              onClick={() => {
                setError("");
                setForm({ type: "new" });
              }}
            >
              <Plus size={16} />
              Add fee record
            </button>
          )}
        </div>
        <p className="muted">
          Fictional fee ledger only. No payment gateway, real charge or official
          university receipt. Records reset with the demo.
        </p>
        <div className="fees-summary">
          <Stat
            icon={Wallet}
            label="Total fees"
            value={money(total)}
            note="Listed fee items"
          />
          <Stat
            icon={CheckCircle2}
            label="Recorded paid"
            value={money(collected)}
            note="Demo ledger entries"
          />
          <Stat
            icon={Clock}
            label="Pending dues"
            value={money(total - collected)}
            note={overdue ? `${money(overdue)} overdue` : "No overdue balance"}
          />
        </div>
        {error && (
          <p role="alert" className="fee-error">
            {error}
          </p>
        )}
        {!data.rows.length && <Empty>No fee records yet.</Empty>}
        <div className="fee-grid">
          {data.rows.map((f) => (
            <article className="panel fee-card" key={f._id}>
              <div className="panel-title">
                <h2>{f.title}</h2>
                <Badge tone={state(f) === "Paid" ? "green" : ""}>
                  {state(f)}
                </Badge>
              </div>
              <p className="muted">
                {f.semester}
                {teacher
                  ? ` · ${f.student.name} (${f.student.rollNumber || "Student"})`
                  : ""}
              </p>
              <dl className="fee-values">
                <div>
                  <dt>Total</dt>
                  <dd>{money(f.amountPaise)}</dd>
                </div>
                <div>
                  <dt>Recorded paid</dt>
                  <dd>{money(paid(f))}</dd>
                </div>
                <div>
                  <dt>Balance</dt>
                  <dd>{money(balance(f))}</dd>
                </div>
                <div>
                  <dt>Due date</dt>
                  <dd>
                    {new Date(f.dueAt).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              </dl>
              {f.baseAmountPaise && <FeePlan fee={f} money={money} />}
              {teacher && (
                <div className="fee-actions">
                  <button
                    className="small-btn"
                    onClick={() => {
                      setError("");
                      setForm({ type: "plan", fee: f });
                    }}
                  >
                    Configure demo plan
                  </button>
                  <button
                    className="small-btn"
                    onClick={() => {
                      setError("");
                      setForm({ type: "edit", fee: f });
                    }}
                  >
                    Edit fee
                  </button>
                  {balance(f) > 0 && (
                    <button
                      className="primary"
                      onClick={() => {
                        setError("");
                        setForm({ type: "payment", fee: f });
                      }}
                    >
                      Record demo payment
                    </button>
                  )}
                </div>
              )}
              <h3>Payment history</h3>
              {!f.payments.length ? (
                <p className="muted">No payments recorded.</p>
              ) : (
                f.payments.map((p) => (
                  <div className="fee-payment" key={p._id}>
                    <div>
                      <strong>{money(p.amountPaise)}</strong>
                      <p className="muted">
                        {date(p.paidAt)} · {p.reference}
                      </p>
                      <small>{p.receiptNumber}</small>
                    </div>
                    <a
                      className="small-btn"
                      href={`/api/fees/${f._id}/receipts/${p._id}`}
                      download
                    >
                      <Download size={15} /> Demo receipt
                    </a>
                  </div>
                ))
              )}
            </article>
          ))}
        </div>
      </section>
      {form?.type === "plan" && (
        <Modal
          title="Configure demo fee plan"
          onClose={() => !busy && setForm(null)}
        >
          <form className="request-form" onSubmit={savePlan}>
            <p>
              Fictional amounts only. Net fee = base + fine - scholarship. Plans
              must total the net fee, never less than recorded payments.
            </p>
            {error && <p role="alert">{error}</p>}
            <label>
              Base fee (INR)
              <input
                required
                name="base"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={
                  (form.fee.baseAmountPaise || form.fee.amountPaise) / 100
                }
              />
            </label>
            <label>
              Demo fine (INR)
              <input
                required
                name="fine"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(form.fee.finePaise || 0) / 100}
              />
            </label>
            <label>
              Demo scholarship (INR)
              <input
                required
                name="scholarship"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(form.fee.scholarshipPaise || 0) / 100}
              />
            </label>
            <label>
              Adjustment reason
              <input
                required
                name="note"
                minLength={3}
                maxLength={300}
                defaultValue={form.fee.adjustmentNote}
              />
            </label>
            <h3>Optional installment schedule</h3>
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <label>
                  {"Installment " + i + " amount (INR)"}
                  <input
                    name={"part" + i}
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={
                      form.fee.installments?.[i - 1]?.amountPaise / 100 || ""
                    }
                  />
                </label>
                <label>
                  {"Installment " + i + " due date"}
                  <input
                    name={"due" + i}
                    type="date"
                    defaultValue={
                      form.fee.installments?.[i - 1]?.dueAt?.slice(0, 10) || ""
                    }
                  />
                </label>
              </div>
            ))}
            <button className="primary" disabled={busy}>
              Save demo fee plan
            </button>
          </form>
        </Modal>
      )}
      {form && form.type !== "plan" && (
        <Modal
          title={
            form.type === "payment"
              ? "Record demo payment"
              : form.type === "new"
                ? "Add fee record"
                : "Edit fee record"
          }
          onClose={() => {
            if (!busy) setForm(null);
          }}
        >
          <form onSubmit={submit} className="fee-form">
            {form.type === "payment" ? (
              <>
                <p className="muted">
                  Ledger entry only. Nothing will be charged. Remaining:{" "}
                  {money(balance(form.fee))}
                </p>
                <label>
                  Recorded amount (INR)
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={balance(form.fee) / 100}
                    required
                  />
                </label>
                <label>
                  Payment date
                  <input
                    name="paidAt"
                    type="date"
                    required
                    defaultValue={new Intl.DateTimeFormat("en-CA", {
                      timeZone: "Asia/Kolkata",
                    }).format(new Date())}
                    max={new Intl.DateTimeFormat("en-CA", {
                      timeZone: "Asia/Kolkata",
                    }).format(new Date())}
                  />
                </label>
                <label>
                  Demo reference
                  <input
                    name="reference"
                    maxLength={100}
                    required
                    placeholder="Fictional ledger reference"
                  />
                </label>
              </>
            ) : (
              <>
                {form.type === "new" && (
                  <label>
                    Student
                    <select name="student" required>
                      <option value="">Choose student</option>
                      {data.students.map((st) => (
                        <option key={st._id} value={st._id}>
                          {st.name} · {st.rollNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Fee title
                  <input
                    name="title"
                    maxLength={100}
                    defaultValue={form.fee?.title}
                    required
                  />
                </label>
                <label>
                  Semester
                  <input
                    name="semester"
                    maxLength={80}
                    defaultValue={form.fee?.semester || "Semester 5"}
                    required
                  />
                </label>
                <label>
                  Total amount (INR)
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min={form.fee ? Math.max(0.01, paid(form.fee) / 100) : 0.01}
                    defaultValue={form.fee ? form.fee.amountPaise / 100 : ""}
                    required
                  />
                </label>
                <label>
                  Due date
                  <input
                    name="dueAt"
                    type="date"
                    defaultValue={
                      form.fee
                        ? new Intl.DateTimeFormat("en-CA", {
                            timeZone: "Asia/Kolkata",
                          }).format(new Date(form.fee.dueAt))
                        : ""
                    }
                    required
                  />
                </label>
              </>
            )}
            {error && (
              <p role="alert" className="fee-error">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Saving..." : "Save demo record"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function ModuleSpotlight({ tab, assignments, pending, notices }) {
  const config = {
    Assignments: [
      ClipboardList,
      "Your next move",
      "Keep the work moving.",
      "Briefs, deadlines and submissions in one place.",
      `${pending.length} pending`,
      `${assignments.length - pending.length} submitted`,
    ],
    Notices: [
      Megaphone,
      "Campus circulars",
      "Stay in the loop.",
      "Read the latest announcements from your campus workspace.",
      `${notices.length} updates`,
      "Campus bulletin",
    ],
    Applications: [
      NotebookPen,
      "Student services",
      "Less paperwork. More clarity.",
      "Start a document request and follow its status.",
      "Documents",
      "Status history",
    ],
    Hostel: [
      CalendarDays,
      "Hostel desk",
      "Plan your time away.",
      "Keep outpass requests and status history together.",
      "Outpass requests",
      "Status history",
    ],
    Grievances: [
      MessageSquare,
      "Student support",
      "A place to be heard.",
      "Record a concern and keep track of the response.",
      "New concern",
      "Status history",
    ],
    Timetable: [
      CalendarDays,
      "Your weekly rhythm",
      "Make room for your day.",
      "Your classes, rooms and times, laid out clearly.",
      "Weekly view",
      "Class schedule",
    ],
    Library: [
      LibraryBig,
      "Reading room",
      "Your next good read.",
      "Browse the catalog and manage your library loans.",
      "Book catalog",
      "Your loans",
    ],
    Exams: [
      GraduationCap,
      "Exam workspace",
      "Prepare with a clear plan.",
      "Check dates, rooms and exam requests in one place.",
      "Exam schedule",
      "Applications",
    ],
    Fees: [
      Wallet,
      "Fee workspace",
      "Every record, clearly laid out.",
      "Check balances, installments and demo receipts.",
      "Fee records",
      "Payment history",
    ],
    Resources: [
      BookOpen,
      "Study shelf",
      "A little help for the next chapter.",
      "Find example papers and syllabus materials by subject.",
      "Practice papers",
      "Syllabus",
    ],
    Clubs: [
      GraduationCap,
      "Beyond the classroom",
      "Find your people.",
      "Explore clubs and keep a record of your achievements.",
      "Campus clubs",
      "Achievements",
    ],
    Courses: [
      BookOpen,
      "Academic workspace",
      "Get to know your subjects.",
      "Your enrolled courses and classroom details.",
      "Your courses",
      "Subject details",
    ],
    Assistant: [
      Sparkles,
      "Your work, in focus",
      "Start with what's next.",
      "A rules-based planner for your recorded assignments.",
      "Assignment planner",
      "English + Hindi",
    ],
  }[tab];
  if (!config) return null;
  const [Icon, eyebrow, title, description, first, second] = config;
  return (
    <section className="module-spotlight">
      <span className="module-spotlight-icon">
        <Icon size={30} />
      </span>
      <span className="studio-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="spotlight-tags">
        <span>{first}</span>
        <span>{second}</span>
      </div>
    </section>
  );
}
function ResultsStudio({ results }) {
  const credits = results.rows.reduce((sum, r) => sum + r.course.credits, 0);
  const themes = ["ocean", "violet", "mint", "sunset"];
  return (
    <div className="results-studio">
      <section className="results-hero">
        <span className="studio-eyebrow">
          <GraduationCap size={15} /> YOUR ACADEMIC PROGRESS
        </span>
        <h2>Grade profile</h2>
        <div className="results-score-row">
          <div>
            <strong>
              {results.cgpa?.toFixed(2) || "--"}
              <small> / 10</small>
            </strong>
            <span>Credit-weighted CGPA</span>
          </div>
          <span className="results-medallion">
            <GraduationCap size={43} />
          </span>
        </div>
        <div className="results-summary">
          <span>
            <strong>{results.rows.length}</strong> graded subjects
          </span>
          <span>
            <strong>{credits}</strong> graded credits
          </span>
        </div>
        <p>Recorded grade points only. No invented semester history.</p>
      </section>
      <div className="attendance-section-label">
        <h2>Subject performance</h2>
        <span>Grade points / 10</span>
      </div>
      <div className="attendance-subject-grid">
        {results.rows.map((r, i) => (
          <section
            className={
              "attendance-subject result-subject " + themes[i % themes.length]
            }
            key={r._id}
          >
            <div className="subject-topline">
              <span className="subject-code">
                <BookOpen size={14} /> {r.course.code}
              </span>
              <span className="result-credit">{r.course.credits} credits</span>
            </div>
            <h3>{r.course.name}</h3>
            <div className="subject-value-row">
              <strong>
                {r.gradePoint.toFixed(1)}
                <small> / 10</small>
              </strong>
            </div>
            <div
              className="subject-progress"
              role="img"
              aria-label={`${r.course.code} grade point ${r.gradePoint.toFixed(1)} out of 10`}
            >
              <i style={{ width: `${r.gradePoint * 10}%` }} />
            </div>
            <div className="subject-progress-label">
              <span>0</span>
              <span>Grade point</span>
              <span>10</span>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
function AttendanceStudio({ attendance }) {
  const total = attendance.reduce((sum, a) => sum + a.total, 0);
  const attended = attendance.reduce((sum, a) => sum + a.attended, 0);
  const overall = total ? (attended / total) * 100 : 0;
  const needsAttention = attendance.filter((a) => a.total && a.percentage < 75);
  const onTrack = attendance.filter(
    (a) => a.total && a.percentage >= 75,
  ).length;
  const themes = ["ocean", "sunset", "violet", "mint"];
  return (
    <div className="attendance-studio">
      <section className="attendance-hero">
        <div className="attendance-hero-top">
          <div>
            <span className="studio-eyebrow">
              <CalendarCheck size={14} /> CLASS CHECK-IN
            </span>
            <h2>Attendance health</h2>
            <p>Small steps. A stronger semester.</p>
          </div>
          <span className="target-pill">75% target</span>
        </div>
        <div className="attendance-hero-body">
          <div
            className="attendance-ring"
            style={{ "--progress": `${overall}%` }}
            role="img"
            aria-label={`Overall attendance ${overall.toFixed(1)} percent`}
          >
            <div>
              <strong>
                {total ? overall.toFixed(1) : "--"}
                <small>%</small>
              </strong>
              <span>Overall</span>
            </div>
          </div>
          <div className="attendance-hero-facts">
            <strong>
              {attended}
              <span> / {total}</span>
            </strong>
            <p>Classes attended</p>
            <span className="hero-status">
              <CheckCircle2 size={14} /> {onTrack} of {attendance.length}{" "}
              subjects on track
            </span>
          </div>
        </div>
        <p className="attendance-hero-foot">
          Recorded classes only · subject target: 75%
        </p>
      </section>
      {needsAttention.length > 0 && (
        <button
          className="attendance-catchup"
          onClick={() =>
            document
              .getElementById("attendance-subjects")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          <span className="catchup-icon">
            <Sparkles size={19} />
          </span>
          <span>
            <strong>Let's get you back on track</strong>
            <small>
              {needsAttention.map((a) => a.course.code).join(", ")} below 75%.
              Your plan is below.
            </small>
          </span>
          <ChevronRight size={18} />
        </button>
      )}
      <div className="attendance-section-label" id="attendance-subjects">
        <h2>Your subjects</h2>
        <span>{attendance.length} subjects</span>
      </div>
      <div className="attendance-subject-grid">
        {attendance.map((a, i) => (
          <section
            className={`attendance-subject ${themes[i % themes.length]}`}
            key={a._id}
          >
            <div className="subject-topline">
              <span className="subject-code">
                <BookOpen size={14} /> {a.course.code}
              </span>
              <span
                className={`subject-status ${a.mustAttend ? "recover" : "safe"}`}
              >
                {a.mustAttend
                  ? "Needs attention"
                  : a.total
                    ? "On track"
                    : "No classes yet"}
              </span>
            </div>
            <h3>{a.course.name}</h3>
            <div className="subject-value-row">
              <strong>
                {a.percentage.toFixed(1)}
                <small>%</small>
              </strong>
              <span>
                {a.attended}
                <b> / {a.total}</b>
                <small>classes attended</small>
              </span>
            </div>
            <div
              className="subject-progress"
              role="img"
              aria-label={`${a.course.code} ${a.percentage.toFixed(1)} percent attendance, target 75 percent`}
            >
              <i
                style={{
                  width: `${Math.max(0, Math.min(100, a.percentage))}%`,
                }}
              />
              <b />
            </div>
            <div className="subject-progress-label">
              <span>0%</span>
              <span>75% target</span>
              <span>100%</span>
            </div>
            <div
              className={`subject-plan ${a.mustAttend ? "recover" : "safe"}`}
            >
              {a.mustAttend ? (
                <CalendarCheck size={17} />
              ) : (
                <CheckCircle2 size={17} />
              )}
              <span>
                {a.mustAttend ? (
                  <>
                    Attend <strong>{a.mustAttend} consecutive classes</strong>{" "}
                    to reach 75%.
                  </>
                ) : (
                  <>
                    Safe to miss <strong>{a.canMiss} more classes</strong>.
                  </>
                )}
              </span>
            </div>
          </section>
        ))}
        {!attendance.length && (
          <Empty>Attendance will appear once your teacher records it.</Empty>
        )}
      </div>
      <section className="panel calculator attendance-planner">
        <div className="planner-title">
          <span>
            <Sparkles size={21} />
          </span>
          <div>
            <h2>Plan your next class</h2>
            <p>A little planning keeps you ahead.</p>
          </div>
        </div>
        <AttendanceCalculator />
        <p className="planner-footnote">
          Calculated from attended and total classes at a 75% target.
        </p>
      </section>
    </div>
  );
}
function Analytics({ attendance, results, section }) {
  return (
    <div className="analytics-grid">
      {section !== "grades" && (
        <section className="panel">
          <div className="panel-title">
            <h2>Attendance health</h2>
            <Badge>75% target</Badge>
          </div>
          {attendance.map((a) => {
            const pct = a.total ? Math.round((a.attended / a.total) * 100) : 0;
            return (
              <div className="chart-row" key={a._id}>
                <div>
                  <strong>{a.course.code}</strong>
                  <span>
                    {pct}% · {a.attended}/{a.total} classes
                  </span>
                </div>
                <div className="chart-track">
                  <div
                    style={{
                      width: `${pct}%`,
                      background: pct < 75 ? "#ef7867" : "#2eb7a6",
                    }}
                  />
                  <span className="chart-target" style={{ left: "75%" }} />
                </div>
                <small>
                  {pct < 75
                    ? `Attend ${a.mustAttend} consecutive classes to recover`
                    : "On track"}
                </small>
              </div>
            );
          })}
          <p className="muted">
            Based on recorded class totals, not projected attendance.
          </p>
        </section>
      )}
      {section !== "attendance" && (
        <section className="panel">
          <div className="panel-title">
            <h2>Grade profile</h2>
            <Badge>CGPA {results.cgpa?.toFixed(2) || "--"}</Badge>
          </div>
          {results.rows.map((r) => (
            <div className="chart-row" key={r._id}>
              <div>
                <strong>{r.course.code}</strong>
                <span>
                  {r.gradePoint.toFixed(1)}/10 · {r.course.credits} credits
                </span>
              </div>
              <div className="chart-track">
                <div
                  style={{
                    width: `${r.gradePoint * 10}%`,
                    background: "#7b8df1",
                  }}
                />
              </div>
            </div>
          ))}
          <p className="muted">
            Credit-weighted grades by course. No invented semester history.
          </p>
        </section>
      )}
    </div>
  );
}
function CampusModule({ type, user, courses }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [day, setDay] = useState(new Date().getDay() || 7),
    [search, setSearch] = useState(""),
    [form, setForm] = useState(false),
    [busy, setBusy] = useState(false);
  const endpoint =
    type === "Library" ? "library" : type === "Exams" ? "exams" : "timetable";
  const load = () => api("/" + endpoint).then(setData);
  useEffect(() => {
    setData(null);
    setError("");
    load().catch((e) => setError(e.message));
  }, [type]);
  const mutate = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
      setForm(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const days = [
    "",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  async function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const b = Object.fromEntries(f);
    if (type === "Timetable") b.day = Number(b.day);
    else {
      b.startsAt = new Date(b.startsAt).toISOString();
      b.durationMinutes = Number(b.durationMinutes);
    }
    await mutate(() =>
      api("/" + endpoint, { method: "POST", body: JSON.stringify(b) }),
    );
  }
  function downloadExam(x) {
    const start = new Date(x.startsAt),
      end = new Date(start.getTime() + x.durationMinutes * 60000);
    const stamp = (d) =>
      d
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const esc = (t) =>
      String(t)
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/[,;]/g, "\\$&");
    const text = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SmartERP//Fictional Demo//EN",
      "BEGIN:VEVENT",
      `UID:${x._id}@smarterp.demo`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc("DEMO: " + x.course.name + " - " + x.title)}`,
      `LOCATION:${esc(x.room)}`,
      "DESCRIPTION:Fictional exam schedule. Not an official university datesheet.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/calendar" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "demo-exam.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  return (
    <section className="panel campus-module">
      <div className="panel-title">
        <h2>
          {type === "Timetable"
            ? "Your week, planned"
            : type === "Library"
              ? "Library workspace"
              : "Exam planner"}
        </h2>
        {type !== "Library" && user.role !== "student" && (
          <button className="primary" onClick={() => setForm(true)}>
            <Plus size={16} />
            Add {type === "Exams" ? "exam" : "class"}
          </button>
        )}
      </div>
      <p className="muted">
        Fictional demo {type.toLowerCase()} records. Nothing here is an official
        college schedule or library entry.
      </p>
      {error && (
        <p role="alert" className="fee-error">
          {error}
        </p>
      )}
      {!data ? (
        <p>Loading {type.toLowerCase()}...</p>
      ) : type === "Timetable" ? (
        <>
          <div className="day-picker">
            {days.slice(1).map((d, i) => (
              <button
                className={day === i + 1 ? "active" : ""}
                key={d}
                onClick={() => setDay(i + 1)}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
          <h3>{days[day]}</h3>
          {data
            .filter((x) => x.day === day)
            .map((x) => (
              <article className="schedule-card" key={x._id}>
                <div className="schedule-time">
                  {x.start}
                  <small>{x.end}</small>
                </div>
                <div>
                  <Badge>{x.kind}</Badge>
                  <h3>{x.course.name}</h3>
                  <p>
                    {x.course.code} · {x.room}
                  </p>
                </div>
              </article>
            ))}
          {!data.some((x) => x.day === day) && (
            <Empty>No classes scheduled for {days[day]}.</Empty>
          )}
        </>
      ) : type === "Exams" ? (
        <div className="exam-grid">
          {data.map((x) => (
            <article className="exam-card" key={x._id}>
              <Badge>{x.course.code}</Badge>
              <h3>{x.course.name}</h3>
              <p>{x.title}</p>
              <strong>
                {new Date(x.startsAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                IST
              </strong>
              <p>
                {x.durationMinutes} minutes · {x.room}
              </p>
              <p>Demo seating: {x.seating}</p>
              <button className="small-btn" onClick={() => downloadExam(x)}>
                <Download size={15} />
                Save demo calendar file
              </button>
            </article>
          ))}
        </div>
      ) : (
        <>
          <nav className="section-menu" aria-label="Library sections">
            <a href="#my-books">My issued books</a>
            <a href="#catalogue">Book catalogue</a>
          </nav>
          <h3 id="my-books">My issued books</h3>
          {data.loans.map((l) => (
            <article className="loan-card" key={l._id}>
              <div>
                <h3>{l.book.title}</h3>
                <p>
                  Due {date(l.dueAt)} ·{" "}
                  {l.returnedAt
                    ? "Returned"
                    : new Date(l.dueAt) < new Date()
                      ? "Overdue"
                      : "Issued"}{" "}
                  · Renewals {l.renewals}/1
                </p>
                {user.role === "admin" && <small>{l.student.name}</small>}
              </div>
              {!l.returnedAt && (
                <button
                  className="small-btn"
                  disabled={
                    busy || l.renewals >= 1 || new Date(l.dueAt) < new Date()
                  }
                  onClick={() =>
                    mutate(() =>
                      api("/library/" + l._id + "/renew", { method: "POST" }),
                    )
                  }
                >
                  Renew for 7 days
                </button>
              )}
            </article>
          ))}
          {!data.loans.length && <Empty>No issued books.</Empty>}
          <h3 id="catalogue">Book catalogue</h3>
          <label className="catalogue-search">
            Search title or author
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Algorithms, databases..."
            />
          </label>
          <div className="exam-grid">
            {data.books
              .filter((b) =>
                (b.title + " " + b.author)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((b) => (
                <article className="exam-card" key={b._id}>
                  <LibraryBig size={26} />
                  <h3>{b.title}</h3>
                  <p>{b.author}</p>
                  <Badge>
                    {b.available} of {b.copies} copies available
                  </Badge>
                  <small>{b.code}</small>
                </article>
              ))}
          </div>
          <p className="muted">
            Issuing and returns are admin-only API actions in this demo. Renewal
            is limited to one, before the due date. No fine is charged by this
            demo.
          </p>
        </>
      )}
      {form && (
        <Modal
          title={type === "Exams" ? "Add demo exam" : "Add scheduled class"}
          onClose={() => setForm(false)}
        >
          <form className="fee-form" onSubmit={save}>
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
            {type === "Timetable" ? (
              <>
                <label>
                  Day
                  <select name="day">
                    {days.slice(1).map((d, i) => (
                      <option key={d} value={i + 1}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Start
                  <input name="start" type="time" required />
                </label>
                <label>
                  End
                  <input name="end" type="time" required />
                </label>
                <label>
                  Class type
                  <select name="kind">
                    <option>Lecture</option>
                    <option>Lab</option>
                    <option>Tutorial</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label>
                  Exam title
                  <input name="title" required maxLength={100} />
                </label>
                <label>
                  Starts at (local time)
                  <input name="startsAt" type="datetime-local" required />
                </label>
                <label>
                  Duration (minutes)
                  <input
                    name="durationMinutes"
                    type="number"
                    min="15"
                    max="360"
                    defaultValue="120"
                    required
                  />
                </label>
                <label>
                  Demo seating
                  <input name="seating" required maxLength={100} />
                </label>
              </>
            )}
            <label>
              Room
              <input name="room" required maxLength={50} />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="primary" disabled={busy}>
              Save fictional schedule
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}

function RequestWorkspace({ kind, admin = false }) {
  const [rows, setRows] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [section, setSection] = useState("Status history"),
    [filter, setFilter] = useState("All"),
    [review, setReview] = useState(null);
  const load = () =>
    api("/requests" + (admin ? "" : "?kind=" + encodeURIComponent(kind))).then(
      setRows,
    );
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = e.currentTarget,
      f = Object.fromEntries(new FormData(form));
    try {
      if (admin) {
        await api("/requests/" + review._id, {
          method: "PATCH",
          body: JSON.stringify(f),
        });
        setReview(null);
      } else {
        f.kind = kind;
        if (kind === "Hostel") {
          f.fromAt = new Date(f.fromAt + "+05:30").toISOString();
          f.toAt = new Date(f.toAt + "+05:30").toISOString();
        }
        await api("/requests", { method: "POST", body: JSON.stringify(f) });
        form.reset();
        setSection("Status history");
      }
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel request-workspace">
      <div className="panel-title">
        <h2>
          {admin
            ? "Student request inbox"
            : kind === "Applications"
              ? "Documents and applications"
              : kind === "Hostel"
                ? "Hostel outpass"
                : kind === "Exam requests"
                  ? "Exam applications and admit cards"
                  : "Grievance desk"}
        </h2>
      </div>
      <p className="demo-warning">
        Fictional demo only. No request is sent to a real college. Do not enter
        real personal details. Approval is not official permission or a real
        document.
      </p>
      {error && (
        <p role="alert" className="fee-error">
          {error}
        </p>
      )}
      {!admin && (
        <nav className="section-menu" aria-label={kind + " sections"}>
          {["New request", "Status history"].map((n) => (
            <button
              className={"small-btn " + (section === n ? "selected" : "")}
              aria-pressed={section === n}
              key={n}
              onClick={() => setSection(n)}
            >
              {n}
            </button>
          ))}
        </nav>
      )}
      {admin && (
        <label>
          Request type
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {[
              "All",
              "Applications",
              "Hostel",
              "Grievances",
              "Exam requests",
            ].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
      {!admin && section === "New request" ? (
        <form className="request-form" onSubmit={submit}>
          {kind === "Applications" && (
            <label>
              Document type
              <select name="category">
                {["Certificate", "Document copy", "ID card", "Degree"].map(
                  (n) => (
                    <option key={n}>{n}</option>
                  ),
                )}
              </select>
            </label>
          )}
          {kind === "Exam requests" && (
            <label>
              Exam request type
              <select name="category">
                <option>Back paper</option>
                <option>Makeup exam</option>
              </select>
            </label>
          )}
          <label>
            {kind === "Grievances" ? "Complaint subject" : "Request subject"}
            <input
              required
              name="subject"
              minLength={3}
              maxLength={100}
              placeholder="Fictional demo request"
            />
          </label>
          <label>
            {kind === "Hostel" ? "Reason for leave" : "Details"}
            <textarea required name="details" minLength={5} maxLength={2000} />
          </label>
          {kind === "Hostel" && (
            <>
              <label>
                Departure (IST)
                <input required type="datetime-local" name="fromAt" />
              </label>
              <label>
                Return (IST)
                <input required type="datetime-local" name="toAt" />
              </label>
              <label>
                Demo destination
                <input
                  required
                  name="destination"
                  maxLength={150}
                  placeholder="Fictional destination"
                />
              </label>
            </>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Saving..." : "Submit demo request"}
          </button>
        </form>
      ) : !rows ? (
        <p>Loading requests...</p>
      ) : (
        <div>
          {rows
            .filter((r) => filter === "All" || r.kind === filter)
            .map((r) => (
              <article className="request-card" key={r._id}>
                <Badge
                  tone={
                    r.status === "Approved" || r.status === "Resolved"
                      ? "green"
                      : "amber"
                  }
                >
                  {r.status}
                </Badge>
                <h3>{r.subject}</h3>
                <p>
                  {r.kind}
                  {r.category ? " · " + r.category : ""} · {date(r.createdAt)}
                </p>
                {admin && (
                  <strong>
                    {r.student.name} · {r.student.rollNumber}
                  </strong>
                )}
                <p className="request-details">{r.details}</p>
                {r.fromAt && (
                  <p>
                    {new Date(r.fromAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    to{" "}
                    {new Date(r.toAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    IST · {r.destination}
                  </p>
                )}
                {r.reviewNote && (
                  <p>
                    <strong>Demo reviewer note:</strong> {r.reviewNote}
                  </p>
                )}
                {!admin &&
                  r.kind === "Exam requests" &&
                  r.status === "Approved" && (
                    <a
                      className="small-btn"
                      href={"/api/requests/" + r._id + "/admit-card"}
                      download
                    >
                      Download fictional admit card
                    </a>
                  )}
                {admin && (
                  <button className="small-btn" onClick={() => setReview(r)}>
                    Review demo request
                  </button>
                )}
              </article>
            ))}
          {!rows.some((r) => filter === "All" || r.kind === filter) && (
            <Empty>No requests yet.</Empty>
          )}
        </div>
      )}
      {review && (
        <Modal
          title="Review demo request"
          onClose={() => !busy && setReview(null)}
        >
          <form className="request-form" onSubmit={submit}>
            <h3>{review.subject}</h3>
            <label>
              Review status
              <select name="status">
                {(review.kind === "Grievances"
                  ? ["In review", "Resolved", "Rejected"]
                  : ["Approved", "Rejected"]
                ).map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              Reviewer note
              <textarea
                required
                name="reviewNote"
                minLength={3}
                maxLength={1000}
              />
            </label>
            <button className="primary" disabled={busy}>
              Save demo review
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}

function CampusExtras({ type, user }) {
  const [data, setData] = useState(null),
    [filter, setFilter] = useState(type === "Resources" ? "Paper" : "Clubs"),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () =>
    api(type === "Resources" ? "/resources" : "/clubs").then(setData);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function act(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function achievement(e) {
    e.preventDefault();
    const f = e.currentTarget,
      b = Object.fromEntries(new FormData(f));
    b.achievedOn = new Date(b.achievedOn + "T00:00:00+05:30").toISOString();
    await act(async () => {
      await api("/achievements", { method: "POST", body: JSON.stringify(b) });
      f.reset();
    });
  }
  return (
    <section className="panel request-workspace">
      <div className="panel-title">
        <h2>
          {type === "Resources"
            ? "Papers and syllabus"
            : "Clubs and achievements"}
        </h2>
      </div>
      <p className="demo-warning">
        Fictional demo content only. Papers are example practice materials, not
        actual university papers. Memberships and achievements have no
        real-college effect.
      </p>
      {error && <p role="alert">{error}</p>}
      <nav className="section-menu">
        {(type === "Resources"
          ? ["Paper", "Syllabus"]
          : ["Clubs", "Achievements"]
        ).map((n) => (
          <button
            className={"small-btn " + (filter === n ? "selected" : "")}
            aria-pressed={filter === n}
            key={n}
            onClick={() => setFilter(n)}
          >
            {n === "Paper" ? "Previous-year papers" : n}
          </button>
        ))}
      </nav>
      {!data ? (
        <p>Loading...</p>
      ) : type === "Resources" ? (
        <>
          <label>
            Search resources
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Subject or session"
            />
          </label>
          {data
            .filter(
              (r) =>
                r.kind === filter &&
                (r.title + " " + r.session)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((r) => (
              <article className="request-card" key={r._id}>
                <Badge>{r.kind}</Badge>
                <h3>{r.title}</h3>
                <p>
                  {r.course.code} · {r.session} · {r.semester}
                </p>
                <p>Fictional example, not an official paper or syllabus.</p>
                <a
                  className="small-btn"
                  href={"/api/resources/" + r._id + "/download"}
                  download
                >
                  Download demo TXT
                </a>
              </article>
            ))}
        </>
      ) : filter === "Clubs" ? (
        <div>
          {data.clubs.map((c) => {
            const joined = data.memberships.some((m) => m.club === c._id);
            return (
              <article className="request-card" key={c._id}>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <Badge>{joined ? "Joined (demo)" : "Open"}</Badge>
                {user.role === "student" && (
                  <button
                    className="small-btn"
                    disabled={busy}
                    onClick={() =>
                      act(() =>
                        api("/clubs/" + c._id + "/join", {
                          method: joined ? "DELETE" : "POST",
                        }),
                      )
                    }
                  >
                    {joined ? "Leave demo club" : "Join demo club"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <>
          <h3>Self-reported demo achievements</h3>
          <p>These are unverified, not official certificates.</p>
          {data.achievements.map((a) => (
            <article className="request-card" key={a._id}>
              <h3>{a.title}</h3>
              <p>{date(a.achievedOn)} · Self-reported</p>
              <p>{a.details}</p>
            </article>
          ))}
          {!data.achievements.length && <Empty>No achievements yet.</Empty>}
          <form className="request-form" onSubmit={achievement}>
            <label>
              Achievement title
              <input name="title" required minLength={3} maxLength={100} />
            </label>
            <label>
              Achievement details
              <textarea
                name="details"
                required
                minLength={5}
                maxLength={1000}
              />
            </label>
            <label>
              Achievement date
              <input type="date" name="achievedOn" required />
            </label>
            <button className="primary" disabled={busy}>
              Add demo achievement
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function FeePlan({ fee, money }) {
  let recorded = fee.payments.reduce((n, p) => n + p.amountPaise, 0);
  return (
    <article className="request-card">
      <h3>{fee.title} - demo plan</h3>
      <p>
        Base {money(fee.baseAmountPaise)} + fine {money(fee.finePaise || 0)} -
        scholarship {money(fee.scholarshipPaise || 0)} = net{" "}
        {money(fee.amountPaise)}
      </p>
      <p>{fee.adjustmentNote}</p>
      {fee.installments?.map((i) => {
        const allocated = Math.min(recorded, i.amountPaise);
        recorded -= allocated;
        return (
          <p key={i._id}>
            {i.label} · Due {date(i.dueAt)} · {money(i.amountPaise)} · Remaining{" "}
            {money(i.amountPaise - allocated)}
          </p>
        );
      })}
      <small>
        Demo entries allocated to installments in due-date order. No automatic
        fines or scholarship eligibility. Student checkout still settles the
        full outstanding fee; admin can record partial demo entries.
      </small>
    </article>
  );
}
