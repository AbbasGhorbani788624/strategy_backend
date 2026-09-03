const isMultiRequiredItem = (item) => item?.type === "MULTI";

const getRequiredItemKey = (item) => {
  if (isMultiRequiredItem(item)) {
    return `multi:${item.requiredMultiAnalysisFormId}`;
  }

  return `single:${item.formId}`;
};

const getSelectionKey = (selection) => {
  if (selection?.multiAnalysisFormId) {
    return `multi:${selection.multiAnalysisFormId}`;
  }

  if (selection?.formId) {
    return `single:${selection.formId}`;
  }

  return null;
};

const getRequiredItemTitle = (item) => {
  if (isMultiRequiredItem(item)) {
    return item.requiredMultiAnalysisForm?.title ?? null;
  }

  return item.form?.title ?? null;
};

const buildCompletedProjectWhereForRequiredItem = (item, baseWhere) => {
  if (isMultiRequiredItem(item)) {
    return {
      ...baseWhere,
      mode: "MULTI",
      multiAnalysisFormId: item.requiredMultiAnalysisFormId,
    };
  }

  return {
    ...baseWhere,
    mode: "SINGLE",
    formId: item.formId,
  };
};

const isRequiredItemCompleted = (item, completedFormIds, completedMultiFormIds) => {
  if (isMultiRequiredItem(item)) {
    return completedMultiFormIds.has(item.requiredMultiAnalysisFormId);
  }

  return completedFormIds.has(item.formId);
};

const matchesSelectedProject = (selected, sourceProject) => {
  if (selected.multiAnalysisFormId) {
    return (
      sourceProject.mode === "MULTI" &&
      sourceProject.multiAnalysisFormId === selected.multiAnalysisFormId
    );
  }

  if (selected.formId) {
    return (
      sourceProject.mode === "SINGLE" &&
      sourceProject.formId === selected.formId
    );
  }

  return false;
};

module.exports = {
  isMultiRequiredItem,
  getRequiredItemKey,
  getSelectionKey,
  getRequiredItemTitle,
  buildCompletedProjectWhereForRequiredItem,
  isRequiredItemCompleted,
  matchesSelectedProject,
};
