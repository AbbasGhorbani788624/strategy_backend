//helper

function calculateGroupScores(categoryGroups, categoryScores) {
  return categoryGroups.map((group) => {
    const scores = [];

    const categories = group.categories.map((item) => {
      const category = categoryScores[item.category.id];

      if (category?.score != null) {
        scores.push(category.score);
      }

      return {
        id: item.category.id,
        title: item.category.title,
        score: category?.score ?? null,
      };
    });

    return {
      id: group.id,
      title: group.title,

      categoryCount: scores.length,

      score: average(scores),

      categories,
    };
  });
}

function calculateOverallScore(categoryScores) {
  const scores = Object.values(categoryScores)
    .filter((item) => {
      return item.totalWeight > 0 && item.score != null;
    })
    .map((item) => item.score);

  return average(scores);
}

function buildFormattedResponses(form, answers) {
  const categoryScores = {};

  const categories = form.categories.map((category) =>
    buildCategory(category, answers, categoryScores),
  );

  const groups = calculateGroupScores(form.categoryGroups, categoryScores);

  return {
    categoryCount: Object.keys(categoryScores).length,

    groups,

    categories,
  };
}

function findSelectedOption(question, answer) {
  if (answer == null) return null;

  if (question.type === "RADIO") {
    return question.options.find((option) => option.value === answer);
  }

  if (question.type === "CHECKBOX") {
    return question.options.filter((option) => answer.includes(option.value));
  }

  return null;
}

function hasScore(option) {
  return option && option.score !== null && option.score !== undefined;
}

function round(number) {
  return Number(number.toFixed(2));
}

function average(list) {
  if (!list.length) return null;

  return round(list.reduce((sum, item) => sum + item, 0) / list.length);
}

function buildCategory(category, answers, categoryScores) {
  let weightedScore = 0;
  let totalWeight = 0;

  const questions = category.questions.map((question) => {
    const answer = answers[question.id];
    const selectedOption = findSelectedOption(question, answer);

    let selected = null;

    // ===========================
    // RADIO
    // ===========================
    if (question.type === "RADIO") {
      if (selectedOption) {
        selected = {
          label: selectedOption.label,
          value: selectedOption.value,
        };

        if (hasScore(selectedOption)) {
          selected.score = selectedOption.score;
        }

        if (question.weight != null && hasScore(selectedOption)) {
          weightedScore += question.weight * selectedOption.score;

          totalWeight += question.weight;
        }
      }
    }

    // ===========================
    // CHECKBOX
    // ===========================
    if (question.type === "CHECKBOX") {
      selected = [];

      let scoreSum = 0;
      let scoreCount = 0;

      for (const option of selectedOption || []) {
        const item = {
          label: option.label,
          value: option.value,
        };

        if (hasScore(option)) {
          item.score = option.score;

          scoreSum += option.score;
          scoreCount++;
        }

        selected.push(item);
      }

      if (question.weight != null && scoreCount > 0) {
        const averageScore = scoreSum / scoreCount;

        weightedScore += question.weight * averageScore;

        totalWeight += question.weight;
      }
    }

    return {
      id: question.id,
      label: question.label,
      type: question.type,
      isScored: question.isScored,
      weight: question.weight,
      answer: selected,
    };
  });

  const children = category.children.map((child) =>
    buildCategory(child, answers, categoryScores),
  );

  const score = totalWeight > 0 ? round(weightedScore / totalWeight) : null;

  categoryScores[category.id] = {
    id: category.id,
    title: category.title,
    score,
    totalWeight,
    weightedScore,
  };
  return {
    id: category.id,
    title: category.title,
    score,
    questions,
    children,
  };
}

function flattenQuestions(categories) {
  const questions = [];
  const questionMap = new Map();

  function walk(items = []) {
    for (const category of items) {
      for (const question of category.questions || []) {
        questions.push(question);
        questionMap.set(question.id, question);
      }

      if (category.children?.length) {
        walk(category.children);
      }
    }
  }

  walk(categories);

  return {
    questions,
    questionMap,
    questionIdSet: new Set(questionMap.keys()),
  };
}

module.exports = {
  buildFormattedResponses,
  findSelectedOption,
  hasScore,
  round,
  average,
  buildCategory,
  flattenQuestions,
};
