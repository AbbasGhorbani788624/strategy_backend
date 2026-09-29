const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildFormattedResponses,
  buildFormResponsesForAi,
} = require("../src/utils/buildFormattedResponses");
const { aggregateSubmissions } = require("../src/utils/aggregateFormSubmissions");

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
  assert.equal(result.categories[0].questions[0].score, 5);
  assert.deepEqual(result.categories[0].questions[0].answer, {
    label: "five",
    value: "five",
  });
  assert.equal("score" in result.categories[0].questions[0].answer, false);
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

  assert.equal("score" in result.categories[0], false);
  assert.equal("overallScore" in result, false);
  assert.equal("children" in result.categories[0], false);
  assert.equal("id" in result.categories[0], false);
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

test("AI payload strips answer.score and internal ids from scored RADIO", () => {
  const result = buildFormResponsesForAi({
    formId: "form-hidden",
    overallScore: 3,
    categories: [
      {
        id: "cat-1",
        title: "ارزیابی سریع",
        score: 3,
        questions: [
          {
            id: "q1",
            questionId: "q1",
            type: "RADIO",
            label: "رضایت کلی",
            score: 3,
            weight: 10,
            answer: {
              id: "opt-1",
              optionId: "opt-1",
              label: "متوسط",
              value: "sat_medium",
              score: 3,
            },
            aggregation: { method: "MAJORITY", status: "OK" },
          },
        ],
        children: [],
      },
    ],
  });

  assert.deepEqual(result, {
    overallScore: 3,
    categories: [
      {
        title: "ارزیابی سریع",
        score: 3,
        questions: [
          {
            label: "رضایت کلی",
            answer: { label: "متوسط", value: "sat_medium" },
            score: 3,
            weight: 10,
          },
        ],
      },
    ],
  });
  assert.equal("score" in result.categories[0].questions[0].answer, false);
  assert.equal("id" in result.categories[0], false);
  assert.equal("children" in result.categories[0], false);
});

test("AI payload omits null score and weight on unscored questions", () => {
  const result = buildFormResponsesForAi({
    categories: [
      {
        title: "اطلاعات عمومی",
        score: null,
        questions: [
          {
            id: "q-branches",
            label: "تعداد شعب فعال",
            type: "NUMBER",
            score: null,
            weight: null,
            answer: 7,
          },
        ],
        children: [],
      },
    ],
  });

  assert.deepEqual(result, {
    categories: [
      {
        title: "اطلاعات عمومی",
        questions: [
          {
            label: "تعداد شعب فعال",
            answer: 7,
          },
        ],
      },
    ],
  });
  assert.equal("overallScore" in result, false);
  assert.equal("score" in result.categories[0], false);
});

test("AI payload omits weight zero", () => {
  const result = buildFormResponsesForAi({
    categories: [
      {
        title: "Cat",
        questions: [
          {
            label: "Q",
            type: "NUMBER",
            score: null,
            weight: 0,
            answer: 5,
          },
        ],
        children: [],
      },
    ],
  });

  assert.equal("weight" in result.categories[0].questions[0], false);
});

test("AI payload strips score from CHECKBOX answer items", () => {
  const result = buildFormResponsesForAi({
    categories: [
      {
        title: "Cat",
        score: 4,
        questions: [
          {
            label: "Topics",
            score: 4,
            weight: 5,
            answer: [
              { label: "A", value: "a", score: 4, optionId: "o1" },
              { label: "B", value: "b", score: 5, optionId: "o2" },
            ],
          },
        ],
        children: [],
      },
    ],
  });

  assert.deepEqual(result.categories[0].questions[0].answer, [
    { label: "A", value: "a" },
    { label: "B", value: "b" },
  ]);
});

test("AI RADIO COLLECT_ALL formats each respondent choice", () => {
  const result = buildFormResponsesForAi({
    categories: [
      {
        title: "Cat",
        questions: [
          {
            type: "RADIO",
            label: "Team",
            answer: {
              aggregationMethod: "COLLECT_ALL",
              responses: [
                { displayName: "علی", label: "خوب", value: "good" },
                { displayName: "مریم", label: "متوسط", value: "medium" },
              ],
            },
          },
        ],
      },
    ],
  });

  assert.deepEqual(result.categories[0].questions[0].answer, {
    responses: [
      { displayName: "علی", label: "خوب", value: "good" },
      { displayName: "مریم", label: "متوسط", value: "medium" },
    ],
  });
  assert.equal("weight" in result.categories[0].questions[0], false);
});

test("AI TEXT COLLECT_ALL uses displayName only without respondentId in payload", () => {
  const result = buildFormResponsesForAi({
    categories: [
      {
        title: "Cat",
        questions: [
          {
            type: "TEXT",
            label: "Note",
            answer: {
              aggregationMethod: "COLLECT_ALL",
              responses: [
                {
                  respondentId: "user-1",
                  displayName: "Ali",
                  text: "hello",
                },
              ],
            },
          },
        ],
        children: [],
      },
    ],
  });

  assert.deepEqual(result.categories[0].questions[0].answer, {
    responses: [{ displayName: "Ali", text: "hello" }],
  });
  assert.equal(JSON.stringify(result).includes("user-1"), false);
  assert.equal(JSON.stringify(result).includes("respondentId"), false);
});

test("Self-fill and aggregate RADIO stored question shape match", () => {
  const form = makeForm([
    {
      id: "q1",
      label: "رضایت کلی",
      type: "RADIO",
      isScored: true,
      weight: 10,
      options: [makeOption("med", 3)],
    },
  ]);

  const selfFillQuestion = buildFormattedResponses(form, { q1: "med" })
    .categories[0].questions[0];

  const aggregateQuestion = aggregateSubmissions(
    [
      {
        respondentId: "a",
        displayName: "a",
        rawAnswers: { q1: "med" },
        formattedResponses: buildFormattedResponses(form, { q1: "med" }, {
          keepInternalFields: true,
        }),
        submittedAt: new Date(),
      },
      {
        respondentId: "b",
        displayName: "b",
        rawAnswers: { q1: "med" },
        formattedResponses: buildFormattedResponses(form, { q1: "med" }, {
          keepInternalFields: true,
        }),
        submittedAt: new Date(),
      },
    ],
    form,
  ).formResponses.categories[0].questions[0];

  assert.deepEqual(aggregateQuestion, selfFillQuestion);
});
