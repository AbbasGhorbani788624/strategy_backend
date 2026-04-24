const { createBadRequestError } = require("../utils");
const prisma = require("../prismaClient");

const {
  createProjectWithDetails,
  getProjectById,
  createProjectFromStepSession,
  getAllProjects,
} = require("../repositories/projectRepository");
const { getFormById } = require("../repositories/analysisFormRepository");

const getAllProjectsService = async (userId, userRole, companyId, query) => {
  const projects = await getAllProjects(userId, userRole, companyId, query);
  return projects;
};

const getProjectService = async (projectId, userId, userRole, companyId) => {
  const project = await getProjectById(projectId, userId, userRole, companyId);
  return project;
};

const saveProjectService = async (currentUser, body) => {
  const { title, formId, analysis, mode, messages, answers } = body;

  // بررسی وجود فرم
  const formExists = await getFormById(formId);

  if (!formExists) {
    createBadRequestError("فرم یافت نشد", 404);
  }

  // ساخت پروژه
  await createProjectWithDetails(currentUser, {
    title,
    formId,
    analysis,
    mode,
    messages,
    answers,
  });
};

const createProjectFromStepService = async (currentUser, body) => {
  const { sessionId, title, messages } = body;

  // بررسی وجود جلسه
  const session = await prisma.stepSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw createBadRequestError("جلسه یافت نشد", 404);
  }

  if (session.userId !== currentUser.id) {
    throw createBadRequestError("دسترسی غیرمجاز", 403);
  }

  if (session.status !== "COMPLETED") {
    throw createBadRequestError("تحلیل نهایی هنوز تکمیل نشده", 400);
  }

  // ساخت پروژه
  await createProjectFromStepSession({
    sessionId,
    title,
    messages,
    creatorId: currentUser.id,
    companyId: currentUser.companyId,
  });
};

module.exports = {
  saveProjectService,
  createProjectFromStepService,
  getAllProjectsService,
  getProjectService,
};
