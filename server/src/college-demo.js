// Additive fictional college cohort, used ONLY by the disposable public demo.
import bcrypt from "bcryptjs";
export async function seedCollege(models) {
  const { User, Course, Attendance, Result, Notice } = models;
  if (await User.exists({ email: "student02@college.demo" })) return;
  const passwordHash = await bcrypt.hash("SmartERPdemo123!", 12);
  const faculty = await User.create([
    {
      name: "Dr. Kabir Rao",
      email: "faculty02@college.demo",
      role: "teacher",
      department: "Computing",
      passwordHash,
    },
    {
      name: "Prof. Nisha Verma",
      email: "faculty03@college.demo",
      role: "teacher",
      department: "Mathematics",
      passwordHash,
    },
  ]);
  const names = [
    "Diya Kapoor",
    "Ishaan Mehta",
    "Ananya Joshi",
    "Vihaan Gupta",
    "Sana Ali",
    "Arjun Nair",
    "Riya Das",
    "Dev Malhotra",
    "Kavya Shah",
    "Aryan Bose",
    "Neha Patel",
    "Rehan Khan",
  ];
  const students = await User.create(
    names.map((name, i) => ({
      name,
      email: `student${String(i + 2).padStart(2, "0")}@college.demo`,
      rollNumber: `DEMO-CS-${String(i + 2).padStart(3, "0")}`,
      role: "student",
      department: "Computing",
      semester: 3,
      section: "A",
      passwordHash,
    })),
  );
  // Preserve the original student demo's subject allocations and records.
  const cs = await Course.create({
    name: "Software Engineering",
    code: "DEMO-CS301",
    credits: 4,
    department: "Computing",
    teacher: faculty[0].id,
    students: students.map((s) => s.id),
  });
  const math = await Course.create({
    name: "Discrete Mathematics",
    code: "DEMO-MA301",
    credits: 3,
    department: "Mathematics",
    teacher: faculty[1].id,
    students: students.map((s) => s.id),
  });
  for (const c of [cs, math])
    for (let i = 0; i < students.length; i++) {
      await Attendance.create({
        course: c.id,
        student: students[i].id,
        attended: 25 + (i % 11),
        total: 40,
      });
      await Result.create({
        course: c.id,
        student: students[i].id,
        gradePoint: 6 + (i % 5),
      });
    }
  await Notice.create({
    title: "Fictional college pilot",
    body: "This cohort demonstrates college operations with invented students and faculty. No real college data or affiliation is claimed.",
    createdBy: (await User.findOne({ role: "admin" })).id,
  });
}
