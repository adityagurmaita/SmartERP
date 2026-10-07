import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import * as models from "../src/models.js";
import { bootstrapAdmin } from "../src/admin.js";
test("college admin, role enforcement, subject allocation, account status and scoped faculty notices", async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  try {
    await bootstrapAdmin(models, {
      ADMIN_EMAIL: "office@college.test",
      ADMIN_PASSWORD: "TestOnlyPassword123!",
    });
    const original = (
      await models.User.findOne({ email: "office@college.test" }).select(
        "+passwordHash",
      )
    ).passwordHash;
    await bootstrapAdmin(models, {
      ADMIN_EMAIL: "office@college.test",
      ADMIN_PASSWORD: "NotReplacingPassword123!",
    });
    assert.equal(
      (
        await models.User.findOne({ email: "office@college.test" }).select(
          "+passwordHash",
        )
      ).passwordHash,
      original,
    );
    const app = createApp({
      jwtSecret: "college-secret-is-longer-than-32-characters",
      teacherCode: "test-invite",
    });
    const admin = request.agent(app),
      faculty = request.agent(app),
      other = request.agent(app),
      student = request.agent(app);
    await admin
      .post("/api/auth/login")
      .send({ email: "office@college.test", password: "TestOnlyPassword123!" })
      .expect(200);
    async function person(email, role, rollNumber) {
      return (
        await admin
          .post("/api/admin/users")
          .send({
            name: "Test " + role,
            email,
            role,
            rollNumber,
            department: "Computing",
            semester: 3,
            section: "A",
            password: "TestOnlyPassword123!",
          })
          .expect(201)
      ).body;
    }
    const f = await person("faculty@college.test", "teacher");
    const f2 = await person("other@college.test", "teacher");
    const s = await person("student@college.test", "student", "R001");
    const s2 = await person("second@college.test", "student", "R002");
    assert.equal(f.passwordHash, undefined);
    await admin
      .post("/api/admin/users")
      .send({
        name: "Duplicate roll",
        email: "dup@college.test",
        role: "student",
        rollNumber: "R001",
        password: "TestOnlyPassword123!",
      })
      .expect(409);
    for (const [a, email] of [
      [faculty, f.email],
      [other, f2.email],
      [student, s.email],
    ])
      await a
        .post("/api/auth/login")
        .send({ email, password: "TestOnlyPassword123!" })
        .expect(200);
    await student.get("/api/admin/users").expect(403);
    await faculty.get("/api/admin/overview").expect(403);
    await request(app).get("/api/admin/users").expect(401);
    await student
      .post("/api/auth/register")
      .send({
        name: "Intruder",
        email: "intruder@college.test",
        role: "admin",
        password: "TestOnlyPassword123!",
      })
      .expect(400);
    const b = {
      name: "Database Systems",
      code: "CS301",
      credits: 4,
      teacher: f._id,
      students: [s._id],
      department: "Computing",
    };
    const c = (await admin.post("/api/admin/courses").send(b).expect(201)).body;
    await admin
      .post("/api/admin/courses")
      .send({ ...b, code: "INVALID", teacher: s._id })
      .expect(400);
    await other.get("/api/courses/" + c._id + "/students").expect(403);
    assert.equal((await faculty.get("/api/courses")).body.length, 1);
    assert.equal((await other.get("/api/courses")).body.length, 0);
    await other
      .post("/api/notices")
      .send({ title: "Unwanted notice", body: "Not my subject", course: c._id })
      .expect(403);
    await faculty
      .post("/api/notices")
      .send({
        title: "Class revision",
        body: "Bring your notes",
        course: c._id,
      })
      .expect(201);
    assert.equal((await student.get("/api/notices")).body.length, 1);
    assert.equal((await other.get("/api/notices")).body.length, 0);
    await admin
      .post("/api/admin/notices")
      .send({ title: "Campus circular", body: "Welcome to the college" })
      .expect(201);
    assert.equal((await other.get("/api/notices")).body.length, 1);
    await admin
      .patch("/api/admin/users/" + s2._id)
      .send({ role: "admin" })
      .expect(400);
    await admin
      .patch("/api/admin/users/" + f._id)
      .send({ active: false })
      .expect(200);
    await faculty.get("/api/courses").expect(401);
    await faculty
      .post("/api/auth/login")
      .send({ email: f.email, password: "TestOnlyPassword123!" })
      .expect(401);
    await admin
      .patch("/api/admin/users/" + f._id)
      .send({ active: true })
      .expect(200);
    assert.equal((await admin.get("/api/admin/overview")).body.students, 2);
    assert.ok(
      (await admin.get("/api/admin/overview")).body.activity.length >= 6,
    );
    await admin
      .put("/api/admin/courses/" + c._id)
      .send({ ...b, teacher: f2._id, students: [s._id, s2._id] })
      .expect(200);
    assert.equal((await other.get("/api/courses")).body.length, 1);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
