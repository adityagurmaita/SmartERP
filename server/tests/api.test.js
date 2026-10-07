import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import fs from "node:fs/promises";
import { createApp } from "../src/app.js";
import { Assignment, User } from "../src/models.js";
test("auth, permissions, enrollment, assignment upload, submission, grade and assistant", async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const uploadDir = await fs.mkdtemp("/tmp/smarterp-test-");
  try {
    const app = createApp({
      jwtSecret: "test-secret-with-more-than-32-characters",
      teacherCode: "private-test-code",
      uploadDir,
    });
    const teacher = request.agent(app),
      student = request.agent(app),
      other = request.agent(app);
    await request(app).get("/api/courses").expect(401);
    await other
      .post("/api/auth/register")
      .send({
        name: "Bad Teacher",
        email: "bad@test.edu",
        password: "securePassword123",
        role: "teacher",
      })
      .expect(403);
    await teacher
      .post("/api/auth/register")
      .send({
        name: "Test Teacher",
        email: "teacher@test.edu",
        password: "securePassword123",
        role: "teacher",
        teacherCode: "private-test-code",
      })
      .expect(200);
    await student
      .post("/api/auth/register")
      .send({
        name: "Test Student",
        email: "student@test.edu",
        password: "securePassword123",
      })
      .expect(200);
    await other
      .post("/api/auth/register")
      .send({
        name: "Other Student",
        email: "other@test.edu",
        password: "securePassword123",
      })
      .expect(200);
    await student
      .post("/api/courses")
      .send({ name: "Not allowed", code: "X", credits: 4 })
      .expect(403);
    const c = (
      await teacher
        .post("/api/courses")
        .send({ name: "Database Systems", code: "CS202", credits: 4 })
        .expect(201)
    ).body;
    await teacher
      .post(`/api/courses/${c._id}/enroll`)
      .send({ email: "student@test.edu" })
      .expect(200);
    const a = (
      await teacher
        .post(`/api/assignments?course=${c._id}`)
        .field("title", "Library schema")
        .field("dueAt", new Date(Date.now() + 864e5).toISOString())
        .attach("file", Buffer.from("Assignment brief"), "brief.txt")
        .expect(201)
    ).body;
    await other.get(`/api/assignments/${a._id}/download`).expect(403);
    const dl = await student
      .get(`/api/assignments/${a._id}/download`)
      .expect(200);
    assert.equal(dl.text, "Assignment brief");
    await student
      .post(`/api/assignments/${a._id}/submit`)
      .attach("file", Buffer.from("bad"), "bad.exe")
      .expect(400);
    const sub = (
      await student
        .post(`/api/assignments/${a._id}/submit`)
        .attach("file", Buffer.from("My answer"), "answer.txt")
        .expect(200)
    ).body;
    await other.get(`/api/submissions/${sub._id}/download`).expect(403);
    await teacher
      .put(`/api/submissions/${sub._id}/grade`)
      .send({ grade: 91, feedback: "Good normalization" })
      .expect(200);
    const sid = (await User.findOne({ email: "student@test.edu" })).id;
    await teacher
      .put(`/api/courses/${c._id}/attendance`)
      .send({ student: sid, attended: 27, total: 40 })
      .expect(200);
    assert.equal((await student.get("/api/attendance")).body[0].mustAttend, 12);
    await teacher
      .put(`/api/courses/${c._id}/attendance`)
      .send({ student: sid, attended: 45, total: 40 })
      .expect(400);
    await teacher
      .put(`/api/courses/${c._id}/result`)
      .send({ student: sid, gradePoint: 9 })
      .expect(200);
    assert.equal((await student.get("/api/results")).body.cgpa, 9);
    assert.match(
      (
        await student
          .post("/api/assistant")
          .send({ message: "mera pending kaam kya hai" })
      ).body.answer,
      /pending nahi/,
    );
    await Assignment.findByIdAndUpdate(a._id, {
      dueAt: new Date(Date.now() - 1000),
    });
    await student
      .post(`/api/assignments/${a._id}/submit`)
      .attach("file", Buffer.from("late"), "late.txt")
      .expect(400);
    await teacher
      .post("/api/notices")
      .send({ title: "Exam notice", body: "Revision session on Friday" })
      .expect(201);
    assert.equal((await student.get("/api/notices")).body.length, 1);
    await student.post("/api/auth/logout").expect(200);
    await student.get("/api/auth/me").expect(401);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
    await fs.rm(uploadDir, { recursive: true, force: true });
  }
});
