//helper

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

  return {
    categoryCount: Object.keys(categoryScores).length,
    overallScore: calculateOverallScore(categoryScores),

    categories,
  };
}

function buildFormResponsesForAi(formResponses = {}) {
  const categories = formResponses.categories || [];

  if (categories.length === 0) return null;

  const formatCategory = (category) => ({
    title: category.title,
    ...(category.score != null ? { score: category.score } : {}),
    questions: (category.questions || []).map((question) => ({
      label: question.label,
      answer: question.answer,
      ...(question.score != null ? { score: question.score } : {}),
      ...(question.weight != null ? { weight: question.weight } : {}),
    })),
    ...((category.children || []).length > 0
      ? { children: category.children.map(formatCategory) }
      : {}),
  });

  return {
    ...(formResponses.overallScore != null
      ? { overallScore: formResponses.overallScore }
      : {}),
    categories: categories.map(formatCategory),
  };
}

function findSelectedOption(question, answer) {
  if (answer == null) return null;

  const matchesOptionValue = (optionValue, selectedValue) =>
    optionValue != null &&
    selectedValue != null &&
    String(optionValue) === String(selectedValue);

  if (question.type === "RADIO") {
    const selectedValue =
      typeof answer === "object" && !Array.isArray(answer)
        ? answer.value
        : answer;

    return (question.options || []).find((option) =>
      matchesOptionValue(option.value, selectedValue),
    );
  }

  if (question.type === "CHECKBOX") {
    const selectedValues = Array.isArray(answer)
      ? answer.map((item) =>
          typeof item === "object" && item !== null ? item.value : item,
        )
      : [];

    return (question.options || []).filter((option) =>
      selectedValues.some((value) => matchesOptionValue(option.value, value)),
    );
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

function isValidScore(score) {
  return Number.isFinite(score) && score >= 1 && score <= 5;
}

function buildCategory(category, answers = {}, categoryScores) {
  let weightedScore = 0;
  let totalWeight = 0;

  const questions = (category.questions || []).map((question) => {
    const answer = answers[question.id] ?? null;
    const selectedOption = findSelectedOption(question, answer);

    let selected = null;
    let score = null;

    if (question.type === "RADIO") {
      if (selectedOption) {
        selected = {
          label: selectedOption.label,
          value: selectedOption.value,
        };

        if (isValidScore(selectedOption.score)) {
          selected.score = selectedOption.score;
          score = selectedOption.score;
        }

        if (question.weight > 0 && score != null) {
          weightedScore += question.weight * score;
          totalWeight += question.weight;
        }
      }
    } else if (question.type === "CHECKBOX") {
      selected = [];

      let scoreSum = 0;
      let scoreCount = 0;

      for (const option of selectedOption || []) {
        const item = {
          label: option.label,
          value: option.value,
        };

        if (isValidScore(option.score)) {
          item.score = option.score;
          scoreSum += option.score;
          scoreCount++;
        }

        selected.push(item);
      }

      if (scoreCount > 0) {
        score = round(scoreSum / scoreCount);
      }

      if (question.weight > 0 && isValidScore(score)) {
        weightedScore += question.weight * score;
        totalWeight += question.weight;
      }
    } else if (question.type === "TEXT") {
      selected =
        typeof answer === "string" && answer.trim() ? answer.trim() : null;
    } else if (question.type === "NUMBER") {
      selected = answer !== null && answer !== "" ? Number(answer) : null;
    }

    return {
      id: question.id,
      label: question.label,
      type: question.type,
      isScored: question.isScored,
      score,
      weight: question.weight,
      answer: selected,
    };
  });

  const children = (category.children || []).map((child) =>
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
  buildFormResponsesForAi,
  findSelectedOption,
  hasScore,
  round,
  average,
  buildCategory,
  flattenQuestions,
};
