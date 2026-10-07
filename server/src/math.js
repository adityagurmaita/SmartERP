export function attendanceAdvice(attended, total, target = 0.75) {
  if (
    !Number.isInteger(attended) ||
    !Number.isInteger(total) ||
    attended < 0 ||
    total < 0 ||
    attended > total ||
    target <= 0 ||
    target >= 1
  )
    throw new Error("Invalid attendance");
  const percentage = total ? (attended / total) * 100 : 0;
  return {
    percentage,
    canMiss: Math.max(0, Math.floor(attended / target - total + 1e-9)),
    mustAttend: Math.max(
      0,
      Math.ceil((target * total - attended) / (1 - target) - 1e-9),
    ),
    target: target * 100,
  };
}
export function cgpa(rows) {
  const credits = rows.reduce((s, r) => s + r.credits, 0);
  return credits
    ? rows.reduce((s, r) => s + r.credits * r.gradePoint, 0) / credits
    : null;
}
