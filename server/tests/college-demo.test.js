import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as models from "../src/models.js";
import { seed } from "../src/seed.js";
import { seedCollege } from "../src/college-demo.js";
test("college cohort is additive, fictional, idempotent and separated from original student", async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  try {
    await seed();
    const before = await models.User.findOne({
      email: "student@smarterp.demo",
    });
    await seedCollege(models);
    assert.equal(await models.User.countDocuments({ role: "student" }), 13);
    assert.equal(await models.User.countDocuments({ role: "teacher" }), 3);
    assert.equal(await models.Course.countDocuments(), 6);
    assert.equal(
      await models.Course.countDocuments({ students: before.id }),
      4,
    );
    await seedCollege(models);
    assert.equal(await models.User.countDocuments(), 17);
    assert.equal(await models.Attendance.countDocuments(), 28);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
