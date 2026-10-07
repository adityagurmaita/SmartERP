import { chromium } from "playwright";
import fs from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:5173");
await page
  .getByRole("heading", { name: "Welcome back", exact: true })
  .waitFor();
await page.screenshot({ path: "screenshots/login.png", fullPage: true });
await page.getByLabel("Email address").fill("student@smarterp.demo");
await page.getByLabel("Password", { exact: true }).fill("SmartERPdemo123!");
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("heading", { name: "Welcome back, Aarav" }).waitFor();
await page
  .getByText("Binary search tree implementation", { exact: true })
  .waitFor();
await page.screenshot({
  path: "screenshots/dashboard-desktop.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Toggle dark mode" }).click();
await page.screenshot({
  path: "screenshots/dashboard-dark.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Toggle dark mode" }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: "screenshots/dashboard-mobile.png",
  fullPage: true,
});
async function navigate(name) {
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .locator("aside nav")
    .getByRole("button", { name: new RegExp("^" + name) })
    .click();
}
for (const name of [
  "Assignments",
  "Attendance",
  "Results",
  "Notices",
  "Assistant",
  "Courses",
]) {
  await navigate(name);
  await page.screenshot({
    path: `screenshots/${name.toLowerCase()}-mobile.png`,
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error(`Overflow on ${name}`);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.screenshot({
    path: `screenshots/${name.toLowerCase()}-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
}
await navigate("Assistant");
await page.getByRole("button", { name: "mera pending kaam kya hai" }).click();
await page.getByText(/Aapke 3 assignments pending/).waitFor();
await navigate("Assignments");
await page.getByRole("button", { name: "Submit", exact: true }).first().click();
await page
  .locator("input[type=file]")
  .setInputFiles({
    name: "answer.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Verified student submission"),
  });
await page.getByRole("button", { name: "Upload submission" }).click();
await page.getByText("Submitted", { exact: true }).waitFor();
await page.getByRole("button", { name: "Open navigation" }).click();
await page.getByRole("button", { name: "Sign out" }).click();
await page
  .getByRole("heading", { name: "Welcome back", exact: true })
  .waitFor();
await page.setViewportSize({ width: 1280, height: 1000 });
await page.getByLabel("Email address").fill("teacher@smarterp.demo");
await page.getByLabel("Password", { exact: true }).fill("SmartERPdemo123!");
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("heading", { name: "Welcome back, Dr. Meera Singh" }).waitFor();
await page
  .getByText("Binary search tree implementation", { exact: true })
  .waitFor();
await page.screenshot({
  path: "screenshots/teacher-dashboard.png",
  fullPage: true,
});
await navigate("Assignments");
await page.getByRole("button", { name: "New assignment" }).click();
await page
  .getByLabel("Title", { exact: true })
  .fill("Browser-tested assignment");
await page.getByLabel("Instructions").fill("Complete the practice questions");
await page.getByLabel("Deadline (your local time)").fill("2026-12-01T17:00");
await page.getByRole("button", { name: "Publish assignment" }).click();
await page.getByText("Browser-tested assignment", { exact: true }).waitFor();
await page.getByRole("button", { name: "Review (1)" }).click();
await page.getByLabel("Grade / 100").fill("95");
await page.getByLabel("Feedback").fill("Well done");
await page.getByRole("button", { name: "Save feedback" }).click();
await page.waitForTimeout(500);
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "Browser flows passed: mobile navigation, all pages, theme, assistant, upload, teacher assignment creation and grading.",
);
await browser.close();
