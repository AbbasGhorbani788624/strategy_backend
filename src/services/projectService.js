const { createBadRequestError } = require("../utils");
const prisma = require("../prismaClient");

const {
  createProjectWithDetails,
  getProjectById,
  createProjectFromStepSession,
} = require("../repositories/projectRepository");
const { getFormById } = require("../repositories/analysisFormRepository");

const saveProjectService = async (currentUser, body) => {
  const { title, formId, formTitle, analysis, mode, messages } = body;

  // بررسی وجود فرم
  const formExists = await getFormById(formId);

  if (!formExists) {
    createBadRequestError("فرم یافت نشد", 404);
  }

  // ساخت پروژه
  const project = await createProjectWithDetails({
    creatorId: currentUser.id,
    companyId: currentUser.companyId,
    title,
    formId,
    formTitle,
    analysis,
    mode,
    messages,
  });

  // دریافت پروژه با جزئیات کامل
  const fullProject = await getProjectById(project.id);

  return fullProject;
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
  const project = await createProjectFromStepSession({
    sessionId,
    title,
    messages,
    creatorId: currentUser.id,
    companyId: currentUser.companyId,
  });

  // دریافت پروژه با جزئیات کامل
  const fullProject = await getProjectById(project.id);

  return fullProject;
};

module.exports = { saveProjectService, createProjectFromStepService };
