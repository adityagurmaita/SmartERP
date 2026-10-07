import mongoose from "mongoose";
const { Schema, model } = mongoose;
export const User = model(
  "User",
  new Schema(
    {
      name: { type: String, required: true },
      email: { type: String, unique: true, required: true },
      passwordHash: { type: String, required: true, select: false },
      role: {
        type: String,
        enum: ["student", "teacher", "admin"],
        required: true,
      },
      rollNumber: String,
      department: String,
      semester: { type: Number, min: 1, max: 12 },
      section: String,
      active: { type: Boolean, default: true },
      privateProfile: { type: Schema.Types.Mixed, select: false },
    },
    { timestamps: true },
  ),
);
export const Course = model(
  "Course",
  new Schema(
    {
      name: String,
      code: String,
      credits: Number,
      department: String,
      teacher: { type: Schema.Types.ObjectId, ref: "User" },
      students: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true },
  ),
);
export const Assignment = model(
  "Assignment",
  new Schema(
    {
      title: String,
      description: String,
      course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
      dueAt: Date,
      attachment: { key: String, name: String },
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true },
  ),
);
export const Submission = model(
  "Submission",
  new Schema(
    {
      assignment: { type: Schema.Types.ObjectId, ref: "Assignment" },
      student: { type: Schema.Types.ObjectId, ref: "User" },
      file: { key: String, name: String },
      submittedAt: Date,
      grade: { type: Number, min: 0, max: 100 },
      feedback: String,
    },
    { timestamps: true },
  ),
);
Submission.schema.index({ assignment: 1, student: 1 }, { unique: true });
export const Attendance = model(
  "Attendance",
  new Schema({
    course: { type: Schema.Types.ObjectId, ref: "Course" },
    student: { type: Schema.Types.ObjectId, ref: "User" },
    attended: { type: Number, min: 0 },
    total: { type: Number, min: 0 },
  }),
);
Attendance.schema.index({ course: 1, student: 1 }, { unique: true });
export const Result = model(
  "Result",
  new Schema({
    course: { type: Schema.Types.ObjectId, ref: "Course" },
    student: { type: Schema.Types.ObjectId, ref: "User" },
    gradePoint: { type: Number, min: 0, max: 10 },
  }),
);
Result.schema.index({ course: 1, student: 1 }, { unique: true });
export const Notice = model(
  "Notice",
  new Schema(
    {
      title: String,
      body: String,
      course: { type: Schema.Types.ObjectId, ref: "Course" },
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true },
  ),
);
export const ImportPreview = model(
  "ImportPreview",
  new Schema(
    {
      actor: { type: Schema.Types.ObjectId, ref: "User" },
      parsed: Schema.Types.Mixed,
      expiresAt: { type: Date, index: { expires: 0 } },
      usedAt: Date,
    },
    { timestamps: true },
  ),
);
export const AuditLog = model(
  "AuditLog",
  new Schema(
    {
      actor: { type: Schema.Types.ObjectId, ref: "User" },
      action: String,
      target: String,
    },
    { timestamps: true },
  ),
);
export const Fee = model(
  "Fee",
  new Schema(
    {
      student: { type: Schema.Types.ObjectId, ref: "User", required: true },
      title: { type: String, required: true },
      semester: { type: String, required: true },
      amountPaise: { type: Number, required: true, min: 1 },
      dueAt: { type: Date, required: true },
      baseAmountPaise: Number,
      finePaise: { type: Number, default: 0, min: 0 },
      scholarshipPaise: { type: Number, default: 0, min: 0 },
      adjustmentNote: String,
      installments: [{ label: String, amountPaise: Number, dueAt: Date }],
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
      payments: [
        {
          amountPaise: { type: Number, min: 1 },
          paidAt: Date,
          reference: String,
          receiptNumber: String,
          recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
        },
      ],
    },
    { timestamps: true },
  ),
);
export const ClassSession = model(
  "ClassSession",
  new Schema(
    {
      course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
      day: { type: Number, min: 1, max: 7 },
      start: String,
      end: String,
      room: String,
      kind: String,
    },
    { timestamps: true },
  ),
);
export const Exam = model(
  "Exam",
  new Schema(
    {
      course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
      title: String,
      startsAt: Date,
      durationMinutes: Number,
      room: String,
      seating: String,
    },
    { timestamps: true },
  ),
);
export const Book = model(
  "Book",
  new Schema(
    {
      title: String,
      author: String,
      code: { type: String, unique: true },
      copies: { type: Number, min: 1 },
    },
    { timestamps: true },
  ),
);
export const Loan = model(
  "Loan",
  new Schema(
    {
      book: { type: Schema.Types.ObjectId, ref: "Book" },
      student: { type: Schema.Types.ObjectId, ref: "User" },
      issuedAt: Date,
      dueAt: Date,
      returnedAt: Date,
      renewals: { type: Number, default: 0 },
      returnedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true },
  ),
);
export const CampusRequest = model(
  "CampusRequest",
  new Schema(
    {
      student: { type: Schema.Types.ObjectId, ref: "User", required: true },
      kind: {
        type: String,
        enum: ["Applications", "Hostel", "Grievances", "Exam requests"],
        required: true,
      },
      category: String,
      subject: String,
      details: String,
      fromAt: Date,
      toAt: Date,
      destination: String,
      status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected", "In review", "Resolved"],
        default: "Pending",
      },
      reviewNote: String,
      reviewedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true },
  ),
);
export const LearningResource = model(
  "LearningResource",
  new Schema(
    {
      kind: { type: String, enum: ["Paper", "Syllabus"] },
      title: String,
      course: { type: Schema.Types.ObjectId, ref: "Course" },
      session: String,
      semester: String,
      content: String,
    },
    { timestamps: true },
  ),
);
export const Club = model(
  "Club",
  new Schema({ name: String, description: String }, { timestamps: true }),
);
export const ClubMember = model(
  "ClubMember",
  new Schema(
    {
      student: { type: Schema.Types.ObjectId, ref: "User" },
      club: { type: Schema.Types.ObjectId, ref: "Club" },
    },
    { timestamps: true },
  ).index({ student: 1, club: 1 }, { unique: true }),
);
export const Achievement = model(
  "Achievement",
  new Schema(
    {
      student: { type: Schema.Types.ObjectId, ref: "User" },
      title: String,
      details: String,
      achievedOn: Date,
    },
    { timestamps: true },
  ),
);

// Separate connection, identical schemas; no cross-tenant records.
export function modelsForConnection(connection) {
  return Object.fromEntries(
    mongoose
      .modelNames()
      .map((name) => [
        name,
        connection.model(name, mongoose.model(name).schema),
      ]),
  );
}
