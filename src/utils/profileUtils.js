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
  if (!profileData)
    return { completed: false, steps: [0, 0, 0, 0], lastStep: 0 };

  const steps = [0, 0, 0, 0];
  let lastStep = 0;

  if (isSectionCompleted(profileData.basicInfoRecords)) {
    steps[0] = 1;
    lastStep = 1;
  }
  if (isSectionCompleted(profileData.academicRecords)) {
    steps[1] = 1;
    lastStep = 2;
  }
  if (isSectionCompleted(profileData.educationalRecords)) {
    steps[2] = 1;
    lastStep = 3;
  }
  if (isSectionCompleted(profileData.capabilitiesRecords)) {
    steps[3] = 1;
    lastStep = 4;
  }

  return {
    completed: lastStep === 4,
    lastStep,
    steps,
  };
};

const calculateCompanyProgress = (profileData) => {
  const steps = new Array(13).fill(0);
  let stepIndex = 0;

  const check = (records) => {
    if (isSectionCompleted(records)) {
      steps[stepIndex] = 1;
    }
    stepIndex++;
  };

  const companyInfo = profileData?.companyInfo;
  const market = profileData?.market;
  const financial = profileData?.financialStuation;
  const resources = profileData?.resourcesCapabilities;

  // companyInfo (7)
  check(companyInfo?.basicInfoRecords);
  check(companyInfo?.managmentsRecords);
  check(companyInfo?.revenueCentersRecords);
  check(companyInfo?.shareholdersRecords);
  check(companyInfo?.orgStructureRecords);
  check(companyInfo?.licensesRecords);
  check(companyInfo?.membershipsRecords);

  // market (3)
  check(market?.productsServicesRecords);
  check(market?.marketsRecords);
  check(market?.keyCustomersRecords);

  // financial (2)
  check(financial?.balanceSheetRecords);
  check(financial?.profitLossRecords);

  // resources (1)
  check(resources?.resourcesCapabilitiesRecords);

  const lastStep = steps.lastIndexOf(1) + 1;

  return {
    steps,
    lastStep,
    completed: lastStep === 13,
  };
};

const resolveProfileRoute = ({ role, userProgress, companyProgress }) => {
  // user profile incomplete
  if (!userProgress.completed) {
    return {
      entity: "user",
      tab: 1,
      step: userProgress.lastStep + 1,
    };
  }

  // company profile incomplete
  if (role === "COMPANY" && companyProgress && !companyProgress.completed) {
    const step = companyProgress.lastStep + 1;

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

module.exports = {
  calculateCompanyProgress,
  calculateUserProgress,
  resolveProfileRoute,
};
