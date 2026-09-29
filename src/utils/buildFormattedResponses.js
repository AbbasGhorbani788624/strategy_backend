//helper

function calculateOverallScore(categoryScores) {
  const scores = Object.values(categoryScores)
    .filter((item) => {
      return item.totalWeight > 0 && item.score != null;
    })
    .map((item) => item.score);

  return average(scores);
}

function buildFormattedResponsesInternal(form, answers) {
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

function buildFormattedResponses(form, answers, options = {}) {
  const formatted = buildFormattedResponsesInternal(form, answers);

  if (options.keepInternalFields) {
    return formatted;
  }

  return canonicalizeProjectFormResponses(formatted);
}

function isInternalIdKey(key) {
  if (key === "id") return true;
  return key.length > 2 && key.endsWith("Id");
}

function stripAnswerForAi(answer) {
  if (answer == null || typeof answer !== "object") {
    return answer;
  }

  if (Array.isArray(answer)) {
    return answer.map(stripAnswerForAi);
  }

  const cleaned = {};

  for (const [key, value] of Object.entries(answer)) {
    if (key === "score" || isInternalIdKey(key)) {
      continue;
    }

    cleaned[key] = stripAnswerForAi(value);
  }

  return cleaned;
}

function isMultiPersonCollectAllAnswer(answer) {
  return (
    answer &&
    typeof answer === "object" &&
    Array.isArray(answer.responses)
  );
}

function isRadioCollectAllAnswer(answer) {
  if (!isMultiPersonCollectAllAnswer(answer)) {
    return false;
  }

  return answer.responses.some(
    (entry) => entry && (entry.label != null || entry.value != null),
  );
}

function formatCollectAllResponsesForAi(answer, { includeOptionFields }) {
  return {
    responses: answer.responses.map((entry) => {
      const formatted = {
        displayName: entry.displayName || "Respondent",
      };

      if (includeOptionFields) {
        formatted.label = entry.label ?? "";
        formatted.value = entry.value;
      } else {
        formatted.text = entry.text ?? "";
      }

      return formatted;
    }),
  };
}

function formatAnswerForAi(question) {
  const answer = question.answer;
  const unscoredQuestion = question.score == null;

  if (unscoredQuestion && isRadioCollectAllAnswer(answer)) {
    return formatCollectAllResponsesForAi(answer, {
      includeOptionFields: true,
    });
  }

  if (unscoredQuestion && isMultiPersonCollectAllAnswer(answer)) {
    return formatCollectAllResponsesForAi(answer, {
      includeOptionFields: false,
    });
  }

  if (isRadioCollectAllAnswer(answer)) {
    return answer.responses
      .map((entry) => {
        const name = entry.displayName || "Respondent";
        const label = entry.label ?? entry.value ?? "";
        return `${name}: ${label}`;
      })
      .join("\n\n");
  }

  if (isMultiPersonCollectAllAnswer(answer)) {
    return answer.responses
      .map((entry) => {
        const name = entry.displayName || "Respondent";
        return `${name}: ${entry.text ?? ""}`;
      })
      .join("\n\n");
  }

  return stripAnswerForAi(answer);
}

function formatQuestionForAi(question) {
  const formatted = {
    label: question.label,
    answer: formatAnswerForAi(question),
  };

  if (question.score != null) {
    formatted.score = question.score;
  }

  if (
    question.score != null &&
    question.weight != null &&
    question.weight !== 0
  ) {
    formatted.weight = question.weight;
  }

  return formatted;
}

function formatCategoryForAi(category) {
  const formatted = {
    title: category.title,
    questions: (category.questions || []).map(formatQuestionForAi),
  };

  if (category.score != null) {
    formatted.score = category.score;
  }

  const children = category.children || [];

  if (children.length > 0) {
    formatted.children = children.map(formatCategoryForAi);
  }

  return formatted;
}

function buildFormResponsesForAi(formResponses = {}) {
  const categories = formResponses.categories || [];

  if (categories.length === 0) return null;

  const payload = {
    categories: categories.map(formatCategoryForAi),
  };

  if (formResponses.overallScore != null) {
    payload.overallScore = formResponses.overallScore;
  }

  return payload;
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

function canonicalizeTextAnswerForStorage(answer) {
  if (!isMultiPersonCollectAllAnswer(answer)) {
    return answer;
  }

  return {
    responses: answer.responses.map((entry) => ({
      displayName: entry.displayName || "Respondent",
      text: entry.text ?? "",
    })),
  };
}

function canonicalizeRadioAnswerForStorage(answer) {
  if (isRadioCollectAllAnswer(answer)) {
    return {
      responses: answer.responses.map((entry) => ({
        displayName: entry.displayName || "Respondent",
        label: entry.label ?? "",
        value: entry.value,
      })),
    };
  }

  if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
    return answer;
  }

  const { score, ...rest } = answer;
  return rest;
}

function canonicalizeQuestionForStorage(question) {
  const stored = {
    label: question.label,
    answer: question.answer ?? null,
  };

  if (question.isScored === true) {
    stored.isScored = true;
  }

  if (question.type === "TEXT") {
    stored.answer = canonicalizeTextAnswerForStorage(question.answer);
  } else if (question.type === "RADIO") {
    stored.answer = canonicalizeRadioAnswerForStorage(question.answer);
  }

  if (question.score != null) {
    stored.score = question.score;
  }

  if (question.weight != null && question.weight !== 0) {
    stored.weight = question.weight;
  }

  return stored;
}

function canonicalizeCategoryForStorage(category) {
  const stored = {
    title: category.title,
    questions: (category.questions || []).map(canonicalizeQuestionForStorage),
  };

  if (category.score != null) {
    stored.score = category.score;
  }

  const children = (category.children || []).map(canonicalizeCategoryForStorage);

  if (children.length > 0) {
    stored.children = children;
  }

  return stored;
}

function canonicalizeProjectFormResponses(formResponses) {
  if (!formResponses || typeof formResponses !== "object") {
    return formResponses;
  }

  const stored = {
    categories: (formResponses.categories || []).map(canonicalizeCategoryForStorage),
  };

  if (formResponses.overallScore != null) {
    stored.overallScore = formResponses.overallScore;
  }

  return stored;
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
  canonicalizeProjectFormResponses,
  findSelectedOption,
  hasScore,
  round,
  average,
  calculateOverallScore,
  isValidScore,
  buildCategory,
  flattenQuestions,
};
