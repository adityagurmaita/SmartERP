import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seed } from "../src/seed.js";
import { CampusRequest, User } from "../src/models.js";
test("student request kinds, scope, hostel date and admin review", async () => {
  const m = await MongoMemoryServer.create();
  await mongoose.connect(m.getUri());
  try {
    await seed();
    const app = createApp({ jwtSecret: "e".repeat(48) }),
      s = request.agent(app),
      t = request.agent(app),
      a = request.agent(app);
    for (const [c, r] of [
      [s, "student"],
      [t, "teacher"],
      [a, "admin"],
    ])
      await c
        .post("/api/auth/login")
        .send({ email: r + "@smarterp.demo", password: "SmartERPdemo123!" });
    const req = {
      kind: "Applications",
      category: "ID card",
      subject: "Demo replacement",
      details: "Fictional ID card replacement request",
    };
    const r = (await s.post("/api/requests").send(req).expect(201)).body;
    assert.equal(r.status, "Pending");
    await s
      .patch("/api/requests/" + r._id)
      .send({ status: "Approved", reviewNote: "test" })
      .expect(403);
    await t.get("/api/requests").expect(403);
    await s
      .post("/api/requests")
      .send({ ...req, status: "Approved" })
      .expect(400);
    await s
      .post("/api/requests")
      .send({
        ...req,
        kind: "Hostel",
        fromAt: "2026-11-02T09:00:00Z",
        toAt: "2026-11-01T09:00:00Z",
        destination: "Demo city",
      })
      .expect(400);
    await s
      .post("/api/requests")
      .send({
        ...req,
        kind: "Hostel",
        fromAt: "2026-11-01T09:00:00Z",
        toAt: "2026-11-02T09:00:00Z",
        destination: "Demo city",
      })
      .expect(201);
    await a
      .patch("/api/requests/" + r._id)
      .send({ status: "Resolved", reviewNote: "test" })
      .expect(400);
    await a
      .patch("/api/requests/" + r._id)
      .send({ status: "Approved", reviewNote: "Demo approval only" })
      .expect(200);
    const rows = (await s.get("/api/requests?kind=Applications")).body;
    assert.equal(rows[0].status, "Approved");
    const o = await User.create({
      name: "other",
      role: "student",
      email: "other@request.invalid",
      passwordHash: "x",
    });
    await CampusRequest.create({ ...req, student: o.id });
    assert.equal((await s.get("/api/requests")).body.length, 2);
    assert.equal((await a.get("/api/requests")).body.length, 3);
    const g = (
      await s.post("/api/requests").send({ ...req, kind: "Grievances" })
    ).body;
    await a
      .patch("/api/requests/" + g._id)
      .send({ status: "Resolved", reviewNote: "Fictional issue resolved" })
      .expect(200);
  } finally {
    await mongoose.disconnect();
    await m.stop();
  }
});
