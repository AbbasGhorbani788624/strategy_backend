const { enqueueConversationStep } = require("./conversation.queue.service");

/**
 * Shared entry point for starting AI analysis processing via the conversation queue.
 */
const startAnalysisProcessing = async ({
  projectId,
  user,
  source,
  userInput = "",
  understood = false,
}) => {
  const result = await enqueueConversationStep({
    projectId,
    user,
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
  user,
  userInput = "",
  understood = false,
}) => {
  return startAnalysisProcessing({
    projectId,
    user,
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
