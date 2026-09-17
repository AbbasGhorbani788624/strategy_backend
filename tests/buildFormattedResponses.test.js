const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildFormattedResponses,
  buildFormResponsesForAi,
} = require("../src/utils/buildFormattedResponses");

const makeOption = (value, score) => ({
  value,
  label: value,
  score,
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

test("calculates weighted category and overall scores", () => {
  const form = makeForm([
    {
      id: "question-1",
      label: "Question 1",
      type: "RADIO",
      isScored: true,
      weight: 50,
      options: [makeOption("five", 5)],
    },
    {
      id: "question-2",
      label: "Question 2",
      type: "RADIO",
      isScored: true,
      weight: 30,
      options: [makeOption("three", 3)],
    },
    {
      id: "question-3",
      label: "Question 3",
      type: "RADIO",
      isScored: true,
      weight: 20,
      options: [makeOption("one", 1)],
    },
  ]);

  const result = buildFormattedResponses(form, {
    "question-1": "five",
    "question-2": "three",
    "question-3": "one",
  });

  assert.equal(result.categories[0].score, 3.6);
  assert.equal(result.overallScore, 3.6);
  assert.equal(result.categories[0].questions[0].answer.score, 5);
  assert.equal(result.categories[0].questions[0].weight, 50);
});

test("reads radio option score from an object answer without using answer.value as score", () => {
  const form = makeForm([
    {
      id: "question-1",
      label: "Question 1",
      type: "RADIO",
      weight: 10,
      options: [makeOption("3", 5)],
    },
  ]);

  const result = buildFormattedResponses(form, {
    "question-1": { label: "Medium", value: "3" },
  });

  assert.equal(result.categories[0].questions[0].score, 5);
  assert.equal(result.categories[0].score, 5);
});

test("matches radio values when answer and option use different primitive types", () => {
  const form = makeForm([
    {
      id: "question-1",
      label: "Question 1",
      type: "RADIO",
      weight: 1,
      options: [makeOption(1, 4)],
    },
  ]);

  const result = buildFormattedResponses(form, {
    "question-1": { value: "1" },
  });

  assert.equal(result.categories[0].questions[0].answer.value, 1);
  assert.equal(result.categories[0].questions[0].score, 4);
  assert.equal(result.categories[0].score, 4);
  assert.equal(result.overallScore, 4);
});

test("averages selected checkbox scores before applying weight", () => {
  const form = makeForm([
    {
      id: "question-1",
      label: "Question 1",
      type: "CHECKBOX",
      isScored: true,
      weight: 100,
      options: [makeOption("two", 2), makeOption("four", 4)],
    },
  ]);

  const result = buildFormattedResponses(form, {
    "question-1": [
      { label: "two", value: "two" },
      { label: "four", value: "four" },
    ],
  });

  assert.equal(result.categories[0].score, 3);
  assert.deepEqual(
    result.categories[0].questions[0].answer.map((option) => option.score),
    [2, 4],
  );
});

test("excludes questions without weight and supports zero weight", () => {
  const form = makeForm([
    {
      id: "question-null",
      label: "No weight",
      type: "RADIO",
      isScored: true,
      weight: null,
      options: [makeOption("five", 5)],
    },
    {
      id: "question-zero",
      label: "Zero weight",
      type: "RADIO",
      isScored: true,
      weight: 0,
      options: [makeOption("one", 1)],
    },
    {
      id: "question-full",
      label: "Full weight",
      type: "RADIO",
      isScored: true,
      weight: 100,
      options: [makeOption("four", 4)],
    },
  ]);

  const result = buildFormattedResponses(form, {
    "question-null": "five",
    "question-zero": "one",
    "question-full": "four",
  });

  assert.equal(result.categories[0].score, 4);
  assert.equal(result.overallScore, 4);
});

test("returns null scores when no weighted answer is available", () => {
  const form = makeForm([
    {
      id: "question-1",
      label: "Question 1",
      type: "RADIO",
      isScored: true,
      weight: 100,
      options: [makeOption("five", 5)],
    },
  ]);

  const result = buildFormattedResponses(form, {});

  assert.equal(result.categories[0].score, null);
  assert.equal(result.overallScore, null);
});

test("calculates overall score as the average of scored categories", () => {
  const form = {
    categories: [
      {
        id: "category-1",
        title: "Category 1",
        questions: [
          {
            id: "question-1",
            label: "Question 1",
            type: "RADIO",
            weight: 100,
            options: [makeOption("four", 4)],
          },
        ],
        children: [],
      },
      {
        id: "category-2",
        title: "Category 2",
        questions: [
          {
            id: "question-2",
            label: "Question 2",
            type: "RADIO",
            weight: 100,
            options: [makeOption("two", 2)],
          },
        ],
        children: [],
      },
    ],
  };

  const result = buildFormattedResponses(form, {
    "question-1": "four",
    "question-2": "two",
  });

  assert.equal(result.overallScore, 3);
});

test("removes internal question fields from AI form responses", () => {
  const result = buildFormResponsesForAi({
    formId: "form-1",
    multiAnalysisFormId: "multi-form-1",
    categoryCount: 1,
    overallScore: 3.5,
    categories: [
      {
        title: "Category 1",
        score: 3.5,
        questions: [
          {
            id: "question-1",
            type: "RADIO",
            label: "Question 1",
            isScored: true,
            score: 4,
            weight: 1,
            answer: { label: "High", value: "4" },
          },
          {
            id: "question-2",
            type: "TEXT",
            label: "Question 2",
            isScored: false,
            score: null,
            weight: null,
            answer: "text",
          },
        ],
      },
    ],
  });

  assert.deepEqual(result, {
    overallScore: 3.5,
    categories: [
      {
        title: "Category 1",
        score: 3.5,
        questions: [
          {
            label: "Question 1",
            answer: { label: "High", value: "4" },
            score: 4,
            weight: 1,
          },
          {
            label: "Question 2",
            answer: "text",
          },
        ],
      },
    ],
  });
});

test("omits AI form responses when categories are empty", () => {
  assert.equal(buildFormResponsesForAi({ categories: [] }), null);
  assert.equal(buildFormResponsesForAi({}), null);
});
