const { createBadRequestError } = require("../utils");
const prisma = require("../prismaClient");

const {
  createProjectWithDetails,
  createProjectFromStepSession,
  getAllProjects,
  giveRateAndProject,
  getProject,
  isProjectExists,
} = require("../repositories/projectRepository");
const { isFromExists } = require("../repositories/analysisFormRepository");

const createAnalysisProjectService = async (currentUser, formId) => {
  const form = await isFromExists(formId);
  if (!form) {
    createBadRequestError("فرم تحلیل یافت نشد");
  }

  const project = await prisma.project.create({
    data: {
      title: "پروژه جدید",
      creatorId: currentUser.id,
      companyId: currentUser.companyId,
      mode: "SINGLE",
      status: "DRAFT",
      formId: formId,
      formResponses: {},
    },
    include: {
      items: true,
    },
  });

  return project;
};

const getAllProjectsService = async (userId, userRole, companyId, query) => {
  const projects = await getAllProjects(userId, userRole, companyId, query);
  return projects;
};

const getProjectService = async (projectId, userId, userRole, companyId) => {
  const project = await getProject(projectId, userId, userRole, companyId);
  return project;
};

const createProjectFromStepService = async (currentUser, body) => {
  const { sessionId, title, messages } = body;

  // بررسی وجود جلسه
  const session = await prisma.stepSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    createBadRequestError("جلسه یافت نشد", 404);
  }

  if (session.userId !== currentUser.id) {
    createBadRequestError("دسترسی غیرمجاز", 403);
  }

  if (session.status !== "COMPLETED") {
    createBadRequestError("تحلیل نهایی هنوز تکمیل نشده", 400);
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

const giveRateToProjectService = async (userId, projectId, body) => {
  const project = await isProjectExists(projectId);
  if (!project) {
    createBadRequestError("پروژه ای با این ایدی وجود ندارد", 404);
  }

  await giveRateAndProject(userId, projectId, body);
};

module.exports = {
  createProjectFromStepService,
  getAllProjectsService,
  getProjectService,
  giveRateToProjectService,
  createAnalysisProjectService,
};
