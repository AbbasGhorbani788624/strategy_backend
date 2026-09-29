const {
  average,
  isValidScore,
  flattenQuestions,
} = require("./buildFormattedResponses");
const { rollupScoresFromFormattedCategories } = require("./rollupScoresFromFormattedCategories");
const { canonicalizeProjectFormResponses } = require("./buildFormattedResponses");

function questionHasScorableOptions(question) {
  if (question.type !== "RADIO" && question.type !== "CHECKBOX") {
    return false;
  }

  return (question.options || []).some((option) => isValidScore(option.score));
}

function getRadioValueKey(answer) {
  if (answer == null) return null;

  if (typeof answer === "object" && !Array.isArray(answer)) {
    return answer.value != null ? String(answer.value) : null;
  }

  return String(answer);
}

function isQuestionSkipped(question, rawAnswer) {
  if (rawAnswer === undefined || rawAnswer === null) {
    return true;
  }

  if (question.type === "TEXT") {
    return typeof rawAnswer !== "string" || !rawAnswer.trim();
  }

  if (question.type === "NUMBER") {
    if (rawAnswer === "") return true;
    const num = Number(rawAnswer);
    return !Number.isFinite(num);
  }

  if (question.type === "RADIO") {
    return getRadioValueKey(rawAnswer) == null;
  }

  if (question.type === "CHECKBOX") {
    return !Array.isArray(rawAnswer) || rawAnswer.length === 0;
  }

  return true;
}

function findFormattedQuestion(formattedResponses, questionId) {
  let found = null;

  function walk(categories = []) {
    for (const category of categories) {
      for (const question of category.questions || []) {
        if (question.id === questionId) {
          found = question;
          return;
        }
      }

      if (category.children?.length) {
        walk(category.children);
      }

      if (found) return;
    }
  }

  walk(formattedResponses?.categories || []);
  return found;
}

function getPersonQuestionScore(submission, questionId) {
  const formattedQuestion = findFormattedQuestion(
    submission.formattedResponses,
    questionId,
  );

  if (!formattedQuestion || formattedQuestion.score == null) {
    return null;
  }

  const score = Number(formattedQuestion.score);
  return Number.isFinite(score) ? score : null;
}

function getCheckboxValueKeys(rawAnswer) {
  if (!Array.isArray(rawAnswer)) return [];

  return rawAnswer.map((item) =>
    typeof item === "object" && item !== null && item.value != null
      ? String(item.value)
      : String(item),
  );
}

function radioAnswerFromOption(option) {
  if (!option) {
    return null;
  }

  return {
    label: option.label,
    value: option.value,
  };
}

function roundMeanScore(scores) {
  if (!scores.length) {
    return null;
  }

  const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return Math.round(mean);
}

function findOptionByExactScore(question, score) {
  const matches = (question.options || []).filter(
    (option) =>
      option.score != null && Number(option.score) === Number(score),
  );

  if (!matches.length) {
    return null;
  }

  return matches.sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  )[0];
}

function aggregateRadioScored(question, entries) {
  const validEntries = entries.filter((entry) => !entry.skipped);
  const responsesCount = validEntries.length;

  const breakdown = entries.map((entry) => ({
    respondentId: entry.submission.respondentId,
    displayName: entry.displayName,
    answer: entry.rawAnswer,
    score: getPersonQuestionScore(entry.submission, question.id),
    skipped: entry.skipped,
  }));

  if (responsesCount === 0) {
    return {
      aggregationStatus: "NO_VALID_RESPONSES",
      aggregationMethod: "MEAN_SCORE_ROUNDED",
      score: null,
      answer: null,
      responsesCount,
      breakdown,
      tiedValues: [],
    };
  }

  const scores = validEntries
    .map((entry) => getPersonQuestionScore(entry.submission, question.id))
    .filter((score) => score != null);

  const roundedScore = roundMeanScore(scores);
  const option =
    roundedScore != null
      ? findOptionByExactScore(question, roundedScore)
      : null;

  return {
    aggregationStatus: "OK",
    aggregationMethod: "MEAN_SCORE_ROUNDED",
    score: roundedScore,
    answer: radioAnswerFromOption(option),
    responsesCount,
    breakdown,
    tiedValues: [],
  };
}

function aggregateRadioCollectAll(question, entries) {
  const responses = entries
    .filter((entry) => !entry.skipped)
    .map((entry) => {
      const key = getRadioValueKey(entry.rawAnswer);
      const option = (question.options || []).find(
        (item) => String(item.value) === key,
      );

      return {
        displayName: entry.displayName,
        label: option?.label ?? key ?? "",
        value: option?.value ?? key,
      };
    });

  const breakdown = entries.map((entry) => ({
    respondentId: entry.submission.respondentId,
    displayName: entry.displayName,
    answer: entry.rawAnswer,
    score: null,
    skipped: entry.skipped,
  }));

  return {
    aggregationStatus: responses.length ? "OK" : "NO_VALID_RESPONSES",
    aggregationMethod: "COLLECT_ALL",
    score: null,
    answer: {
      aggregationMethod: "COLLECT_ALL",
      responses,
    },
    responsesCount: responses.length,
    breakdown,
    tiedValues: [],
  };
}

function aggregateCheckboxScored(question, entries) {
  const personScores = entries
    .filter((entry) => !entry.skipped)
    .map((entry) => getPersonQuestionScore(entry.submission, question.id))
    .filter((score) => score != null);

  const responsesCount = personScores.length;

  const breakdown = entries.map((entry) => ({
    respondentId: entry.submission.respondentId,
    displayName: entry.displayName,
    answer: entry.rawAnswer,
    score: getPersonQuestionScore(entry.submission, question.id),
    skipped: entry.skipped,
  }));

  if (responsesCount === 0) {
    return {
      aggregationStatus: "NO_VALID_RESPONSES",
      aggregationMethod: "MEAN_SCORE",
      score: null,
      answer: [],
      responsesCount,
      breakdown,
    };
  }

  const questionScore = average(personScores);

  const optionCounts = new Map();

  for (const entry of entries.filter((item) => !item.skipped)) {
    const keys = getCheckboxValueKeys(entry.rawAnswer);

    for (const key of keys) {
      optionCounts.set(key, (optionCounts.get(key) || 0) + 1);
    }
  }

  const threshold = responsesCount / 2;
  const selectedValues = [...optionCounts.entries()]
    .filter(([, count]) => count > threshold)
    .map(([value]) => value);

  const answer = selectedValues.map((value) => {
    const option = (question.options || []).find(
      (item) => String(item.value) === value,
    );

    if (!option) {
      return { value };
    }

    const item = { label: option.label, value: option.value };

    if (isValidScore(option.score)) {
      item.score = Number(option.score);
    }

    return item;
  });

  return {
    aggregationStatus: "OK",
    aggregationMethod: "MEAN_SCORE",
    score: questionScore,
    answer,
    responsesCount,
    breakdown,
  };
}

function aggregateCheckboxMajority(question, entries) {
  const validEntries = entries.filter((entry) => !entry.skipped);
  const responsesCount = validEntries.length;

  const breakdown = entries.map((entry) => ({
    respondentId: entry.submission.respondentId,
    displayName: entry.displayName,
    answer: entry.rawAnswer,
    score: null,
    skipped: entry.skipped,
  }));

  if (responsesCount === 0) {
    return {
      aggregationStatus: "NO_VALID_RESPONSES",
      aggregationMethod: "PER_OPTION_MAJORITY",
      score: null,
      answer: [],
      responsesCount,
      breakdown,
    };
  }

  const optionCounts = new Map();

  for (const entry of validEntries) {
    const keys = getCheckboxValueKeys(entry.rawAnswer);

    for (const key of keys) {
      optionCounts.set(key, (optionCounts.get(key) || 0) + 1);
    }
  }

  const threshold = responsesCount / 2;
  const selectedValues = [...optionCounts.entries()]
    .filter(([, count]) => count > threshold)
    .map(([value]) => value);

  const answer = selectedValues.map((value) => {
    const option = (question.options || []).find(
      (item) => String(item.value) === value,
    );

    return option
      ? { label: option.label, value: option.value }
      : { value };
  });

  return {
    aggregationStatus: "OK",
    aggregationMethod: "PER_OPTION_MAJORITY",
    score: null,
    answer,
    responsesCount,
    breakdown,
  };
}

function aggregateNumber(question, entries) {
  const values = entries
    .filter((entry) => !entry.skipped)
    .map((entry) => Number(entry.rawAnswer))
    .filter((value) => Number.isFinite(value));

  const responsesCount = values.length;
  const totalSubmittedPool = entries.length;

  const breakdown = entries.map((entry) => ({
    respondentId: entry.submission.respondentId,
    displayName: entry.displayName,
    answer: entry.rawAnswer,
    score: null,
    skipped: entry.skipped,
  }));

  if (responsesCount === 0) {
    return {
      aggregationStatus: "NO_VALID_RESPONSES",
      aggregationMethod: "MEAN",
      score: null,
      answer: null,
      responsesCount,
      totalSubmittedPool,
      breakdown,
    };
  }

  const mean = average(values);

  return {
    aggregationStatus: "OK",
    aggregationMethod: "MEAN",
    score: null,
    answer: mean,
    responsesCount,
    totalSubmittedPool,
    breakdown,
    mean,
    validResponses: responsesCount,
  };
}

function aggregateText(entries) {
  const responses = entries
    .filter((entry) => !entry.skipped)
    .map((entry) => ({
      respondentId: entry.submission.respondentId,
      displayName: entry.displayName,
      text:
        typeof entry.rawAnswer === "string"
          ? entry.rawAnswer.trim()
          : String(entry.rawAnswer ?? ""),
      submittedAt: entry.submission.submittedAt,
    }));

  return {
    aggregationStatus: responses.length ? "OK" : "NO_VALID_RESPONSES",
    aggregationMethod: "COLLECT_ALL",
    score: null,
    answer: {
      aggregationMethod: "COLLECT_ALL",
      responses,
    },
    responsesCount: responses.length,
    breakdown: entries.map((entry) => ({
      respondentId: entry.submission.respondentId,
      displayName: entry.displayName,
      answer: entry.rawAnswer,
      score: null,
      skipped: entry.skipped,
    })),
  };
}

function aggregateQuestion(question, submissions) {
  const entries = submissions.map((submission) => {
    const rawAnswer = submission.rawAnswers?.[question.id];
    const skipped = isQuestionSkipped(question, rawAnswer);

    return {
      submission,
      displayName: submission.displayName,
      rawAnswer,
      skipped,
    };
  });

  if (question.type === "TEXT") {
    return { questionId: question.id, ...aggregateText(entries) };
  }

  if (question.type === "NUMBER") {
    return { questionId: question.id, ...aggregateNumber(question, entries) };
  }

  if (question.type === "RADIO") {
    if (questionHasScorableOptions(question)) {
      return {
        questionId: question.id,
        ...aggregateRadioScored(question, entries),
      };
    }

    return {
      questionId: question.id,
      ...aggregateRadioCollectAll(question, entries),
    };
  }

  if (question.type === "CHECKBOX") {
    if (questionHasScorableOptions(question)) {
      return {
        questionId: question.id,
        ...aggregateCheckboxScored(question, entries),
      };
    }

    return {
      questionId: question.id,
      ...aggregateCheckboxMajority(question, entries),
    };
  }

  return {
    questionId: question.id,
    aggregationStatus: "NO_VALID_RESPONSES",
    aggregationMethod: "UNKNOWN",
    score: null,
    answer: null,
    responsesCount: 0,
    breakdown: [],
  };
}

function buildAggregatedCategory(category, questionResultsMap) {
  const questions = (category.questions || []).map((question) => {
    const result = questionResultsMap.get(question.id);

    return {
      id: question.id,
      label: question.label,
      type: question.type,
      isScored: question.isScored,
      weight: question.weight,
      score: result?.score ?? null,
      answer: result?.answer ?? null,
    };
  });

  const children = (category.children || []).map((child) =>
    buildAggregatedCategory(child, questionResultsMap),
  );

  return {
    id: category.id,
    title: category.title,
    score: null,
    questions,
    children,
  };
}

function aggregateSubmissions(submissions, formSchema) {
  const { questions } = flattenQuestions(formSchema.categories || []);

  const questionResults = questions.map((question) =>
    aggregateQuestion(question, submissions),
  );

  const questionResultsMap = new Map(
    questionResults.map((result) => {
      const { questionId, ...rest } = result;
      return [questionId, rest];
    }),
  );

  const aggregatedCategories = (formSchema.categories || []).map((category) =>
    buildAggregatedCategory(category, questionResultsMap),
  );

  const formResponses = canonicalizeProjectFormResponses(
    rollupScoresFromFormattedCategories(aggregatedCategories),
  );

  return {
    aggregateStatus: "READY",
    formResponses,
    questions: questionResults,
    totalSubmittedPool: submissions.length,
  };
}

module.exports = {
  aggregateSubmissions,
  questionHasScorableOptions,
  isQuestionSkipped,
  findFormattedQuestion,
};
