require("dotenv").config();
const app = require("./app");
const prisma = require("./prismaClient");

async function startServer() {
  const port = +process.env.PORT || 4000;

  try {
    await prisma.$connect();
    console.log("✅ Connected to database");

    app.listen(port, () => {
      console.log(
        `Server running in ${
          process.env.NODE_ENV === "production" ? "production" : "development"
        } mode on port ${port}`,
      );
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }
}

startServer();
