import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  User,
  Course,
  Assignment,
  Submission,
  Attendance,
  Result,
  Notice,
  Fee,
  ClassSession,
  Exam,
  Book,
  Loan,
} from "./models.js";
import { attendanceAdvice, cgpa } from "./math.js";
export function createApp({
  jwtSecret,
  clientOrigin = "http://localhost:5173",
  teacherCode,
  uploadDir = path.resolve("uploads"),
  production = false,
  demoPublic = false,
}) {
  if (!jwtSecret || jwtSecret.length < 32)
    throw new Error("JWT_SECRET must be at least 32 characters");
  const app = express();
  if (production) app.set("trust proxy", 1);
  if (demoPublic)
    app.use("/api/auth/register", (_req, res) =>
      res.status(403).json({
        message:
          "Registration is disabled in this public fictional-data demo. Use the demo accounts.",
      }),
    );
  app.use(helmet());
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== clientOrigin
    )
      return res.status(403).json({ message: "Origin not allowed" });
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 150,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
  const wrap = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
  const fail = (status, message) => {
    const e = new Error(message);
    e.status = status;
    throw e;
  };
  const cookie = {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    maxAge: 8 * 3600000,
    path: "/",
  };
  const publicUser = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    rollNumber: u.rollNumber,
  });
  const loginResponse = (res, u) => {
    res.cookie(
      "session",
      jwt.sign({ sub: u.id }, jwtSecret, { expiresIn: "8h" }),
      cookie,
    );
    res.json({ user: publicUser(u) });
  };
  const auth = wrap(async (req, res, next) => {
    try {
      const data = jwt.verify(req.cookies.session || "", jwtSecret);
      req.user = await User.findById(data.sub);
      if (!req.user) throw Error();
    } catch {
      fail(401, "Please sign in");
    }
    next();
  });
  const teacher = (req, res, next) => {
    if (req.user.role !== "teacher")
      return res.status(403).json({ message: "Teacher access required" });
    next();
  };
  const courseAccess = async (req, id) => {
    if (!/^[a-f\d]{24}$/i.test(id || "")) fail(404, "Course not found");
    const c = await Course.findById(id);
    if (!c) fail(404, "Course not found");
    const allowed =
      req.user.role === "teacher"
        ? String(c.teacher) === req.user.id
        : c.students.some((s) => String(s) === req.user.id);
    if (!allowed) fail(403, "You do not have access to this course");
    return c;
  };
  const assignmentAccess = async (req, id) => {
    if (!/^[a-f\d]{24}$/i.test(id || "")) fail(404, "Assignment not found");
    const a = await Assignment.findById(id);
    if (!a) fail(404, "Assignment not found");
    await courseAccess(req, String(a.course));
    return a;
  };
  const remove = async (key) => {
    if (key) await fs.unlink(path.join(uploadDir, key)).catch(() => {});
  };
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) =>
        fs
          .mkdir(uploadDir, { recursive: true })
          .then(() => cb(null, uploadDir), cb),
      filename: (_req, file, cb) =>
        cb(null, randomUUID() + path.extname(file.originalname).toLowerCase()),
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (![".pdf", ".txt", ".docx"].includes(ext))
        return cb(new Error("Only PDF, TXT and DOCX files are allowed"));
      cb(null, true);
    },
  });
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.post(
    "/api/auth/register",
    authLimit,
    wrap(async (req, res) => {
      const b = z
        .object({
          name: z.string().trim().min(2).max(80),
          email: z
            .string()
            .email()
            .max(160)
            .transform((v) => v.toLowerCase()),
          password: z.string().min(10).max(128),
          role: z.enum(["student", "teacher"]).default("student"),
          teacherCode: z.string().optional(),
          rollNumber: z.string().max(40).optional(),
        })
        .parse(req.body);
      if (
        b.role === "teacher" &&
        (!teacherCode || b.teacherCode !== teacherCode)
      )
        fail(403, "Valid teacher invite code required");
      const u = await User.create({
        ...b,
        passwordHash: await bcrypt.hash(b.password, 12),
      });
      loginResponse(res, u);
    }),
  );
  app.post(
    "/api/auth/login",
    authLimit,
    wrap(async (req, res) => {
      const b = z
        .object({
          email: z
            .string()
            .email()
            .transform((v) => v.toLowerCase()),
          password: z.string().min(1).max(128),
        })
        .parse(req.body);
      const u = await User.findOne({ email: b.email }).select("+passwordHash");
      if (!u || !(await bcrypt.compare(b.password, u.passwordHash)))
        fail(401, "Email or password is incorrect");
      loginResponse(res, u);
    }),
  );
  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie("session", {
      path: "/",
      httpOnly: true,
      secure: production,
      sameSite: "lax",
    });
    res.json({ ok: true });
  });
  app.get("/api/auth/me", auth, (req, res) =>
    res.json({ user: publicUser(req.user) }),
  );
  app.get(
    "/api/courses",
    auth,
    wrap(async (req, res) => {
      const courses = await Course.find(
        req.user.role === "teacher"
          ? { teacher: req.user.id }
          : { students: req.user.id },
      ).populate("teacher", "name");
      res.json(courses);
    }),
  );
  app.post(
    "/api/courses",
    auth,
    teacher,
    wrap(async (req, res) => {
      const b = z
        .object({
          name: z.string().trim().min(2).max(100),
          code: z.string().trim().min(2).max(20),
          credits: z.number().int().min(1).max(10),
        })
        .parse(req.body);
      res
        .status(201)
        .json(
          await Course.create({ ...b, teacher: req.user.id, students: [] }),
        );
    }),
  );
  app.post(
    "/api/courses/:id/enroll",
    auth,
    teacher,
    wrap(async (req, res) => {
      const c = await courseAccess(req, req.params.id);
      const b = z
        .object({
          email: z
            .string()
            .email()
            .transform((v) => v.toLowerCase()),
        })
        .parse(req.body);
      const u = await User.findOne({ email: b.email, role: "student" });
      if (!u) fail(404, "Student email not found");
      await Course.updateOne({ _id: c.id }, { $addToSet: { students: u.id } });
      res.json({ ok: true });
    }),
  );
  app.get(
    "/api/courses/:id/students",
    auth,
    teacher,
    wrap(async (req, res) => {
      const c = await courseAccess(req, req.params.id);
      res.json(
        await User.find({ _id: { $in: c.students } }).select(
          "name email rollNumber",
        ),
      );
    }),
  );
  app.get(
    "/api/assignments",
    auth,
    wrap(async (req, res) => {
      const cs = await Course.find(
        req.user.role === "teacher"
          ? { teacher: req.user.id }
          : { students: req.user.id },
      );
      const as = await Assignment.find({ course: { $in: cs.map((c) => c.id) } })
        .populate("course", "name code")
        .sort({ dueAt: 1 })
        .lean();
      const subs = await Submission.find(
        req.user.role === "student"
          ? { student: req.user.id, assignment: { $in: as.map((a) => a._id) } }
          : { assignment: { $in: as.map((a) => a._id) } },
      ).lean();
      res.json(
        as.map((a) => ({
          ...a,
          submission:
            req.user.role === "student"
              ? subs.find((s) => String(s.assignment) === String(a._id)) || null
              : undefined,
          submissionCount: subs.filter(
            (s) => String(s.assignment) === String(a._id),
          ).length,
        })),
      );
    }),
  );
  app.post(
    "/api/assignments",
    auth,
    teacher,
    wrap(async (req, res, next) => {
      await courseAccess(req, req.query.course);
      next();
    }),
    upload.single("file"),
    wrap(async (req, res) => {
      try {
        const b = z
          .object({
            title: z.string().trim().min(3).max(150),
            description: z.string().max(5000).default(""),
            dueAt: z.string().datetime({ offset: true }),
          })
          .parse(req.body);
        if (new Date(b.dueAt) <= new Date())
          fail(400, "Choose a future deadline");
        res.status(201).json(
          await Assignment.create({
            ...b,
            course: req.query.course,
            createdBy: req.user.id,
            attachment: req.file
              ? { key: req.file.filename, name: req.file.originalname }
              : undefined,
          }),
        );
      } catch (e) {
        await remove(req.file?.filename);
        throw e;
      }
    }),
  );
  app.post(
    "/api/assignments/:id/submit",
    auth,
    wrap(async (req, res, next) => {
      if (req.user.role !== "student") fail(403, "Student access required");
      req.assignment = await assignmentAccess(req, req.params.id);
      if (new Date() > req.assignment.dueAt)
        fail(400, "The deadline has passed");
      next();
    }),
    upload.single("file"),
    wrap(async (req, res) => {
      if (!req.file) fail(400, "Please attach a file");
      try {
        const old = await Submission.findOne({
          assignment: req.params.id,
          student: req.user.id,
        });
        const sub = await Submission.findOneAndUpdate(
          { assignment: req.params.id, student: req.user.id },
          {
            $set: {
              file: { key: req.file.filename, name: req.file.originalname },
              submittedAt: new Date(),
            },
            $unset: { grade: 1, feedback: 1 },
          },
          { upsert: true, returnDocument: "after", runValidators: true },
        );
        await remove(old?.file?.key);
        res.json(sub);
      } catch (e) {
        await remove(req.file.filename);
        throw e;
      }
    }),
  );
  app.get(
    "/api/assignments/:id/submissions",
    auth,
    teacher,
    wrap(async (req, res) => {
      await assignmentAccess(req, req.params.id);
      res.json(
        await Submission.find({ assignment: req.params.id }).populate(
          "student",
          "name email rollNumber",
        ),
      );
    }),
  );
  app.put(
    "/api/submissions/:id/grade",
    auth,
    teacher,
    wrap(async (req, res) => {
      const s = await Submission.findById(req.params.id);
      if (!s) fail(404, "Submission not found");
      await assignmentAccess(req, String(s.assignment));
      const b = z
        .object({
          grade: z.number().min(0).max(100),
          feedback: z.string().max(2000).default(""),
        })
        .parse(req.body);
      Object.assign(s, b);
      await s.save();
      res.json(s);
    }),
  );
  app.get(
    "/api/assignments/:id/download",
    auth,
    wrap(async (req, res) => {
      const a = await assignmentAccess(req, req.params.id);
      if (!a.attachment?.key) fail(404, "No attachment");
      res.download(path.join(uploadDir, a.attachment.key), a.attachment.name);
    }),
  );
  app.get(
    "/api/submissions/:id/download",
    auth,
    wrap(async (req, res) => {
      const s = await Submission.findById(req.params.id);
      if (!s) fail(404, "Submission not found");
      await assignmentAccess(req, String(s.assignment));
      if (req.user.role === "student" && String(s.student) !== req.user.id)
        fail(403, "Access denied");
      res.download(path.join(uploadDir, s.file.key), s.file.name);
    }),
  );
  app.get(
    "/api/attendance",
    auth,
    wrap(async (req, res) => {
      if (req.user.role === "teacher") return res.json([]);
      const cs = await Course.find({ students: req.user.id });
      const rows = await Attendance.find({
        student: req.user.id,
        course: { $in: cs.map((c) => c.id) },
      })
        .populate("course", "name code")
        .lean();
      res.json(
        rows.map((r) => ({ ...r, ...attendanceAdvice(r.attended, r.total) })),
      );
    }),
  );
  app.put(
    "/api/courses/:id/attendance",
    auth,
    teacher,
    wrap(async (req, res) => {
      const c = await courseAccess(req, req.params.id);
      const b = z
        .object({
          student: z.string(),
          attended: z.number().int().min(0),
          total: z.number().int().min(0),
        })
        .parse(req.body);
      if (!c.students.some((s) => String(s) === b.student))
        fail(400, "Student is not enrolled");
      attendanceAdvice(b.attended, b.total);
      res.json(
        await Attendance.findOneAndUpdate(
          { course: c.id, student: b.student },
          b,
          { upsert: true, returnDocument: "after", runValidators: true },
        ),
      );
    }),
  );
  app.get(
    "/api/results",
    auth,
    wrap(async (req, res) => {
      const cs = await Course.find(
        req.user.role === "teacher"
          ? { teacher: req.user.id }
          : { students: req.user.id },
      );
      const rows = await Result.find({
        course: { $in: cs.map((c) => c.id) },
        ...(req.user.role === "student" ? { student: req.user.id } : {}),
      })
        .populate("course", "name code credits")
        .lean();
      res.json({
        rows,
        cgpa: cgpa(
          rows.map((r) => ({
            credits: r.course.credits,
            gradePoint: r.gradePoint,
          })),
        ),
      });
    }),
  );
  app.put(
    "/api/courses/:id/result",
    auth,
    teacher,
    wrap(async (req, res) => {
      const c = await courseAccess(req, req.params.id);
      const b = z
        .object({ student: z.string(), gradePoint: z.number().min(0).max(10) })
        .parse(req.body);
      if (!c.students.some((s) => String(s) === b.student))
        fail(400, "Student is not enrolled");
      res.json(
        await Result.findOneAndUpdate({ course: c.id, student: b.student }, b, {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
        }),
      );
    }),
  );
  app.get(
    "/api/notices",
    auth,
    wrap(async (_req, res) =>
      res.json(
        await Notice.find()
          .sort({ createdAt: -1 })
          .limit(30)
          .populate("createdBy", "name"),
      ),
    ),
  );
  app.post(
    "/api/notices",
    auth,
    teacher,
    wrap(async (req, res) => {
      const b = z
        .object({
          title: z.string().trim().min(3).max(120),
          body: z.string().trim().min(3).max(3000),
        })
        .parse(req.body);
      res
        .status(201)
        .json(await Notice.create({ ...b, createdBy: req.user.id }));
    }),
  );
  const admin = (req, res, next) => {
    if (req.user.role !== "admin")
      return res
        .status(403)
        .json({ message: "Accounts admin access required" });
    next();
  };
  const feeReader = (req, res, next) => {
    if (!["student", "admin"].includes(req.user.role))
      return res.status(403).json({
        message: "Fee records are restricted to the student and accounts admin",
      });
    next();
  };
  const feeScope = async (req) => {
    if (req.user.role === "student") return [req.user.id];
    if (req.user.role === "admin")
      return (await User.find({ role: "student" }).select("_id")).map(
        (u) => u.id,
      );
    return [];
  };
  const feeAccess = async (req, id) => {
    if (!/^[a-f\d]{24}$/i.test(id || "")) fail(404, "Fee record not found");
    const fee = await Fee.findById(id).populate(
      "student",
      "name rollNumber email",
    );
    if (!fee) fail(404, "Fee record not found");
    if (!(await feeScope(req)).includes(String(fee.student._id)))
      fail(403, "Fee access denied");
    return fee;
  };
  const feeBody = z.object({
    title: z.string().trim().min(1).max(100),
    semester: z.string().trim().min(1).max(80),
    amountPaise: z.number().int().positive().max(100000000),
    dueAt: z.string().datetime(),
  });
  app.get(
    "/api/fees",
    auth,
    feeReader,
    wrap(async (req, res) => {
      const ids = await feeScope(req);
      res.json({
        rows: await Fee.find({ student: { $in: ids } })
          .populate("student", "name rollNumber email")
          .sort({ dueAt: 1 }),
        students:
          req.user.role === "admin"
            ? await User.find({ _id: { $in: ids } }).select(
                "name rollNumber email",
              )
            : [],
      });
    }),
  );
  app.post(
    "/api/fees",
    auth,
    feeReader,
    admin,
    wrap(async (req, res) => {
      const body = feeBody
        .extend({ student: z.string().regex(/^[a-f\d]{24}$/i) })
        .parse(req.body);
      if (!(await feeScope(req)).includes(body.student))
        fail(403, "Student not found");
      res
        .status(201)
        .json(await Fee.create({ ...body, createdBy: req.user.id }));
    }),
  );
  app.patch(
    "/api/fees/:id",
    auth,
    admin,
    wrap(async (req, res) => {
      const fee = await feeAccess(req, req.params.id);
      const body = feeBody.parse(req.body);
      const paid = fee.payments.reduce((sum, p) => sum + p.amountPaise, 0);
      if (body.amountPaise < paid)
        fail(400, "Fee total cannot be below recorded payments");
      Object.assign(fee, body);
      await fee.save();
      res.json(fee);
    }),
  );
  app.post(
    "/api/fees/:id/payments",
    auth,
    admin,
    wrap(async (req, res) => {
      const fee = await feeAccess(req, req.params.id);
      const body = z
        .object({
          amountPaise: z.number().int().positive().max(100000000),
          paidAt: z.string().datetime(),
          reference: z.string().trim().min(1).max(100),
        })
        .parse(req.body);
      if (new Date(body.paidAt) > new Date())
        fail(400, "Payment date cannot be in the future");
      const payment = {
        ...body,
        receiptNumber: "DEMO-" + randomUUID().slice(0, 8).toUpperCase(),
        recordedBy: req.user.id,
      };
      const saved = await Fee.findOneAndUpdate(
        {
          _id: fee._id,
          $expr: {
            $gte: [
              {
                $subtract: ["$amountPaise", { $sum: "$payments.amountPaise" }],
              },
              body.amountPaise,
            ],
          },
        },
        { $push: { payments: payment } },
        { returnDocument: "after" },
      );
      if (!saved) fail(400, "Payment exceeds remaining balance");
      res.status(201).json(saved);
    }),
  );
  app.post(
    "/api/fees/:id/demo-checkout",
    auth,
    wrap(async (req, res) => {
      if (!demoPublic)
        fail(
          403,
          "Simulated checkout is only available in the public fictional demo",
        );
      if (req.user.role !== "student") fail(403, "Student demo checkout only");
      const fee = await feeAccess(req, req.params.id);
      const { expectedAmountPaise } = z
        .object({
          expectedAmountPaise: z.number().int().positive().max(100000000),
        })
        .strict()
        .parse(req.body);
      const payment = {
        amountPaise: expectedAmountPaise,
        paidAt: new Date(),
        reference: "Student simulated checkout - NO REAL MONEY",
        receiptNumber: "DEMO-" + randomUUID().slice(0, 8).toUpperCase(),
        recordedBy: req.user.id,
      };
      const saved = await Fee.findOneAndUpdate(
        {
          _id: fee._id,
          student: req.user.id,
          $expr: {
            $eq: [
              {
                $subtract: ["$amountPaise", { $sum: "$payments.amountPaise" }],
              },
              expectedAmountPaise,
            ],
          },
        },
        { $push: { payments: payment } },
        { returnDocument: "after" },
      );
      if (!saved)
        fail(409, "Balance changed or already paid. Refresh and review again.");
      res.status(201).json(saved);
    }),
  );
  app.get(
    "/api/fees/:id/receipts/:payment",
    auth,
    feeReader,
    wrap(async (req, res) => {
      const fee = await feeAccess(req, req.params.id);
      const payment = fee.payments.id(req.params.payment);
      if (!payment) fail(404, "Receipt not found");
      res
        .type("text/plain")
        .attachment(payment.receiptNumber + ".txt")
        .send(
          [
            "SMARTERP FICTIONAL DEMO RECEIPT",
            "NOT AN OFFICIAL UNIVERSITY RECEIPT. NO REAL PAYMENT WAS PROCESSED.",
            "Receipt: " + payment.receiptNumber,
            "Student: " +
              fee.student.name +
              " (" +
              (fee.student.rollNumber || "") +
              ")",
            "Fee: " + fee.title,
            "Semester: " + fee.semester,
            "Recorded amount: INR " + (payment.amountPaise / 100).toFixed(2),
            "Recorded date: " + payment.paidAt.toISOString(),
            "Reference: " + payment.reference,
          ].join("\n"),
        );
    }),
  );
  const academicIds = async (req) =>
    (
      await Course.find(
        req.user.role === "admin"
          ? {}
          : req.user.role === "teacher"
            ? { teacher: req.user.id }
            : { students: req.user.id },
      ).select("_id")
    ).map((c) => c.id);
  app.get(
    "/api/timetable",
    auth,
    wrap(async (req, res) =>
      res.json(
        await ClassSession.find({ course: { $in: await academicIds(req) } })
          .populate("course", "name code")
          .sort({ day: 1, start: 1 }),
      ),
    ),
  );
  app.get(
    "/api/exams",
    auth,
    wrap(async (req, res) =>
      res.json(
        await Exam.find({ course: { $in: await academicIds(req) } })
          .populate("course", "name code")
          .sort({ startsAt: 1 }),
      ),
    ),
  );
  const academicWrite = (req, res, next) => {
    if (!["teacher", "admin"].includes(req.user.role))
      return res
        .status(403)
        .json({ message: "Faculty or admin access required" });
    next();
  };
  const scheduleBody = z.object({
    course: z.string().regex(/^[a-f\d]{24}$/i),
    day: z.number().int().min(1).max(7),
    start: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    room: z.string().trim().min(1).max(50),
    kind: z.enum(["Lecture", "Lab", "Tutorial"]),
  });
  app.post(
    "/api/timetable",
    auth,
    academicWrite,
    wrap(async (req, res) => {
      const b = scheduleBody.parse(req.body);
      if (!(await academicIds(req)).includes(b.course))
        fail(403, "Course access denied");
      if (b.end <= b.start) fail(400, "Class must end after it starts");
      const conflict = await ClassSession.exists({
        day: b.day,
        start: { $lt: b.end },
        end: { $gt: b.start },
        $or: [{ room: b.room }, { course: b.course }],
      });
      if (conflict) fail(409, "Room or course overlaps another class");
      res.status(201).json(await ClassSession.create(b));
    }),
  );
  app.post(
    "/api/exams",
    auth,
    academicWrite,
    wrap(async (req, res) => {
      const b = z
        .object({
          course: z.string().regex(/^[a-f\d]{24}$/i),
          title: z.string().trim().min(2).max(100),
          startsAt: z.string().datetime(),
          durationMinutes: z.number().int().min(15).max(360),
          room: z.string().trim().min(1).max(50),
          seating: z.string().trim().min(1).max(100),
        })
        .parse(req.body);
      if (!(await academicIds(req)).includes(b.course))
        fail(403, "Course access denied");
      res.status(201).json(await Exam.create(b));
    }),
  );
  app.get(
    "/api/library",
    auth,
    wrap(async (req, res) => {
      const books = await Book.find().lean();
      const open = await Loan.find({ returnedAt: null }).lean();
      res.json({
        books: books.map((b) => ({
          ...b,
          available: Math.max(
            0,
            b.copies -
              open.filter((l) => String(l.book) === String(b._id)).length,
          ),
        })),
        loans: await Loan.find(
          req.user.role === "admin" ? {} : { student: req.user.id },
        )
          .populate("book")
          .populate("student", "name rollNumber")
          .sort({ dueAt: 1 }),
        students:
          req.user.role === "admin"
            ? await User.find({ role: "student" }).select("name rollNumber")
            : [],
      });
    }),
  );
  app.post(
    "/api/library/issue",
    auth,
    admin,
    wrap(async (req, res) => {
      const b = z
        .object({
          book: z.string().regex(/^[a-f\d]{24}$/i),
          student: z.string().regex(/^[a-f\d]{24}$/i),
          dueAt: z.string().datetime(),
        })
        .parse(req.body);
      const book = await Book.findById(b.book);
      if (!book) fail(404, "Book not found");
      if (!(await User.exists({ _id: b.student, role: "student" })))
        fail(404, "Student not found");
      if (new Date(b.dueAt) <= new Date())
        fail(400, "Return deadline must be in the future");
      if (
        (await Loan.countDocuments({ book: b.book, returnedAt: null })) >=
        book.copies
      )
        fail(409, "No copy available");
      if (
        await Loan.exists({
          book: b.book,
          student: b.student,
          returnedAt: null,
        })
      )
        fail(409, "Student already has this book");
      res.status(201).json(await Loan.create({ ...b, issuedAt: new Date() }));
    }),
  );
  app.post(
    "/api/library/:id/renew",
    auth,
    wrap(async (req, res) => {
      const loan = await Loan.findById(req.params.id);
      if (!loan) fail(404, "Loan not found");
      if (req.user.role !== "admin" && String(loan.student) !== req.user.id)
        fail(403, "Loan access denied");
      const updated = await Loan.findOneAndUpdate(
        {
          _id: loan.id,
          returnedAt: null,
          renewals: 0,
          dueAt: { $gte: new Date() },
        },
        {
          $inc: { renewals: 1 },
          $set: { dueAt: new Date(loan.dueAt.getTime() + 7 * 864e5) },
        },
        { returnDocument: "after" },
      );
      if (!updated)
        fail(400, "Only an active, non-overdue loan can be renewed once");
      res.json(updated);
    }),
  );
  app.post(
    "/api/library/:id/return",
    auth,
    admin,
    wrap(async (req, res) => {
      const loan = await Loan.findOneAndUpdate(
        { _id: req.params.id, returnedAt: null },
        { $set: { returnedAt: new Date(), returnedBy: req.user.id } },
        { returnDocument: "after" },
      );
      if (!loan) fail(400, "Active loan not found");
      res.json(loan);
    }),
  );
  app.post(
    "/api/assistant",
    auth,
    wrap(async (req, res) => {
      z.object({ message: z.string().min(1).max(1000) }).parse(req.body);
      const cs = await Course.find({ students: req.user.id });
      const as = await Assignment.find({ course: { $in: cs.map((c) => c.id) } })
        .populate("course", "name")
        .sort({ dueAt: 1 });
      const ss = await Submission.find({ student: req.user.id });
      const pending = as.filter(
        (a) => !ss.some((s) => String(s.assignment) === a.id),
      );
      res.json({
        mode: "rules",
        answer: pending.length
          ? `Aapke ${pending.length} assignments pending hain. ${pending.map((a) => `${a.title} (${a.course.name}) - ${a.dueAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}${a.dueAt < new Date() ? " [overdue]" : ""}`).join("; ")}.`
          : "Aapka koi assignment pending nahi hai. You are all caught up!",
        items: pending.map((a) => ({
          id: a.id,
          title: a.title,
          dueAt: a.dueAt,
        })),
      });
    }),
  );
  app.use((err, _req, res, _next) => {
    if (err.code === 11000)
      return res
        .status(409)
        .json({ message: "That email or record already exists" });
    const status =
      err.status ||
      (err instanceof z.ZodError ||
      err instanceof multer.MulterError ||
      err.name === "CastError" ||
      err.message === "Invalid attendance" ||
      err.message.startsWith("Only PDF")
        ? 400
        : 500);
    if (status === 500) console.error(err);
    res.status(status).json({
      message:
        status === 500
          ? "Something went wrong"
          : err instanceof z.ZodError
            ? err.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join(", ")
            : err.message,
    });
  });
  return app;
}
