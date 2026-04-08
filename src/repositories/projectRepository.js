const prisma = require("../prismaClient");

const createProjectWithDetails = async (data) => {
  const { messages, ...projectData } = data;

  return prisma.$transaction(async (tx) => {
    // 1. ایجاد پروژه
    const project = await tx.project.create({
      data: {
        title: projectData.title,
        creatorId: projectData.creatorId,
        companyId: projectData.companyId,
        mode: projectData.mode,
        solution: projectData.analysis,
      },
    });

    // 2. ایجاد آیتم پروژه (فقط تایتل فرم)
    await tx.projectItem.create({
      data: {
        projectId: project.id,
        formId: projectData.formId,
        formTitle: projectData.formTitle,
        analysis: projectData.analysis,
        solution: projectData.analysis,
        order: 1,
        isFinal: true,
      },
    });

    // 3. ایجاد پیام‌های چت (هم کاربر هم AI)
    if (messages && messages.length > 0) {
      const chatMessages = messages.map((msg) => ({
        projectId: project.id,
        userId: msg.role === "user" ? projectData.creatorId : null,
        role: msg.role,
        content: msg.content,
      }));

      await tx.chatMessage.createMany({
        data: chatMessages,
      });
    }

    return project;
  });
};

const createProjectFromStepSession = async (data) => {
  const { sessionId, title, messages, creatorId, companyId } = data;

  return prisma.$transaction(async (tx) => {
    // 1. دریافت جلسه
    const session = await tx.stepSession.findUnique({
      where: { id: sessionId },
      include: {
        flow: {
          include: {
            steps: {
              orderBy: { order: "asc" },
              include: {
                form: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    // 2. استخراج تحلیل‌های تکی
    const completedSteps = session.data.completedSteps || [];
    const stepAnalyses = session.data.stepAnalyses || {};

    // 3. ایجاد پروژه
    const finalAnalysis = Object.values(stepAnalyses).join("\n\n---\n\n");

    const project = await tx.project.create({
      data: {
        title,
        creatorId,
        companyId,
        mode: "STEP",
        solution: finalAnalysis,
      },
    });

    // 4. ایجاد آیتم‌های پروژه (هر فرم یک آیتم)
    const projectItems = completedSteps.map((step, index) => ({
      projectId: project.id,
      formId: step.formId,
      formTitle: step.formTitle,
      responses: step.answers || {},
      analysis: step.analysis,
      solution: step.analysis,
      order: index + 1,
      isFinal: index === completedSteps.length - 1,
    }));

    await tx.projectItem.createMany({
      data: projectItems,
    });

    // 5. ایجاد پیام‌های چت
    const chatMessages = messages.map((msg) => ({
      projectId: project.id,
      userId: msg.role === "user" ? creatorId : null,
      role: msg.role,
      content: msg.content,
    }));

    await tx.chatMessage.createMany({
      data: chatMessages,
    });

    return project;
  });
};

const getProjectById = async (projectId) => {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          avatar: true,
          role: true,
          profile: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
          profile: true,
        },
      },
      items: {
        select: {
          id: true,
          formTitle: true,
          analysis: true,
          solution: true,
          createdAt: true,
        },
      },
      chatMessages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });
};

module.exports = {
  createProjectWithDetails,
  getProjectById,
  createProjectFromStepSession,
};
