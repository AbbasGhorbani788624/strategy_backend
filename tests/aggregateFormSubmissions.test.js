const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildFormattedResponses,
} = require("../src/utils/buildFormattedResponses");
const { aggregateSubmissions } = require("../src/utils/aggregateFormSubmissions");

const makeOption = (value, score, order = 0) => ({
  value,
  label: value,
  score,
  order,
});

const makeForm = (questions) => ({
  categories: [
    {
      id: "category-1",
      title: "Category 1",
      questions,
      children: [],
    },
  ],
});

function submission(respondentId, answers, form) {
  return {
    respondentId,
    displayName: respondentId,
    rawAnswers: answers,
    formattedResponses: buildFormattedResponses(form, answers, {
      keepInternalFields: true,
    }),
    submittedAt: new Date(),
  };
}

function scoredRadioForm(options) {
  return makeForm([
    {
      id: "q1",
      label: "Q1",
      type: "RADIO",
      isScored: true,
      weight: 10,
      options,
    },
  ]);
}

test("RADIO without score collects all responses", () => {
  const form = makeForm([
    {
      id: "q1",
      label: "Q1",
      type: "RADIO",
      isScored: false,
      weight: 0,
      options: [makeOption("A", null), makeOption("B", null)],
    },
  ]);

  const result = aggregateSubmissions(
    [
      submission("creator", { q1: "A" }, form),
      submission("ali", { q1: "A" }, form),
      submission("reza", { q1: "B" }, form),
    ],
    form,
  );

  assert.equal(result.aggregateStatus, "READY");
  const question = result.questions[0];
  assert.equal(question.aggregationMethod, "COLLECT_ALL");
  assert.equal(question.answer.responses.length, 3);

  const stored = result.formResponses.categories[0].questions[0];
  assert.equal("type" in stored, false);
  assert.equal("aggregationMethod" in stored.answer, false);
  assert.deepEqual(stored.answer.responses, [
    { displayName: "creator", label: "A", value: "A" },
    { displayName: "ali", label: "A", value: "A" },
    { displayName: "reza", label: "B", value: "B" },
  ]);
  assert.equal(JSON.stringify(stored).includes("respondentId"), false);
});

test("RADIO without score does not block on split votes", () => {
  const form = makeForm([
    {
      id: "q1",
      label: "Q1",
      type: "RADIO",
      isScored: false,
      weight: 0,
      options: [makeOption("A", null), makeOption("B", null)],
    },
  ]);

  const result = aggregateSubmissions(
    [
      submission("creator", { q1: "A" }, form),
      submission("ali", { q1: "B" }, form),
    ],
    form,
  );

  assert.equal(result.aggregateStatus, "READY");
  assert.equal(result.questions[0].aggregationStatus, "OK");
  assert.equal(result.questions[0].answer.responses.length, 2);
});

test("RADIO scored 5,3,3 rounds to 4 and picks option with score 4", () => {
  const form = scoredRadioForm([
    makeOption("two", 2, 1),
    makeOption("three", 3, 2),
    makeOption("four", 4, 3),
    makeOption("five", 5, 4),
  ]);

  const result = aggregateSubmissions(
    [
      submission("a", { q1: "five" }, form),
      submission("b", { q1: "three" }, form),
      submission("c", { q1: "three" }, form),
    ],
    form,
  );

  const q = result.questions[0];
  assert.equal(q.aggregationMethod, "MEAN_SCORE_ROUNDED");
  assert.equal(q.score, 4);
  assert.deepEqual(q.answer, { label: "four", value: "four" });

  const stored = result.formResponses.categories[0].questions[0];
  assert.equal(stored.score, 4);
  assert.deepEqual(stored.answer, { label: "four", value: "four" });
  assert.equal("score" in stored.answer, false);
});

test("RADIO scored 5,3,2 rounds to 3", () => {
  const form = scoredRadioForm([
    makeOption("two", 2, 1),
    makeOption("three", 3, 2),
    makeOption("five", 5, 3),
  ]);

  const result = aggregateSubmissions(
    [
      submission("a", { q1: "five" }, form),
      submission("b", { q1: "three" }, form),
      submission("c", { q1: "two" }, form),
    ],
    form,
  );

  assert.equal(result.questions[0].score, 3);
  assert.equal(result.questions[0].answer.value, "three");
});

test("RADIO scored 3,4 rounds to 4", () => {
  const form = scoredRadioForm([
    makeOption("three", 3, 1),
    makeOption("four", 4, 2),
  ]);

  const result = aggregateSubmissions(
    [
      submission("a", { q1: "three" }, form),
      submission("b", { q1: "four" }, form),
    ],
    form,
  );

  assert.equal(result.questions[0].score, 4);
  assert.equal(result.questions[0].answer.value, "four");
});

test("RADIO scored 3,3,4 rounds to 3", () => {
  const form = scoredRadioForm([
    makeOption("three", 3, 1),
    makeOption("four", 4, 2),
  ]);

  const result = aggregateSubmissions(
    [
      submission("a", { q1: "three" }, form),
      submission("b", { q1: "three" }, form),
      submission("c", { q1: "four" }, form),
    ],
    form,
  );

  assert.equal(result.questions[0].score, 3);
  assert.equal(result.questions[0].answer.value, "three");
});

test("RADIO scored does not block tie-like split votes", () => {
  const form = scoredRadioForm([
    makeOption("low", 1, 1),
    makeOption("med", 3, 2),
  ]);

  const result = aggregateSubmissions(
    [
      submission("creator", { q1: "med" }, form),
      submission("ali", { q1: "low" }, form),
    ],
    form,
  );

  assert.equal(result.aggregateStatus, "READY");
  assert.equal(result.questions[0].score, 2);
  assert.equal(result.questions[0].answer, null);
});

test("CHECKBOX without score selects options with > N/2", () => {
  const form = makeForm([
    {
      id: "q1",
      label: "Q1",
      type: "CHECKBOX",
      isScored: false,
      weight: 0,
      options: [
        makeOption("A", null),
        makeOption("B", null),
        makeOption("C", null),
      ],
    },
  ]);

  const result = aggregateSubmissions(
    [
      submission("creator", { q1: ["A", "B"] }, form),
      submission("ali", { q1: ["A", "C"] }, form),
      submission("reza", { q1: ["A", "B"] }, form),
    ],
    form,
  );

  const values = result.questions[0].answer.map((item) => item.value).sort();
  assert.deepEqual(values, ["A", "B"]);
});

test("CHECKBOX with score mean of person scores", () => {
  const form = makeForm([
    {
      id: "q1",
      label: "Q1",
      type: "CHECKBOX",
      isScored: true,
      weight: 10,
      options: [
        makeOption("A", 4, 1),
        makeOption("B", 5, 2),
        makeOption("C", 2, 3),
      ],
    },
  ]);

  const result = aggregateSubmissions(
    [
      submission("creator", { q1: ["A", "B"] }, form),
      submission("ali", { q1: ["A", "C"] }, form),
      submission("reza", { q1: ["A", "B"] }, form),
    ],
    form,
  );

  assert.equal(result.questions[0].score, 4);
});

test("NUMBER mean ignores invalid values", () => {
  const form = makeForm([
    {
      id: "q1",
      label: "Q1",
      type: "NUMBER",
      isScored: false,
      weight: 0,
      options: [],
    },
  ]);

  const result = aggregateSubmissions(
    [
      submission("a", { q1: 100 }, form),
      submission("b", { q1: 120 }, form),
      submission("c", { q1: 110 }, form),
      submission("d", { q1: "" }, form),
    ],
    form,
  );

  assert.equal(result.questions[0].answer, 110);
  assert.equal(result.questions[0].validResponses, 3);
  assert.equal(result.questions[0].totalSubmittedPool, 4);
});

test("TEXT collect all responses", () => {
  const form = makeForm([
    {
      id: "q1",
      label: "Q1",
      type: "TEXT",
      isScored: false,
      weight: 0,
      options: [],
    },
  ]);

  const result = aggregateSubmissions(
    [
      submission("a", { q1: "text1" }, form),
      submission("b", { q1: "text2" }, form),
      submission("c", { q1: "text3" }, form),
    ],
    form,
  );

  assert.equal(result.questions[0].answer.responses.length, 3);
  assert.equal(result.questions[0].aggregationMethod, "COLLECT_ALL");

  const stored = result.formResponses.categories[0].questions[0];
  assert.equal("aggregationMethod" in stored.answer, false);
  assert.deepEqual(stored.answer.responses, [
    { displayName: "a", text: "text1" },
    { displayName: "b", text: "text2" },
    { displayName: "c", text: "text3" },
  ]);
});

test("skip uses per-question denominator for collect all radio", () => {
  const form = makeForm([
    {
      id: "q1",
      label: "Q1",
      type: "RADIO",
      isScored: false,
      weight: 0,
      options: [makeOption("Good", null), makeOption("Medium", null)],
    },
  ]);

  const result = aggregateSubmissions(
    [
      submission("creator", { q1: "Good" }, form),
      submission("ali", { q1: "Good" }, form),
      submission("reza", { q1: "Medium" }, form),
      submission("sara", {}, form),
    ],
    form,
  );

  assert.equal(result.questions[0].responsesCount, 3);
  assert.equal(result.questions[0].answer.responses.length, 3);
});

test("creator and collaborators all included in breakdown count", () => {
  const form = makeForm([
    {
      id: "q1",
      label: "Q1",
      type: "RADIO",
      isScored: false,
      weight: 0,
      options: [makeOption("A", null), makeOption("B", null)],
    },
  ]);

  const result = aggregateSubmissions(
    [
      submission("Creator", { q1: "A" }, form),
      submission("Ali", { q1: "A" }, form),
      submission("Reza", { q1: "B" }, form),
    ],
    form,
  );

  assert.equal(result.totalSubmittedPool, 3);
  assert.equal(result.questions[0].breakdown.length, 3);
});
