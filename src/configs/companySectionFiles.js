module.exports = {
  basicInfo: [],

  managers: [
    {
      field: "resumeFile",
      relation: "resumeFileId",
    },
  ],

  revenueCenters: [],

  shareholders: [],

  organizationUnits: [
    {
      field: "structureFile",
      relation: "structureFileId",
    },
  ],

  licenseCertificates: [
    {
      field: "attachmentFile",
      relation: "attachmentFileId",
    },
  ],

  memberships: [],

  productServices: [],

  markets: [],

  keyCustomers: [],

  balanceSheets: [
    {
      field: "balanceFile",
      relation: "balanceFileId",
    },
  ],

  incomeStatements: [
    {
      field: "incomeFile",
      relation: "incomeFileId",
    },
  ],

  resourceCapabilities: [],
};
