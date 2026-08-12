const { enqueueConversationStep } = require("./conversation.queue.service");

/**
 * Shared entry point for starting AI analysis processing via the conversation queue.
 */
const startAnalysisProcessing = async ({
  projectId,
  userId,
  source,
  userInput = "",
  understood = false,
}) => {
  const result = await enqueueConversationStep({
    projectId,
    userId,
    userInput,
    understood,
    source,
  });

  return {
    jobId: result.jobId,
    status: result.status || "AI_PROCESSING",
    deduplicated: Boolean(result.deduplicated),
  };
};

/**
 * Business-layer handler for the conversation-step HTTP endpoint.
 */
const processConversationStepService = async ({
  projectId,
  userId,
  userInput = "",
  understood = false,
}) => {
  return startAnalysisProcessing({
    projectId,
    userId,
    userInput,
    understood,
    source:
      "analysisProcessor.processConversationStepService:POST /analysis-form/:id",
  });
};

module.exports = {
  startAnalysisProcessing,
  processConversationStepService,
};
