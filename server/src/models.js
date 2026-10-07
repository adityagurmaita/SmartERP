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
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
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
        enum: ["Applications", "Hostel", "Grievances"],
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
