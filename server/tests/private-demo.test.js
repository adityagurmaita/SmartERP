import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
import {
  privateWorkspace,
  provisionPrivate,
  installPrivateRouting,
} from "../src/private-demo.js";
test("separate private realm, persistent setup claim, no demo roster access", async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri("shared"));
  await seed();
  const options = { jwtSecret: "p".repeat(48), demoPublic: true };
  const w = await privateWorkspace(mongo.getUri("private"), options);
  try {
    const token = await provisionPrivate(w, {
      name: "Private Test Student",
      email: "private@example.invalid",
      rollNumber: "TEST",
    });
    const outer = express();
    outer.use(express.json(), cookieParser());
    installPrivateRouting(outer, w, options);
    outer.use(createApp(options));
    const pass = "PrivateTestPassword!2026",
      p = request.agent(outer),
      teacher = request.agent(outer),
      admin = request.agent(outer);
    await p.post("/api/auth/setup").send({ token, password: pass }).expect(200);
    await p.post("/api/auth/setup").send({ token, password: pass }).expect(400);
    await p
      .post("/api/auth/login")
      .send({ email: "private@example.invalid", password: pass })
      .expect(200);
    const courses = (await p.get("/api/courses").expect(200)).body;
    assert.equal(courses.length, 4);
    assert.equal((await p.get("/api/fees")).body.rows.length, 3);
    assert.equal((await p.get("/api/attendance")).body.length, 4);
    for (const [a, role] of [
      [teacher, "teacher"],
      [admin, "admin"],
    ])
      await a
        .post("/api/auth/login")
        .send({ email: role + "@smarterp.demo", password: "SmartERPdemo123!" })
        .expect(200);
    assert(
      !(await admin.get("/api/fees")).text.includes("private@example.invalid"),
    );
    await teacher
      .get("/api/courses/" + courses[0]._id + "/students")
      .expect(404);
    assert.equal(
      await mongoose
        .model("User")
        .countDocuments({ email: "private@example.invalid" }),
      0,
    );
    await w.connection.close();
    const w2 = await privateWorkspace(mongo.getUri("private"), options);
    try {
      assert.equal(await w2.Setup.countDocuments({ usedAt: { $ne: null } }), 1);
      assert(await w2.models.User.exists({ email: "private@example.invalid" }));
    } finally {
      await w2.connection.close();
    }
  } finally {
    if (w.connection.readyState) await w.connection.close();
    await mongoose.disconnect();
    await mongo.stop();
  }
});
