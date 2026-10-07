import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as defaultModels from "./models.js";
export async function seed(models = defaultModels) {
  const {
    User,
    Course,
    Assignment,
    Attendance,
    Result,
    Notice,
    Fee,
    ClassSession,
    Exam,
    Book,
    Loan,
    LearningResource,
    Club,
  } = models;
  if (await User.exists({ email: "student@smarterp.demo" })) return;
  const passwordHash = await bcrypt.hash("SmartERPdemo123!", 12);
  const student = await User.create({
    name: "Aarav Sharma",
    email: "student@smarterp.demo",
    role: "student",
    rollNumber: "CS2024-031",
    passwordHash,
  });
  const teacher = await User.create({
    name: "Dr. Meera Singh",
    email: "teacher@smarterp.demo",
    role: "teacher",
    passwordHash,
  });
  const admin = await User.create({
    name: "Demo Accounts Office",
    email: "admin@smarterp.demo",
    role: "admin",
    passwordHash,
  });
  const specs = [
    ["Data Structures", "CS201", 4, 32, 40, 8.5],
    ["Database Systems", "CS202", 4, 27, 40, 9],
    ["Computer Networks", "CS203", 3, 35, 40, 8],
    ["Engineering Mathematics", "MA201", 3, 36, 42, 9.5],
  ];
  const courses = [];
  for (const [name, code, credits, attended, total, gradePoint] of specs) {
    const course = await Course.create({
      name,
      code,
      credits,
      teacher: teacher.id,
      students: [student.id],
    });
    courses.push(course);
    await Attendance.create({
      course: course.id,
      student: student.id,
      attended,
      total,
    });
    await Result.create({ course: course.id, student: student.id, gradePoint });
  }
  for (const [title, description, days, ci] of [
    [
      "Binary search tree implementation",
      "Implement insertion, deletion and traversal. Include time complexity analysis.",
      1,
      0,
    ],
    [
      "Database design case study",
      "Design a normalized schema for a library management system.",
      3,
      1,
    ],
    [
      "Network protocols report",
      "Compare TCP and UDP with real-world use cases.",
      5,
      2,
    ],
  ])
    await Assignment.create({
      title,
      description,
      dueAt: new Date(Date.now() + days * 864e5),
      course: courses[ci].id,
      createdBy: teacher.id,
    });
  for (const [title, body] of [
    [
      "Mid-semester assessment",
      "Review your course workspace for assessment preparation and upcoming deadlines.",
    ],
    [
      "Library learning hours",
      "Make time for focused study. Check with your campus library for current opening hours.",
    ],
    [
      "Project showcase",
      "Bring your semester ideas to life. Speak with your course teacher about project opportunities.",
    ],
  ])
    await Notice.create({ title, body, createdBy: teacher.id });
  for (const [ci, day, start, end, room, kind] of [
    [0, 1, "09:00", "10:00", "A-201", "Lecture"],
    [1, 1, "10:15", "11:15", "A-203", "Lecture"],
    [2, 2, "11:30", "12:30", "B-102", "Lecture"],
    [0, 3, "14:00", "16:00", "Lab-3", "Lab"],
    [3, 4, "09:00", "10:00", "A-204", "Tutorial"],
    [1, 5, "10:15", "12:15", "Lab-2", "Lab"],
  ])
    await ClassSession.create({
      course: courses[ci].id,
      day,
      start,
      end,
      room,
      kind,
    });
  for (const [ci, days, room, seating] of [
    [0, 12, "Exam Hall A", "Row B · Seat 12"],
    [1, 14, "Exam Hall A", "Row C · Seat 08"],
    [2, 16, "Exam Hall B", "Row A · Seat 21"],
    [3, 18, "Exam Hall B", "Row D · Seat 03"],
  ]) {
    const dt = new Date(Date.now() + days * 864e5);
    dt.setUTCHours(3, 30, 0, 0);
    await Exam.create({
      course: courses[ci].id,
      title: "Mid-semester assessment",
      startsAt: dt,
      durationMinutes: 120,
      room,
      seating,
    });
  }
  const book = await Book.create({
    title: "Introduction to Algorithms",
    author: "Cormen et al.",
    code: "DEMO-CS-001",
    copies: 4,
  });
  await Book.create({
    title: "Database System Concepts",
    author: "Silberschatz et al.",
    code: "DEMO-CS-002",
    copies: 3,
  });
  await Book.create({
    title: "Computer Networking: A Top-Down Approach",
    author: "Kurose & Ross",
    code: "DEMO-CS-003",
    copies: 2,
  });
  await Loan.create({
    book: book.id,
    student: student.id,
    issuedAt: new Date(Date.now() - 12 * 864e5),
    dueAt: new Date(Date.now() + 2 * 864e5),
  });
  await Club.insertMany([
    {
      name: "Demo Coding Club",
      description: "Fictional peer coding sessions and project discussions.",
    },
    { name: "Demo Sports Club", description: "Fictional campus sports group." },
    {
      name: "Demo Arts Club",
      description: "Fictional creative workshops and exhibitions.",
    },
  ]);
  for (const c of await Course.find()) {
    await LearningResource.create({
      kind: "Paper",
      course: c._id,
      title: c.name + " - demo previous-year practice",
      session: "2025-26",
      semester: "Semester 5",
      content:
        "FICTIONAL PRACTICE QUESTIONS, not a retrieved past university paper.\n1. Explain one core concept from " +
        c.name +
        ".\n2. Give a worked example and discuss its limits.\n3. Compare two approaches used in this subject.",
    });
    await LearningResource.create({
      kind: "Syllabus",
      course: c._id,
      title: c.name + " - demo syllabus",
      session: "2026-27",
      semester: "Semester 5",
      content:
        "Fictional outline for demonstration.\nUnit 1: Foundations.\nUnit 2: Core techniques.\nUnit 3: Practical examples.\nUnit 4: Project and revision.\nThis is not an official curriculum.",
    });
  }
  await Fee.create({
    student: student.id,
    title: "Tuition fee",
    semester: "Semester 5",
    amountPaise: 6500000,
    dueAt: new Date(Date.now() + 7 * 864e5),
    createdBy: admin.id,
    payments: [
      {
        amountPaise: 4000000,
        paidAt: new Date(Date.now() - 10 * 864e5),
        reference: "Fictional demo bank entry",
        receiptNumber: "DEMO-TUITION-001",
        recordedBy: admin.id,
      },
    ],
  });
  await Fee.create({
    student: student.id,
    title: "Examination fee",
    semester: "Semester 5",
    amountPaise: 250000,
    dueAt: new Date(Date.now() - 2 * 864e5),
    createdBy: admin.id,
    payments: [],
  });
  await Fee.create({
    student: student.id,
    title: "Library fee",
    semester: "Semester 5",
    amountPaise: 100000,
    dueAt: new Date(Date.now() - 15 * 864e5),
    createdBy: admin.id,
    payments: [
      {
        amountPaise: 100000,
        paidAt: new Date(Date.now() - 16 * 864e5),
        reference: "Fictional demo entry",
        receiptNumber: "DEMO-LIBRARY-001",
        recordedBy: admin.id,
      },
    ],
  });
  console.log(
    "Demo seed ready: student@smarterp.demo / teacher@smarterp.demo; password SmartERPdemo123!",
  );
}
if (process.argv[1]?.endsWith("/seed.js")) {
  if (!process.env.MONGODB_URI) throw Error("Set MONGODB_URI");
  await mongoose.connect(process.env.MONGODB_URI);
  await seed();
  await mongoose.disconnect();
}
