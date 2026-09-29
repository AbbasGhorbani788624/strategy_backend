function buildAggregatePreviewResponse(aggregateResult) {
  return {
    aggregateStatus: aggregateResult.aggregateStatus ?? "READY",
    totalSubmittedPool: aggregateResult.totalSubmittedPool,
    formResponses: aggregateResult.formResponses ?? null,
    questions: null,
  };
}

module.exports = {
  buildAggregatePreviewResponse,
};
