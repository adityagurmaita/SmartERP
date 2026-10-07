import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { modelsForConnection } from "./models.js";
import { seed } from "./seed.js";
import { createApp } from "./app.js";
export const tokenHash = (value) =>
  createHash("sha256").update(value).digest("hex");
export async function privateWorkspace(uri, options = {}) {
  const connection = await mongoose.createConnection(uri).asPromise();
  const models = modelsForConnection(connection);
  if (process.env.PRIVATE_STUDENT_PROFILE_JSON) {
    const { accountEmail, rollNumber, ...profile } = JSON.parse(
      process.env.PRIVATE_STUDENT_PROFILE_JSON,
    );
    if (
      typeof accountEmail !== "string" ||
      typeof rollNumber !== "string" ||
      !Array.isArray(profile.rows) ||
      !profile.photoDataUrl?.startsWith("data:image/jpeg;base64,")
    )
      throw Error("Invalid private profile configuration");
    const changed = await models.User.updateOne(
      { email: accountEmail.toLowerCase(), role: "student" },
      { $set: { rollNumber, privateProfile: profile } },
    );
    if (changed.matchedCount !== 1)
      throw Error("Private profile account not found");
  }
  const Setup = connection.model(
    "PrivateSetup",
    new mongoose.Schema({
      tokenHash: { type: String, unique: true },
      student: mongoose.Schema.Types.ObjectId,
      expiresAt: Date,
      usedAt: Date,
    }),
  );
  const app = createApp({
    ...options,
    models,
    demoPublic: true,
    realm: "private",
  });
  // Installed before the regular login routes by a wrapper in the caller.
  return { connection, models, Setup, app };
}
export async function provisionPrivate(
  workspace,
  { name, email, rollNumber },
  expiresHours = 24,
) {
  const { models, Setup } = workspace;
  if (await models.User.exists({ email: email.toLowerCase() }))
    throw Error("Account exists. Do not silently reset credentials.");
  await seed(models);
  const hash = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
  const student = await models.User.findOneAndUpdate(
    { email: "student@smarterp.demo" },
    {
      $set: {
        name,
        email: email.toLowerCase(),
        rollNumber,
        passwordHash: hash,
      },
    },
    { returnDocument: "after" },
  );
  if (!student) throw Error("Private workspace already provisioned");
  for (const user of await models.User.find({ role: { $ne: "student" } })) {
    user.passwordHash = await bcrypt.hash(
      randomBytes(32).toString("base64url"),
      12,
    );
    await user.save();
  }
  const token = randomBytes(32).toString("base64url");
  await Setup.create({
    tokenHash: tokenHash(token),
    student: student._id,
    expiresAt: new Date(Date.now() + expiresHours * 3600000),
  });
  return token;
}
export function installPrivateRouting(outer, workspace, options) {
  const { models, Setup, app } = workspace;
  outer.post("/api/auth/setup", async (req, res, next) => {
    try {
      const { token, password } = req.body || {};
      if (
        typeof token !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(token) ||
        typeof password !== "string" ||
        password.length < 12 ||
        password.length > 128
      )
        return res.status(400).json({
          message:
            "Use a valid setup link and a password of 12-128 characters.",
        });
      const passwordHash = await bcrypt.hash(password, 12);
      // Atomic consume, never store a readable token or password.
      const claim = await Setup.findOneAndUpdate(
        {
          tokenHash: tokenHash(token),
          usedAt: null,
          expiresAt: { $gt: new Date() },
        },
        { $set: { usedAt: new Date() } },
        { returnDocument: "after" },
      );
      if (!claim)
        return res
          .status(400)
          .json({ message: "Setup link is used or expired." });
      const changed = await models.User.updateOne(
        { _id: claim.student, role: "student" },
        { $set: { passwordHash } },
      );
      if (!changed.matchedCount) throw Error("Private account unavailable");
      res.set("Cache-Control", "no-store").json({
        ok: true,
        message: "Password set. Sign in with your own email.",
      });
    } catch (e) {
      next(e);
    }
  });
  outer.use(async (req, res, next) => {
    try {
      if (req.path === "/api/auth/login") {
        const privateUser =
          typeof req.body?.email === "string" &&
          (await models.User.exists({
            email: req.body.email.toLowerCase(),
            role: "student",
          }));
        if (privateUser) return app(req, res, next);
      }
      const cookie = req.cookies?.session;
      if (cookie) {
        try {
          const data = jwt.verify(cookie, options.jwtSecret);
          if (data.realm === "private") return app(req, res, next);
        } catch {}
      }
      next();
    } catch (e) {
      next(e);
    }
  });
}
