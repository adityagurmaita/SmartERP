import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seed } from "../src/seed.js";
test("timetable/exams scoped reads, class conflict, library renewal permissions", async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  try {
    await seed();
    const app = createApp({ jwtSecret: "x".repeat(48) });
    const student = request.agent(app),
      teacher = request.agent(app);
    for (const [a, r] of [
      [student, "student"],
      [teacher, "teacher"],
    ])
      await a
        .post("/api/auth/login")
        .send({ email: r + "@smarterp.demo", password: "SmartERPdemo123!" })
        .expect(200);
    const tt = (await student.get("/api/timetable").expect(200)).body;
    assert.equal(tt.length, 6);
    assert.equal((await student.get("/api/exams").expect(200)).body.length, 4);
    const slot = {
      course: tt[0].course._id,
      day: tt[0].day,
      start: tt[0].start,
      end: tt[0].end,
      room: tt[0].room,
      kind: "Lecture",
    };
    await student.post("/api/timetable").send(slot).expect(403);
    await teacher.post("/api/timetable").send(slot).expect(409);
    await teacher
      .post("/api/timetable")
      .send({ ...slot, day: 7, start: "09:00", end: "08:00" })
      .expect(400);
    await teacher
      .post("/api/timetable")
      .send({ ...slot, day: 7, start: "09:00", end: "10:00" })
      .expect(201);
    const lib = (await student.get("/api/library").expect(200)).body;
    assert.equal(lib.books.length, 3);
    assert.equal(lib.loans.length, 1);
    await teacher
      .post("/api/library/" + lib.loans[0]._id + "/renew")
      .expect(403);
    await student
      .post("/api/library/" + lib.loans[0]._id + "/renew")
      .expect(200);
    await student
      .post("/api/library/" + lib.loans[0]._id + "/renew")
      .expect(400);
    await student
      .post("/api/library/" + lib.loans[0]._id + "/return")
      .expect(403);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
