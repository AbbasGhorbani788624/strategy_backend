require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    throw new Error("ADMIN_USERNAME or ADMIN_PASSWORD not set in .env");
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });

  if (!existingAdmin) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        username: adminUsername,
        password: hashed,
        role: "SUPER_ADMIN",
        profileCompleted: true,
      },
    });
    console.log("Admin account created ✅");
  } else {
    console.log("Admin already exists");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
