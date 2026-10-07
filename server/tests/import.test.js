import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { User } from "../src/models.js";
import { parseCSV } from "../src/import-students.js";
test("CSV quoting, validation, preview, import, replay guard and duplicates", async () => {
  assert.equal(
    parseCSV('name,rollNumber,email\n"Demo, Student",R1,s@college.demo')[0].data
      .name,
    "Demo, Student",
  );
  assert.throws(() =>
    parseCSV('name,rollNumber,email\n"Unclosed,R1,s@college.demo'),
  );
  assert.throws(() => parseCSV("name,email,name\nDemo,x@college.demo,D"));
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  try {
    const hash = await bcrypt.hash("TestImportPassword123!", 12);
    await User.create({
      name: "Admin",
      email: "admin@test.edu",
      role: "admin",
      passwordHash: hash,
    });
    await User.create({
      name: "Student",
      email: "student@test.edu",
      role: "student",
      passwordHash: hash,
    });
    const app = createApp({
      jwtSecret: "csv-test-secret-with-32-plus-characters",
      demoPublic: true,
    });
    const admin = request.agent(app),
      student = request.agent(app);
    for (const [a, email] of [
      [admin, "admin@test.edu"],
      [student, "student@test.edu"],
    ])
      await a
        .post("/api/auth/login")
        .send({ email, password: "TestImportPassword123!" })
        .expect(200);
    await student
      .post("/api/admin/import/preview")
      .send({ csv: "a" })
      .expect(403);
    await admin.get("/api/admin/import/template").expect(200);
    const csv =
      "name,rollNumber,email,department,semester,section\nDemo One,D001,one@college.demo,Computing,3,A\nDemo Two,D002,two@college.demo,Computing,3,A";
    const p = (
      await admin.post("/api/admin/import/preview").send({ csv }).expect(200)
    ).body;
    assert.equal(p.valid, 2);
    assert.equal(await User.countDocuments(), 2);
    const result = (
      await admin
        .post("/api/admin/import/commit")
        .send({
          previewId: p.previewId,
          initialPassword: "NewStudentsPassword123!",
        })
        .expect(200)
    ).body;
    assert.equal(result.created, 2);
    assert.equal(result.failed, 0);
    await admin
      .post("/api/admin/import/commit")
      .send({
        previewId: p.previewId,
        initialPassword: "NewStudentsPassword123!",
      })
      .expect(409);
    assert.equal(
      (await admin.post("/api/admin/import/preview").send({ csv })).body
        .invalid,
      2,
    );
    const duplicate =
      "name,rollNumber,email\nDemo X,R1,x@college.demo\nDemo Y,R1,y@college.demo";
    const bad = (
      await admin.post("/api/admin/import/preview").send({ csv: duplicate })
    ).body;
    assert.equal(bad.invalid, 1);
    await admin
      .post("/api/admin/import/commit")
      .send({
        previewId: bad.previewId,
        initialPassword: "NewStudentsPassword123!",
      })
      .expect(409);
    assert.equal(await User.countDocuments(), 4);
    const real = (
      await admin
        .post("/api/admin/import/preview")
        .send({ csv: "name,rollNumber,email\nReal Person,R3,real@gmail.com" })
    ).body;
    assert.equal(real.invalid, 1);
    const stale = (
      await admin
        .post("/api/admin/import/preview")
        .send({ csv: "name,rollNumber,email\nDemo Late,R4,late@college.demo" })
    ).body;
    await User.create({
      name: "Existing",
      email: "late@college.demo",
      rollNumber: "R4",
      role: "student",
      passwordHash: hash,
    });
    await admin
      .post("/api/admin/import/commit")
      .send({
        previewId: stale.previewId,
        initialPassword: "NewStudentsPassword123!",
      })
      .expect(409);
    const newStudent = request.agent(app);
    await newStudent
      .post("/api/auth/login")
      .send({ email: "one@college.demo", password: "NewStudentsPassword123!" })
      .expect(200);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
