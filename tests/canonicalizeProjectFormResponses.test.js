const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canonicalizeProjectFormResponses,
  buildFormResponsesForAi,
} = require("../src/utils/buildFormattedResponses");

test("canonicalizeProjectFormResponses matches self-fill shape for RADIO", () => {
  const result = canonicalizeProjectFormResponses({
    categoryCount: 1,
    overallScore: 3,
    categories: [
      {
        id: "cat-1",
        title: "Cat",
        score: 3,
        questions: [
          {
            id: "q1",
            label: "رضایت کلی",
            type: "RADIO",
            isScored: true,
            score: 3,
            weight: 10,
            answer: {
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

  assert.deepEqual(result.categories[0].questions[0], {
    label: "رضایت کلی",
    isScored: true,
    score: 3,
    weight: 10,
    answer: {
      label: "متوسط",
      value: "sat_medium",
    },
  });
  assert.equal("type" in result.categories[0].questions[0], false);
  assert.equal("id" in result.categories[0], false);
  assert.equal("id" in result.categories[0].questions[0], false);
  assert.equal("children" in result.categories[0], false);
  assert.equal("aggregation" in result.categories[0].questions[0], false);
});

test("buildFormResponsesForAi formats canonical TEXT aggregate for AI", () => {
  const ai = buildFormResponsesForAi(
    canonicalizeProjectFormResponses({
      categoryCount: 1,
      categories: [
        {
          id: "cat-1",
          title: "Cat",
          questions: [
            {
              id: "q1",
              label: "پیشنهاد",
              type: "TEXT",
              isScored: false,
              weight: null,
              score: null,
              answer: {
                responses: [
                  { displayName: "علی", text: "آموزش بیشتر" },
                  { displayName: "مریم", text: "CRM یکپارچه" },
                ],
              },
            },
          ],
          children: [],
        },
      ],
    }),
  );

  assert.deepEqual(ai.categories[0].questions[0].answer, {
    responses: [
      { displayName: "علی", text: "آموزش بیشتر" },
      { displayName: "مریم", text: "CRM یکپارچه" },
    ],
  });
  assert.equal("score" in ai.categories[0].questions[0], false);
  assert.equal("weight" in ai.categories[0].questions[0], false);
});
