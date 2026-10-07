import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seed } from "../src/seed.js";
test("exam applications, admit gate, resource downloads and club/achievement scope", async () => {
  const m = await MongoMemoryServer.create();
  await mongoose.connect(m.getUri());
  try {
    await seed();
    const app = createApp({ jwtSecret: "f".repeat(48) }),
      s = request.agent(app),
      a = request.agent(app),
      t = request.agent(app);
    for (const [c, r] of [
      [s, "student"],
      [a, "admin"],
      [t, "teacher"],
    ])
      await c
        .post("/api/auth/login")
        .send({ email: r + "@smarterp.demo", password: "SmartERPdemo123!" });
    const x = (
      await s
        .post("/api/requests")
        .send({
          kind: "Exam requests",
          category: "Back paper",
          subject: "Demo Data Structures back paper",
          details: "Fictional back paper request",
        })
        .expect(201)
    ).body;
    await s.get("/api/requests/" + x._id + "/admit-card").expect(404);
    await a
      .patch("/api/requests/" + x._id)
      .send({ status: "Approved", reviewNote: "Demo approval only" })
      .expect(200);
    const card = await s
      .get("/api/requests/" + x._id + "/admit-card")
      .expect(200);
    assert.match(card.text, /NOT VALID FOR ANY REAL EXAM/);
    const resources = (await s.get("/api/resources").expect(200)).body;
    assert.equal(resources.length, 8);
    const download = await s
      .get("/api/resources/" + resources[0]._id + "/download")
      .expect(200);
    assert.match(download.text, /Not an official university document/);
    const clubs = (await s.get("/api/clubs").expect(200)).body.clubs;
    assert.equal(clubs.length, 3);
    await t.post("/api/clubs/" + clubs[0]._id + "/join").expect(403);
    await s.post("/api/clubs/" + clubs[0]._id + "/join").expect(201);
    await s.post("/api/clubs/" + clubs[0]._id + "/join").expect(201);
    assert.equal((await s.get("/api/clubs")).body.memberships.length, 1);
    await s.delete("/api/clubs/" + clubs[0]._id + "/join").expect(200);
    assert.equal((await s.get("/api/clubs")).body.memberships.length, 0);
    await s
      .post("/api/achievements")
      .send({
        title: "Demo project",
        details: "Fictional self-reported demo result",
        achievedOn: "2026-01-01T00:00:00Z",
      })
      .expect(201);
    assert.equal((await s.get("/api/clubs")).body.achievements.length, 1);
    assert.equal((await a.get("/api/clubs")).body.achievements.length, 0);
  } finally {
    await mongoose.disconnect();
    await m.stop();
  }
});
