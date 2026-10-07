import bcrypt from "bcryptjs";
import { z } from "zod";
export function installAdmin(app, { auth, admin, wrap, fail, models }) {
  const { User, Course, Notice, AuditLog } = models;
  const objectId = z.string().regex(/^[a-f\d]{24}$/i);
  const person = z.object({
    name: z.string().trim().min(2).max(80),
    email: z
      .string()
      .email()
      .max(160)
      .transform((v) => v.toLowerCase()),
    role: z.enum(["student", "teacher"]),
    rollNumber: z.string().trim().max(40).optional(),
    department: z.string().trim().max(80).default(""),
    semester: z.number().int().min(1).max(12).optional(),
    section: z.string().trim().max(20).default(""),
  });
  const log = (req, action, target) =>
    AuditLog.create({ actor: req.user.id, action, target });
  const safe =
    "name email role rollNumber department semester section active createdAt";
  app.use("/api/admin", auth, admin);
  app.get(
    "/api/admin/overview",
    wrap(async (_req, res) => {
      const [students, faculty, subjects, notices, inactive, activity] =
        await Promise.all([
          User.countDocuments({ role: "student" }),
          User.countDocuments({ role: "teacher" }),
          Course.countDocuments(),
          Notice.countDocuments(),
          User.countDocuments({ active: false }),
          AuditLog.find()
            .sort({ createdAt: -1 })
            .limit(12)
            .populate("actor", "name")
            .lean(),
        ]);
      res.json({ students, faculty, subjects, notices, inactive, activity });
    }),
  );
  app.get(
    "/api/admin/users",
    wrap(async (_req, res) =>
      res.json(
        await User.find({ role: { $in: ["student", "teacher"] } })
          .select(safe)
          .sort({ name: 1 })
          .limit(2000),
      ),
    ),
  );
  app.post(
    "/api/admin/users",
    wrap(async (req, res) => {
      const b = person
        .extend({ password: z.string().min(12).max(128) })
        .parse(req.body);
      if (
        b.role === "student" &&
        b.rollNumber &&
        (await User.exists({ role: "student", rollNumber: b.rollNumber }))
      )
        fail(409, "Roll number already exists");
      const { password, ...fields } = b;
      const user = await User.create({
        ...fields,
        passwordHash: await bcrypt.hash(password, 12),
      });
      await log(req, "Created " + b.role, user.id);
      res.status(201).json(await User.findById(user.id).select(safe));
    }),
  );
  app.patch(
    "/api/admin/users/:id",
    wrap(async (req, res) => {
      const id = objectId.parse(req.params.id);
      const user = await User.findOne({
        _id: id,
        role: { $in: ["student", "teacher"] },
      });
      if (!user) fail(404, "Student or faculty account not found");
      const b = person
        .omit({ role: true })
        .partial()
        .extend({ active: z.boolean().optional() })
        .strict()
        .parse(req.body);
      if (
        b.rollNumber &&
        user.role === "student" &&
        (await User.exists({
          _id: { $ne: id },
          role: "student",
          rollNumber: b.rollNumber,
        }))
      )
        fail(409, "Roll number already exists");
      Object.assign(user, b);
      await user.save();
      await log(req, "Updated " + user.role, id);
      res.json(await User.findById(id).select(safe));
    }),
  );
  app.get(
    "/api/admin/courses",
    wrap(async (_req, res) =>
      res.json(
        await Course.find()
          .populate("teacher", "name email")
          .populate("students", "name rollNumber")
          .sort({ code: 1 }),
      ),
    ),
  );
  const courseBody = z.object({
    name: z.string().trim().min(2).max(100),
    code: z.string().trim().min(2).max(20),
    credits: z.number().int().min(1).max(10),
    teacher: objectId,
    students: z.array(objectId).max(2000),
    department: z.string().trim().max(80).default(""),
  });
  async function validateCourse(b, id) {
    if (
      !(await User.exists({
        _id: b.teacher,
        role: "teacher",
        active: { $ne: false },
      }))
    )
      fail(400, "Choose an active faculty account");
    b.students = [...new Set(b.students)];
    if (
      (await User.countDocuments({
        _id: { $in: b.students },
        role: "student",
        active: { $ne: false },
      })) !== b.students.length
    )
      fail(400, "Choose active student accounts only");
    if (
      await Course.exists({ code: b.code, ...(id ? { _id: { $ne: id } } : {}) })
    )
      fail(409, "Subject code already exists");
  }
  app.post(
    "/api/admin/courses",
    wrap(async (req, res) => {
      const b = courseBody.parse(req.body);
      await validateCourse(b);
      const c = await Course.create(b);
      await log(req, "Created subject", c.id);
      res.status(201).json(c);
    }),
  );
  app.put(
    "/api/admin/courses/:id",
    wrap(async (req, res) => {
      const id = objectId.parse(req.params.id);
      const b = courseBody.parse(req.body);
      await validateCourse(b, id);
      const c = await Course.findByIdAndUpdate(
        id,
        { $set: b },
        { returnDocument: "after" },
      );
      if (!c) fail(404, "Subject not found");
      await log(req, "Updated subject", id);
      res.json(c);
    }),
  );
  app.post(
    "/api/admin/notices",
    wrap(async (req, res) => {
      const b = z
        .object({
          title: z.string().trim().min(3).max(120),
          body: z.string().trim().min(3).max(3000),
        })
        .parse(req.body);
      const n = await Notice.create({ ...b, createdBy: req.user.id });
      await log(req, "Published campus notice", n.id);
      res.status(201).json(n);
    }),
  );
  app.delete(
    "/api/admin/notices/:id",
    wrap(async (req, res) => {
      const id = objectId.parse(req.params.id);
      if (!(await Notice.findByIdAndDelete(id))) fail(404, "Notice not found");
      await log(req, "Removed notice", id);
      res.json({ ok: true });
    }),
  );
}
export async function bootstrapAdmin(models, env = process.env) {
  if (!env.ADMIN_EMAIL && !env.ADMIN_PASSWORD && !env.ADMIN_NAME) return;
  const email = z.string().email().parse(env.ADMIN_EMAIL).toLowerCase();
  const password = z.string().min(12).max(128).parse(env.ADMIN_PASSWORD);
  const existing = await models.User.findOne({ email });
  if (existing) {
    if (existing.role !== "admin")
      throw Error("Admin email belongs to a non-admin account");
    return;
  }
  await models.User.create({
    name: env.ADMIN_NAME || "College administrator",
    email,
    role: "admin",
    passwordHash: await bcrypt.hash(password, 12),
  });
}
