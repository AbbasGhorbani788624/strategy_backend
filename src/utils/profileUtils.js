const prisma = require("../prismaClient");

const isSectionCompleted = (records) => {
  if (!records) return false;

  if (Array.isArray(records)) {
    return records.length > 0;
  }

  if (typeof records === "object") {
    return Object.keys(records).length > 0;
  }

  return false;
};

const calculateUserProgress = (profileData) => {
  const steps = [0, 0, 0, 0];

  if (isSectionCompleted(profileData?.basicInfoRecords)) steps[0] = 1;
  if (isSectionCompleted(profileData?.academicRecords)) steps[1] = 1;
  if (isSectionCompleted(profileData?.educationalRecords)) steps[2] = 1;
  if (isSectionCompleted(profileData?.capabilitiesRecords)) steps[3] = 1;

  const firstIncompleteIndex = steps.findIndex((s) => s === 0);

  return {
    steps,
    completed: firstIncompleteIndex === -1,
    nextStep: firstIncompleteIndex === -1 ? null : firstIncompleteIndex + 1,
  };
};

const calculateCompanyProgress = (profileData) => {
  const steps = new Array(13).fill(0);
  let stepIndex = 0;

  const check = (records) => {
    if (isSectionCompleted(records)) steps[stepIndex] = 1;
    stepIndex++;
  };

  const companyInfo = profileData?.companyInfo;
  const market = profileData?.market;
  const financial = profileData?.financialStuation;
  const resources = profileData?.resourcesCapabilities;

  check(companyInfo?.basicInfoRecords);
  check(companyInfo?.managmentsRecords);
  check(companyInfo?.revenueCentersRecords);
  check(companyInfo?.shareholdersRecords);
  check(companyInfo?.orgStructureRecords);
  check(companyInfo?.licensesRecords);
  check(companyInfo?.membershipsRecords);

  check(market?.productsServicesRecords);
  check(market?.marketsRecords);
  check(market?.keyCustomersRecords);

  check(financial?.balanceSheetRecords);
  check(financial?.profitLossRecords);

  check(resources?.resourcesCapabilitiesRecords);

  const firstIncompleteIndex = steps.findIndex((s) => s === 0);

  return {
    steps,
    completed: firstIncompleteIndex === -1,
    nextStep: firstIncompleteIndex === -1 ? null : firstIncompleteIndex + 1,
  };
};

const resolveProfileRoute = ({ role, userProgress, companyProgress }) => {
  if (!userProgress?.completed) {
    return {
      entity: "user",
      tab: 1,
      step: userProgress.nextStep,
    };
  }

  if (companyProgress && !companyProgress.completed) {
    const step = companyProgress.nextStep;

    if (step <= 7) {
      return { entity: "company", tab: 2, step };
    }

    if (step <= 10) {
      return { entity: "company", tab: 3, step: step - 7 };
    }

    if (step <= 12) {
      return { entity: "company", tab: 4, step: step - 10 };
    }

    return { entity: "company", tab: 5, step: 1 };
  }

  return null;
};

const getCompanyProfileForProgress = async (companyId) => {
  const basicInfo = await prisma.companyBasicInfo.findUnique({
    where: { companyId },
  });

  const managers = await prisma.companyManager.findMany({
    where: { companyId },
  });

  const revenueCenters = await prisma.revenueCenter.findMany({
    where: { companyId },
  });

  const shareholders = await prisma.companyShareholder.findMany({
    where: { companyId },
  });

  const organizationUnits = await prisma.organizationUnit.findMany({
    where: { companyId },
  });

  const licenseCertificates = await prisma.companyLicenseCertificate.findMany({
    where: { companyId },
  });

  const memberships = await prisma.companyMembership.findMany({
    where: { companyId },
  });

  const productServices = await prisma.companyProductService.findMany({
    where: { companyId },
  });

  const markets = await prisma.companyMarket.findMany({
    where: { companyId },
  });

  const keyCustomers = await prisma.keyCustomer.findMany({
    where: { companyId },
  });

  const balanceSheets = await prisma.companyBalanceSheet.findMany({
    where: { companyId },
  });

  const incomeStatements = await prisma.companyIncomeStatement.findMany({
    where: { companyId },
  });

  const resourceCapabilities = await prisma.companyResourceCapability.findMany({
    where: { companyId },
  });

  return {
    companyInfo: {
      basicInfoRecords: basicInfo ? [basicInfo] : [],
      managmentsRecords: managers || [],
      revenueCentersRecords: revenueCenters || [],
      shareholdersRecords: shareholders || [],
      orgStructureRecords: organizationUnits || [],
      licensesRecords: licenseCertificates || [],
      membershipsRecords: memberships || [],
    },
    market: {
      productsServicesRecords: productServices || [],
      marketsRecords: markets || [],
      keyCustomersRecords: keyCustomers || [],
    },
    financialStuation: {
      balanceSheetRecords: balanceSheets || [],
      profitLossRecords: incomeStatements || [],
    },
    resourcesCapabilities: {
      resourcesCapabilitiesRecords: resourceCapabilities || [],
    },
  };
};

module.exports = {
  calculateCompanyProgress,
  calculateUserProgress,
  resolveProfileRoute,
  getCompanyProfileForProgress,
};
