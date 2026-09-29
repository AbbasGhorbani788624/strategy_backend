const test = require("node:test");
const assert = require("node:assert/strict");
const { buildAggregatePreviewResponse } = require("../src/utils/buildAggregatePreviewResponse");
const { aggregateSubmissions } = require("../src/utils/aggregateFormSubmissions");
const { buildFormattedResponses } = require("../src/utils/buildFormattedResponses");

const makeForm = () => ({
  categories: [
    {
      id: "cat-1",
      title: "Cat",
      questions: [
        {
          id: "q1",
          label: "سؤال",
          type: "RADIO",
          isScored: false,
          weight: 0,
          options: [
            { value: "a", label: "گزینه الف", order: 1 },
            { value: "b", label: "گزینه ب", order: 2 },
          ],
        },
      ],
      children: [],
    },
  ],
});

function submission(id, answers, form) {
  return {
    respondentId: id,
    displayName: id,
    rawAnswers: answers,
    formattedResponses: buildFormattedResponses(form, answers, {
      keepInternalFields: true,
    }),
    submittedAt: new Date(),
  };
}

test("preview always returns READY with formResponses", () => {
  const form = makeForm();
  const raw = aggregateSubmissions(
    [
      submission("u1", { q1: "a" }, form),
      submission("u2", { q1: "b" }, form),
    ],
    form,
  );

  assert.equal(raw.aggregateStatus, "READY");

  const preview = buildAggregatePreviewResponse(raw);
  assert.equal(preview.aggregateStatus, "READY");
  assert.equal(preview.questions, null);
  assert.ok(preview.formResponses);
  assert.equal("ties" in preview, false);
});

test("preview includes totalSubmittedPool", () => {
  const form = makeForm();
  const raw = aggregateSubmissions(
    [submission("u1", { q1: "a" }, form)],
    form,
  );

  const preview = buildAggregatePreviewResponse(raw);
  assert.equal(preview.totalSubmittedPool, 1);
});
