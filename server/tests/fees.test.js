import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seed } from "../src/seed.js";
import { User, Fee } from "../src/models.js";

test("fee scope, balances, recording, overpayment and marked receipts", async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  try {
    await seed();
    const app = createApp({ jwtSecret: "a".repeat(48) });
    const student = request.agent(app),
      teacher = request.agent(app),
      admin = request.agent(app);
    for (const [a, role] of [
      [student, "student"],
      [teacher, "teacher"],
      [admin, "admin"],
    ])
      await a
        .post("/api/auth/login")
        .send({ email: role + "@smarterp.demo", password: "SmartERPdemo123!" })
        .expect(200);
    const rows = (await student.get("/api/fees").expect(200)).body.rows;
    assert.equal(rows.length, 3);
    const fee = rows.find((f) => f.title === "Examination fee");
    await student
      .post("/api/fees/" + fee._id + "/payments")
      .send({
        amountPaise: 100,
        paidAt: new Date().toISOString(),
        reference: "demo",
      })
      .expect(403);
    await teacher.get("/api/fees").expect(403);
    await teacher
      .post("/api/fees/" + fee._id + "/payments")
      .send({
        amountPaise: 100,
        paidAt: new Date().toISOString(),
        reference: "not allowed",
      })
      .expect(403);
    const body = {
      amountPaise: 100000,
      paidAt: new Date().toISOString(),
      reference: "Test demo entry",
    };
    const result = (
      await admin
        .post("/api/fees/" + fee._id + "/payments")
        .send(body)
        .expect(201)
    ).body;
    assert.equal(result.payments[0].amountPaise, 100000);
    const receipt = await student
      .get("/api/fees/" + fee._id + "/receipts/" + result.payments[0]._id)
      .expect(200);
    assert.match(receipt.text, /NOT AN OFFICIAL UNIVERSITY RECEIPT/);
    assert.match(receipt.text, /INR 1000.00/);
    await admin
      .post("/api/fees/" + fee._id + "/payments")
      .send({ ...body, amountPaise: 200000 })
      .expect(400);
    await admin
      .patch("/api/fees/" + fee._id)
      .send({
        title: fee.title,
        semester: fee.semester,
        amountPaise: 50000,
        dueAt: fee.dueAt,
      })
      .expect(400);
    const outsider = await User.create({
      name: "Other demo",
      email: "other@example.test",
      role: "student",
      passwordHash: "unused",
    });
    const hidden = await Fee.create({
      student: outsider.id,
      title: "Hidden",
      semester: "S5",
      amountPaise: 10000,
      dueAt: new Date(),
    });
    await student
      .get("/api/fees/" + hidden.id + "/receipts/000000000000000000000000")
      .expect(403);
    await admin
      .patch("/api/fees/" + hidden.id)
      .send({
        title: "Hidden",
        semester: "S5",
        amountPaise: 20000,
        dueAt: new Date().toISOString(),
      })
      .expect(200);
    const concurrent = await Promise.all([
      admin
        .post("/api/fees/" + fee._id + "/payments")
        .send({ ...body, amountPaise: 100000 }),
      admin
        .post("/api/fees/" + fee._id + "/payments")
        .send({ ...body, amountPaise: 100000 }),
    ]);
    assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 400]);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
