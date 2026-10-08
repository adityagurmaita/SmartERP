import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { privateWorkspace, tokenHash } from "../src/private-demo.js";
test("security migration invalidates old setup links once without changing passwords", async () => {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri("private");
  const options = { jwtSecret: "r".repeat(48) };
  const raw = await mongoose.createConnection(uri).asPromise();
  const student = new mongoose.Types.ObjectId();
  await raw
    .collection("users")
    .insertOne({
      _id: student,
      name: "Fixture",
      email: "fixture@example.invalid",
      role: "student",
      passwordHash: "UNCHANGED_HASH",
    });
  await raw
    .collection("privatesetups")
    .insertOne({
      student,
      tokenHash: tokenHash("old-test-token"),
      expiresAt: new Date(Date.now() + 864e5),
    });
  await raw.close();
  let w;
  try {
    w = await privateWorkspace(uri, options);
    assert.ok(
      (await w.Setup.findOne({ tokenHash: tokenHash("old-test-token") }))
        .usedAt,
    );
    assert.equal(
      (await w.models.User.findById(student).select("+passwordHash"))
        .passwordHash,
      "UNCHANGED_HASH",
    );
    await w.Setup.create({
      student,
      tokenHash: tokenHash("future-test-token"),
      expiresAt: new Date(Date.now() + 864e5),
    });
    await w.connection.close();
    w = await privateWorkspace(uri, options);
    assert.equal(
      (await w.Setup.findOne({ tokenHash: tokenHash("future-test-token") }))
        .usedAt,
      undefined,
    );
    assert.equal(
      (
        await w.connection
          .collection("securitymigrations")
          .findOne({ _id: "revoke-exposed-onboarding-links-2026-10-08" })
      ).revokedCount,
      1,
    );
  } finally {
    if (w) await w.connection.close();
    await mongo.stop();
  }
});
