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
  if (
    project.status === "AI_PROCESSING" ||
    project.status === "ANALYSIS_PENDING"
  ) {
    return { status: "AI_PROCESSING" };
  }

  if (project.status === "FAILED") {
    return {
      status: "FAILED",
      error: DEFAULT_ANALYSIS_ERROR_MESSAGE,
      errorMessage: DEFAULT_ANALYSIS_ERROR_MESSAGE,
    };
  }

  if (project.status === "FINAL_ANALYSIS") {
    const analysis = {
      finalAnalysis: project.finalAnalysis,
      summaryAnalysis: project.summaryAnalysis,
      riskPercentage: project.riskPercentage,
    };

    return {
      // Schema enum uses FINAL_ANALYSIS (there is no COMPLETED status).
      status: "FINAL_ANALYSIS",
      analysis,
      initialAnalysis: project.initialAnalysis,
      finalAnalysis: project.finalAnalysis,
      summaryAnalysis: project.summaryAnalysis,
      riskPercentage: project.riskPercentage,
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
