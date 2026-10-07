import test from "node:test";
import assert from "node:assert/strict";
import { attendanceAdvice, cgpa } from "../src/math.js";
test("75% boundaries and recovery", () => {
  assert.equal(attendanceAdvice(30, 40).canMiss, 0);
  assert.equal(attendanceAdvice(32, 40).canMiss, 2);
  assert.equal(attendanceAdvice(27, 40).mustAttend, 12);
  assert.equal(attendanceAdvice(0, 0).mustAttend, 0);
  assert.throws(() => attendanceAdvice(41, 40));
});
test("weighted CGPA", () => {
  assert.equal(
    cgpa([
      { credits: 4, gradePoint: 8 },
      { credits: 2, gradePoint: 10 },
    ]),
    52 / 6,
  );
  assert.equal(cgpa([]), null);
});
