const prisma = require("../prismaClient");

const DEFAULT_ANALYSIS_ERROR_MESSAGE = "تحلیل با خطا مواجه شد";

const markProjectAnalysisFailed = async (projectId) => {
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: "FAILED",
    },
  });
};

const buildAnalysisStatusPayload = (project) => {
  if (project.status === "AI_PROCESSING") {
    return { status: project.status };
  }

  if (project.status === "FAILED") {
    return {
      status: project.status,
      errorMessage: DEFAULT_ANALYSIS_ERROR_MESSAGE,
    };
  }

  return {
    status: project.status,
    initialAnalysis: project.initialAnalysis,
    finalAnalysis: project.finalAnalysis,
    summaryAnalysis: project.summaryAnalysis,
    riskPercentage: project.riskPercentage,
  };
};

module.exports = {
  DEFAULT_ANALYSIS_ERROR_MESSAGE,
  markProjectAnalysisFailed,
  buildAnalysisStatusPayload,
};
