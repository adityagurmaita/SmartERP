import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seed } from "../src/seed.js";
import { Fee, User } from "../src/models.js";
test("fictional student checkout, receipt, stale/double request and scope", async () => {
  const m = await MongoMemoryServer.create();
  await mongoose.connect(m.getUri());
  try {
    await seed();
    const app = createApp({ jwtSecret: "c".repeat(48), demoPublic: true });
    const student = request.agent(app),
      teacher = request.agent(app),
      admin = request.agent(app);
    for (const [a, r] of [
      [student, "student"],
      [teacher, "teacher"],
      [admin, "admin"],
    ])
      await a
        .post("/api/auth/login")
        .send({ email: r + "@smarterp.demo", password: "SmartERPdemo123!" })
        .expect(200);
    const f = (await student.get("/api/fees")).body.rows.find(
      (f) => f.title === "Examination fee",
    );
    const path = "/api/fees/" + f._id + "/demo-checkout";
    await teacher.post(path).send({ expectedAmountPaise: 250000 }).expect(403);
    await admin.post(path).send({ expectedAmountPaise: 250000 }).expect(403);
    await student.post(path).send({ expectedAmountPaise: 100 }).expect(409);
    const rs = await Promise.all([
      student.post(path).send({ expectedAmountPaise: 250000 }),
      student.post(path).send({ expectedAmountPaise: 250000 }),
    ]);
    assert.deepEqual(rs.map((r) => r.status).sort(), [201, 409]);
    const saved = rs.find((r) => r.status === 201).body;
    assert.equal(saved.payments.length, 1);
    assert.match(saved.payments[0].reference, /NO REAL MONEY/);
    await student.post(path).send({ expectedAmountPaise: 250000 }).expect(409);
    const rec = await student
      .get("/api/fees/" + f._id + "/receipts/" + saved.payments[0]._id)
      .expect(200);
    assert.match(rec.text, /NO REAL PAYMENT WAS PROCESSED/);
    const other = await User.create({
      name: "Other",
      email: "other@test.invalid",
      role: "student",
      passwordHash: "x",
    });
    const hidden = await Fee.create({
      student: other.id,
      title: "hidden",
      semester: "S5",
      amountPaise: 100,
      dueAt: new Date(),
    });
    await student
      .post("/api/fees/" + hidden.id + "/demo-checkout")
      .send({ expectedAmountPaise: 100 })
      .expect(403);
    const nonDemo = request.agent(createApp({ jwtSecret: "d".repeat(48) }));
    await nonDemo
      .post("/api/auth/login")
      .send({ email: "student@smarterp.demo", password: "SmartERPdemo123!" });
    await nonDemo.post(path).send({ expectedAmountPaise: 1 }).expect(403);
  } finally {
    await mongoose.disconnect();
    await m.stop();
  }
});
