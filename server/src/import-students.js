import { z } from "zod";
import bcrypt from "bcryptjs";
// RFC-style quoted CSV, including escaped quotes and embedded newlines.
export function parseCSV(text) {
  if (typeof text !== "string" || Buffer.byteLength(text) > 80000)
    throw Error("CSV must be at most 80 KB");
  text = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [],
    field = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
      continue;
    }
    if (c === '"') {
      if (field || closed) throw Error("Unexpected quote in CSV");
      quoted = true;
      continue;
    }
    if (c === "," || c === "\n" || c === "\r") {
      row.push(field.trim());
      field = "";
      closed = false;
      if (c !== ",") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
      continue;
    }
    if (closed && c !== " " && c !== "\t")
      throw Error("Unexpected text after closing quote");
    if (!closed) field += c;
  }
  if (quoted) throw Error("Unclosed quoted field");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2)
    throw Error("CSV needs a header and at least one student");
  if (rows.length > 201) throw Error("Import at most 200 students per batch");
  const headers = rows.shift().map((h) => h.toLowerCase());
  const allowed = [
    "name",
    "rollnumber",
    "email",
    "department",
    "semester",
    "section",
  ];
  if (
    new Set(headers).size !== headers.length ||
    headers.some((h) => !allowed.includes(h)) ||
    !["name", "rollnumber", "email"].every((h) => headers.includes(h))
  )
    throw Error(
      "Use the template headers: name,rollNumber,email,department,semester,section",
    );
  return rows.map((cells, i) => ({
    row: i + 2,
    cells,
    data: Object.fromEntries(headers.map((h, j) => [h, cells[j] || ""])),
    columnError: cells.length !== headers.length,
  }));
}
const studentSchema = z.object({
  name: z.string().min(2).max(80),
  email: z
    .string()
    .email()
    .max(160)
    .transform((v) => v.toLowerCase()),
  rollNumber: z.string().min(1).max(40),
  department: z.string().max(80),
  semester: z.number().int().min(1).max(12).optional(),
  section: z.string().max(20),
});
export async function validateRows(parsed, User) {
  const emails = new Set(),
    rolls = new Set();
  const rows = [];
  const existing = await User.find({
    $or: [
      { email: { $in: parsed.map((r) => r.data.email.toLowerCase()) } },
      {
        role: "student",
        rollNumber: { $in: parsed.map((r) => r.data.rollnumber) },
      },
    ],
  }).select("email rollNumber");
  const existingEmails = new Set(existing.map((u) => u.email)),
    existingRolls = new Set(existing.map((u) => u.rollNumber));
  for (const r of parsed) {
    const raw = r.data;
    const result = studentSchema.safeParse({
      name: raw.name,
      email: raw.email,
      rollNumber: raw.rollnumber,
      department: raw.department || "",
      semester: raw.semester ? Number(raw.semester) : undefined,
      section: raw.section || "",
    });
    const errors = [];
    if (r.columnError) errors.push("Wrong number of columns");
    if (!result.success)
      errors.push(
        ...result.error.issues.map((i) => i.path.join(".") + ": " + i.message),
      );
    const email = (raw.email || "").toLowerCase(),
      roll = raw.rollnumber;
    if (emails.has(email)) errors.push("Duplicate email in CSV");
    if (rolls.has(roll)) errors.push("Duplicate roll in CSV");
    if (existingEmails.has(email)) errors.push("Email already exists");
    if (existingRolls.has(roll)) errors.push("Roll already exists");
    emails.add(email);
    rolls.add(roll);
    rows.push({
      row: r.row,
      data: result.success
        ? result.data
        : { name: raw.name, email, rollNumber: roll },
      errors,
    });
  }
  return rows;
}
export function installStudentImport(
  app,
  { auth, admin, wrap, fail, models, demoPublic },
) {
  const { User, ImportPreview, AuditLog } = models;
  app.get("/api/admin/import/template", auth, admin, (_req, res) =>
    res
      .type("text/csv")
      .attachment("students-template.csv")
      .send(
        "name,rollNumber,email,department,semester,section\nDemo Student,DEMO-001,student001@college.demo,Computing,3,A\n",
      ),
  );
  app.post(
    "/api/admin/import/preview",
    auth,
    admin,
    wrap(async (req, res) => {
      const { csv } = z.object({ csv: z.string().max(80000) }).parse(req.body);
      let parsed;
      try {
        parsed = parseCSV(csv);
      } catch (e) {
        fail(400, e.message);
      }
      const rows = await validateRows(parsed, User);
      if (demoPublic)
        for (const r of rows)
          if (
            !r.data.email?.endsWith(".demo") &&
            !r.data.email?.endsWith("@example.invalid")
          )
            r.errors.push(
              "Public demo accepts fictional .demo or example.invalid emails only",
            );
      const preview = await ImportPreview.create({
        actor: req.user.id,
        parsed,
        expiresAt: new Date(Date.now() + 15 * 60000),
      });
      res.json({
        previewId: preview.id,
        rows,
        valid: rows.filter((r) => !r.errors.length).length,
        invalid: rows.filter((r) => r.errors.length).length,
        expiresAt: preview.expiresAt,
      });
    }),
  );
  app.post(
    "/api/admin/import/commit",
    auth,
    admin,
    wrap(async (req, res) => {
      const b = z
        .object({
          previewId: z.string().regex(/^[a-f\d]{24}$/i),
          initialPassword: z.string().min(12).max(128),
        })
        .parse(req.body);
      const p = await ImportPreview.findOne({
        _id: b.previewId,
        actor: req.user.id,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      });
      if (!p) fail(409, "Preview is used or expired. Preview the CSV again.");
      const rows = await validateRows(p.parsed, User);
      if (demoPublic)
        for (const r of rows)
          if (
            !r.data.email?.endsWith(".demo") &&
            !r.data.email?.endsWith("@example.invalid")
          )
            r.errors.push("Use fictional demo emails only");
      if (rows.some((r) => r.errors.length))
        return res
          .status(409)
          .json({
            message:
              "Fix every row before importing. No students were imported.",
            rows,
          });
      const hash = await bcrypt.hash(b.initialPassword, 12);
      if (
        !(await ImportPreview.findOneAndUpdate(
          { _id: p.id, usedAt: null },
          { $set: { usedAt: new Date() } },
        ))
      )
        fail(409, "Preview already committed");
      const outcomes = [];
      for (const r of rows) {
        try {
          // Recheck duplicate roll at write time. Imported records never replace existing accounts.
          if (
            await User.exists({
              role: "student",
              rollNumber: r.data.rollNumber,
            })
          )
            throw Error("Roll already exists");
          const u = await User.create({
            ...r.data,
            role: "student",
            passwordHash: hash,
          });
          outcomes.push({
            row: r.row,
            email: r.data.email,
            id: u.id,
            status: "created",
          });
        } catch (e) {
          outcomes.push({
            row: r.row,
            email: r.data.email,
            status: "failed",
            error:
              e.code === 11000
                ? "Email already exists"
                : e.message === "Roll already exists"
                  ? e.message
                  : "Unable to create this row",
          });
        }
      }
      const created = outcomes.filter((r) => r.status === "created").length;
      await AuditLog.create({
        actor: req.user.id,
        action: `Imported ${created} students`,
        target: p.id,
      });
      res.json({ created, failed: outcomes.length - created, rows: outcomes });
    }),
  );
}
