const DEFAULT_MOCK_SUGGESTED_ACTIONS = [
  {
    title: "تعریف اهداف و دامنه پروژه",
  },
  {
    title: "تحلیل وضعیت موجود",
  },
 
];

const isProjectPlanMockEnabled = () =>
  process.env.PROJECT_PLAN_MOCK === "true" ||
  process.env.PROJECT_PLAN_MOCK === "1" ||
  process.env.NODE_ENV !== "production";

const shouldSeedSuggestedPlanActions = () =>
  isProjectPlanMockEnabled() || !process.env.PROJECT_PLAN_AI_URL;

const getMockSuggestedPlanActions = (project = {}) => {
  const projectTitle = project.title?.trim();

  if (!projectTitle) {
    return DEFAULT_MOCK_SUGGESTED_ACTIONS.map((action) => ({ ...action }));
  }

  return DEFAULT_MOCK_SUGGESTED_ACTIONS.map((action, index) => ({
    title: action.title,
    description:
      index === 0
        ? `اقدام پیشنهادی برای پروژه «${projectTitle}»`
        : action.description,
  }));
};

module.exports = {
  DEFAULT_MOCK_SUGGESTED_ACTIONS,
  isProjectPlanMockEnabled,
  shouldSeedSuggestedPlanActions,
  getMockSuggestedPlanActions,
};
