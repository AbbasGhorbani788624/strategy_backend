require("dotenv").config();

const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

const COMPANY_PROFILE_INCLUDE = {
  basicInfo: true,
  managers: true,
  revenueCenters: true,
  shareholders: true,
  organizationUnits: true,
  licenseCertificates: true,
  memberships: true,
  productServices: true,
  markets: true,
  keyCustomers: true,
  balanceSheets: true,
  incomeStatements: true,
  keySuppliers: true,
  rawMaterials: true,
  resourceCapabilities: true,
};

const toPlainJson = (value) => {
  if (value === null || value === undefined) return value;

  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toPlainJson(item));
  }

  if (typeof value === "object") {
    if (
      typeof value.toNumber === "function" &&
      value.constructor?.name === "Decimal"
    ) {
      return value.toNumber();
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, toPlainJson(nested)]),
    );
  }

  return value;
};

const buildCompanyProfile = (company) =>
  toPlainJson({
    basicInfo: company.basicInfo || {},
    managers: company.managers || [],
    revenueCenters: company.revenueCenters || [],
    shareholders: company.shareholders || [],
    organizationUnits: company.organizationUnits || [],
    licenseCertificates: company.licenseCertificates || [],
    memberships: company.memberships || [],
    productServices: company.productServices || [],
    markets: company.markets || [],
    keyCustomers: company.keyCustomers || [],
    balanceSheets: company.balanceSheets || [],
    incomeStatements: company.incomeStatements || [],
    keySuppliers: company.keySuppliers || [],
    rawMaterials: company.rawMaterials || [],
    resourceCapabilities: company.resourceCapabilities || [],
  });

async function main() {
  const companyId = process.argv[2] || process.env.COMPANY_ID;

  if (!companyId) {
    console.error("Usage: node seedCompanyProfile.js <companyId>");
    console.error("   or: COMPANY_ID=<uuid> node seedCompanyProfile.js");
    process.exit(1);
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: COMPANY_PROFILE_INCLUDE,
  });

  if (!company) {
    console.error(`Company not found: ${companyId}`);
    process.exit(1);
  }

  const output = {
    companyId: company.id,
    companyName: company.name,
    profile: buildCompanyProfile(company),
  };

  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
