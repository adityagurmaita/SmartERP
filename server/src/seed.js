import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  User,
  Course,
  Assignment,
  Attendance,
  Result,
  Notice,
  Fee,
} from "./models.js";
export async function seed() {
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
  await Fee.create({
    student: student.id,
    title: "Tuition fee",
    semester: "Semester 5",
    amountPaise: 6500000,
    dueAt: new Date(Date.now() + 7 * 864e5),
    createdBy: teacher.id,
    payments: [
      {
        amountPaise: 4000000,
        paidAt: new Date(Date.now() - 10 * 864e5),
        reference: "Fictional demo bank entry",
        receiptNumber: "DEMO-TUITION-001",
        recordedBy: teacher.id,
      },
    ],
  });
  await Fee.create({
    student: student.id,
    title: "Examination fee",
    semester: "Semester 5",
    amountPaise: 250000,
    dueAt: new Date(Date.now() - 2 * 864e5),
    createdBy: teacher.id,
    payments: [],
  });
  await Fee.create({
    student: student.id,
    title: "Library fee",
    semester: "Semester 5",
    amountPaise: 100000,
    dueAt: new Date(Date.now() - 15 * 864e5),
    createdBy: teacher.id,
    payments: [
      {
        amountPaise: 100000,
        paidAt: new Date(Date.now() - 16 * 864e5),
        reference: "Fictional demo entry",
        receiptNumber: "DEMO-LIBRARY-001",
        recordedBy: teacher.id,
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
