const { successResponse } = require("../utils/responses");
const {
  openFormCollaborationService,
  getCollaborationDetailService,
  submitMyCollaborationResponseService,
  createDelegationsService,
  listFormDelegationInboxService,
  getFormDelegationInboxItemService,
  markDelegationViewedService,
  getAggregatePreviewService,
  applyAggregatedFormService,
} = require("../services/formCollaborationService");
const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

exports.openFormCollaboration = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const result = await openFormCollaborationService(
      projectId,
      req.user.id,
      req.body,
    );
    const { created, ...data } = result;
    return successResponse(res, created ? 201 : 200, data);
  } catch (error) {
    next(error);
  }
};

exports.getFormCollaboration = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const result = await getCollaborationDetailService(projectId, req.user.id);
    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};

exports.submitMyCollaborationResponse = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const { answers, submit = true } = req.body || {};
    const result = await submitMyCollaborationResponseService(
      projectId,
      req.user.id,
      answers,
      { submit: submit !== false },
    );
    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};

exports.createDelegations = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const { assigneeIds, mode, message, dueAt, snapshotResponses } =
      req.body || {};

    const result = await createDelegationsService(projectId, req.user.id, {
      assigneeIds,
      mode,
      message,
      dueAt,
      snapshotResponses,
    });

    return successResponse(res, 201, result);
  } catch (error) {
    next(error);
  }
};

exports.getAggregatePreview = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const result = await getAggregatePreviewService(projectId, req.user.id);
    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};

exports.applyAggregatedForm = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const result = await applyAggregatedFormService(projectId, req.user.id);
    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};

exports.listFormDelegationInbox = async (req, res, next) => {
  try {
    const result = await listFormDelegationInboxService(
      req.user.id,
      req.query,
    );
    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};

exports.getFormDelegationInboxItem = async (req, res, next) => {
  try {
    const result = await getFormDelegationInboxItemService(
      req.params.delegationId,
      req.user.id,
      req.user.companyId,
    );

    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};

exports.prepareReadOnlyDelegationSnapshot = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        creatorId: true,
        formResponses: true,
        status: true,
      },
    });

    if (!project) {
      createBadRequestError("پروژه یافت نشد", 404);
    }

    if (project.creatorId !== req.user.id) {
      createBadRequestError("دسترسی مجاز نیست.", 403);
    }

    return successResponse(res, 200, {
      snapshotResponses: project.formResponses ?? null,
    });
  } catch (error) {
    next(error);
  }
};
