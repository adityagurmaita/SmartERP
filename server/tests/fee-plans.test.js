import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seed } from "../src/seed.js";
test("admin fee adjustments/installments exact totals and student isolation", async () => {
  const m = await MongoMemoryServer.create();
  await mongoose.connect(m.getUri());
  try {
    await seed();
    const app = createApp({ jwtSecret: "g".repeat(48) }),
      s = request.agent(app),
      a = request.agent(app);
    for (const [c, r] of [
      [s, "student"],
      [a, "admin"],
    ])
      await c
        .post("/api/auth/login")
        .send({ email: r + "@smarterp.demo", password: "SmartERPdemo123!" });
    const f = (await s.get("/api/fees")).body.rows.find(
        (f) => f.title === "Tuition fee",
      ),
      url = "/api/fees/" + f._id + "/plan";
    const b = {
      baseAmountPaise: 6500000,
      finePaise: 50000,
      scholarshipPaise: 550000,
      adjustmentNote: "Fictional demo plan only",
      installments: [
        { label: "First", amountPaise: 4000000, dueAt: "2026-09-01T00:00:00Z" },
        {
          label: "Second",
          amountPaise: 2000000,
          dueAt: "2026-11-01T00:00:00Z",
        },
      ],
    };
    await s.patch(url).send(b).expect(403);
    await a
      .patch(url)
      .send({ ...b, scholarshipPaise: 7000000 })
      .expect(400);
    await a
      .patch(url)
      .send({ ...b, installments: [b.installments[0]] })
      .expect(400);
    await a
      .patch(url)
      .send({
        ...b,
        baseAmountPaise: 100000,
        scholarshipPaise: 0,
        installments: [],
      })
      .expect(400);
    const r = (await a.patch(url).send(b).expect(200)).body;
    assert.equal(r.amountPaise, 6000000);
    assert.equal(r.installments.length, 2);
    assert.equal(r.scholarshipPaise, 550000);
    const seen = (await s.get("/api/fees")).body.rows.find(
      (x) => x._id === f._id,
    );
    assert.equal(seen.amountPaise, 6000000);
    assert.equal(seen.payments[0].amountPaise, 4000000);
    await a
      .patch("/api/fees/" + f._id)
      .send({
        title: f.title,
        semester: f.semester,
        amountPaise: 6500000,
        dueAt: f.dueAt,
      })
      .expect(400);
  } finally {
    await mongoose.disconnect();
    await m.stop();
  }
});
