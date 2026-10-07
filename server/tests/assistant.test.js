import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
import { User, Attendance, Result, Fee } from "../src/models.js";
import { assistantIntents } from "../src/assistant-intents.js";
test("English, Hinglish and Hindi intents, unknown fallback", () => {
  for (const [q, i] of [
    ["my roll no", "roll"],
    ["mera nam", "name"],
    ["मेरा नाम", "name"],
    ["मेरी उपस्थिति", "attendance"],
    ["meri attendance", "attendance"],
    ["my cgpa", "results"],
    ["kitna fees baki hai", "fees"],
    ["mera pending kaam kya hai", "assignments"],
  ])
    assert(assistantIntents(q).includes(i), q);
  assert.deepEqual(assistantIntents("weather today"), []);
  assert.deepEqual(assistantIntents("my name and cgpa"), ["name", "results"]);
});
test("copilot uses own stored records, not blanket assignment answer", async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  try {
    await seed();
    const app = createApp({ jwtSecret: "test".repeat(12), demoPublic: true }),
      p = request.agent(app);
    await p
      .post("/api/auth/login")
      .send({ email: "student@smarterp.demo", password: "SmartERPdemo123!" })
      .expect(200);
    const u = await User.findOne({ email: "student@smarterp.demo" });
    const ask = async (q) =>
      (await p.post("/api/assistant").send({ message: q }).expect(200)).body;
    assert.match((await ask("mera nam")).answer, new RegExp(u.name));
    assert.match((await ask("my roll no")).answer, new RegExp(u.rollNumber));
    const att = await ask("meri attendance CS202");
    assert.equal(att.intent, "attendance");
    assert.match(att.answer, /67.5%/);
    assert.match(att.answer, /12 consecutive/);
    assert(!att.answer.includes("CS201"));
    const grades = await ask("my cgpa");
    assert.match(grades.answer, /8.75\/10/);
    assert(!grades.answer.includes("pending"));
    const fees = await ask("fees kitna baki hai");
    assert.equal(fees.intent, "fees");
    assert.match(fees.answer, /balance/);
    assert(!fees.answer.includes("pending"));
    assert.match(
      (await ask("mera pending kaam kya hai")).answer,
      /assignments pending/,
    );
    assert.equal((await ask("weather")).intent, "unknown");
    assert.equal((await ask("weather")).items.length, 0);
    const other = await User.create({
      name: "Unrelated Person",
      email: "unrelated@example.invalid",
      role: "student",
      passwordHash: "unused",
      rollNumber: "OTHER",
    });
    const c = (await p.get("/api/courses")).body[0];
    await Attendance.create({
      student: other.id,
      course: c._id,
      attended: 999,
      total: 999,
    });
    await Result.create({ student: other.id, course: c._id, gradePoint: 1 });
    await Fee.create({
      student: other.id,
      title: "PRIVATE_OTHER_ONLY",
      semester: "test",
      amountPaise: 999,
      dueAt: new Date(),
    });
    assert(
      !(await ask("attendance results fees")).answer.includes(
        "PRIVATE_OTHER_ONLY",
      ),
    );
    assert(!(await ask("attendance")).answer.includes("999"));
    await Attendance.deleteMany({ student: u.id });
    assert.match((await ask("attendance")).answer, /No attendance/);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
