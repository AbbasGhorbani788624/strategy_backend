const {
  round,
  calculateOverallScore,
  isValidScore,
} = require("./buildFormattedResponses");

function rollupCategory(category, categoryScores) {
  let weightedScore = 0;
  let totalWeight = 0;

  for (const question of category.questions || []) {
    const score = question.score;

    if (
      question.weight > 0 &&
      score != null &&
      Number.isFinite(score) &&
      isValidScore(score)
    ) {
      weightedScore += question.weight * score;
      totalWeight += question.weight;
    }
  }

  const children = (category.children || []).map((child) =>
    rollupCategory(child, categoryScores),
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
    questions: category.questions,
    children,
  };
}

function rollupScoresFromFormattedCategories(categories = []) {
  const categoryScores = {};

  const rolledCategories = categories.map((category) =>
    rollupCategory(category, categoryScores),
  );

  return {
    categoryCount: Object.keys(categoryScores).length,
    overallScore: calculateOverallScore(categoryScores),
    categories: rolledCategories,
  };
}

module.exports = {
  rollupScoresFromFormattedCategories,
};
