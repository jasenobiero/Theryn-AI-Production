import test from "node:test";
import assert from "node:assert/strict";

import { OPENROUTER_MODELS, normalizeOpenRouterModel } from "./openrouter-models.js";

test("normalizes deprecated OpenRouter model IDs", () => {
  assert.equal(normalizeOpenRouterModel("openrouter/free"), "openrouter/free");
  assert.equal(normalizeOpenRouterModel("meta-llama/llama-3-70b-instruct"), "meta-llama/llama-3.3-70b-instruct");
  assert.equal(normalizeOpenRouterModel("deepseek/deepseek-coder"), "deepseek/deepseek-v4.1-flash-1017");
  assert.equal(normalizeOpenRouterModel("google/gemini-2.5-pro"), "google/gemini-2.5-pro");
  assert.equal(normalizeOpenRouterModel("x-ai/grok-4.3"), "x-ai/grok-4.3");
  assert.equal(normalizeOpenRouterModel("deepseek/deepseek-v4.1-flash-1017"), "deepseek/deepseek-v4.1-flash-1017");
});

test("keeps the supported OpenRouter model catalog in sync", () => {
  assert.deepEqual(OPENROUTER_MODELS, [
    "openrouter/free",
    "x-ai/grok-4.3",
    "google/gemini-2.5-pro",
    "meta-llama/llama-3.3-70b-instruct",
    "deepseek/deepseek-v4.1-flash-1017",
  ]);
});
