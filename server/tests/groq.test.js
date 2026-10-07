import test from "node:test";
import assert from "node:assert/strict";
import { generalAnswer } from "../src/groq.js";
test("Groq transport sends only question and fixed generic prompt, no records", async () => {
  let payload;
  const answer = await generalAnswer("Explain binary search", {
    key: "fixture-key",
    fetcher: async (_url, options) => {
      payload = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: "Binary search halves a sorted range." } },
          ],
        }),
      };
    },
  });
  assert.match(answer, /Binary search/);
  assert.equal(payload.messages.length, 2);
  assert.equal(payload.messages[1].content, "Explain binary search");
  assert.equal(payload.model, "openai/gpt-oss-20b");
  assert(!("tools" in payload));
  await assert.rejects(
    () =>
      generalAnswer("test", {
        key: "fixture",
        fetcher: async () => ({ ok: false }),
      }),
    /temporarily unavailable/,
  );
});
