import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI in server/.env");
await mongoose.connect(process.env.MONGODB_URI);
const app = createApp({
  jwtSecret: process.env.JWT_SECRET,
  teacherCode: process.env.TEACHER_INVITE_CODE,
  clientOrigin: process.env.CLIENT_ORIGIN,
  production: process.env.NODE_ENV === "production",
});
const server = app.listen(process.env.PORT || 4000, () =>
  console.log("SmartERP API ready"),
);
process.on("SIGTERM", () =>
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  }),
);
