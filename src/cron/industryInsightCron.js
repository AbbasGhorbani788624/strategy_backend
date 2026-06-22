// cron/industryInsightCron.js
import cron from "node-cron";
const prisma = require("../prismaClient");
import { syncIndustryInsightService } from "../services/IndustryInsightService.js";

cron.schedule("0 1 * * 6", async () => {
  // هر شنبه ساعت 1 صبح
  console.log(
    "🚀 شروع Cron Job هفتگی بینش صنعت - ",
    new Date().toLocaleString("fa-IR"),
  );

  try {
    const companies = await prisma.company.findMany({
      where: {
        industry: { not: null, not: "" },
      },
      select: { id: true, name: true, industry: true },
    });

    console.log(`📋 ${companies.length} شرکت با صنعت پیدا شد.`);

    let success = 0;
    let failed = 0;
    const batchSize = 12; // برای ۱۰۰ شرکت مناسب است
    const delayBetweenBatches = 7000; // ۷ ثانیه فاصله بین دسته‌ها

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);

      console.log(
        `🔄 پردازش دسته ${Math.floor(i / batchSize) + 1}/${Math.ceil(companies.length / batchSize)} ...`,
      );

      const promises = batch.map(async (company) => {
        try {
          const result = await syncIndustryInsightService(company.id);
          return result ? "success" : "failed";
        } catch (err) {
          console.error(
            `خطا برای شرکت ${company.name || company.id}:`,
            err.message,
          );
          return "failed";
        }
      });

      const results = await Promise.allSettled(promises);

      results.forEach((res) => {
        if (res.status === "fulfilled" && res.value === "success") success++;
        else failed++;
      });

      if (i + batchSize < companies.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenBatches),
        );
      }
    }

    console.log(`🎯 Cron Job هفتگی پایان یافت`);
    console.log(`   ✅ موفق: ${success}`);
    console.log(`   ❌ ناموفق: ${failed}`);
  } catch (error) {
    console.error("❌ خطای کلی در Cron Job:", error);
  }
});

console.log("⏰ Cron Job بینش صنعت فعال شد (هفتگی - شنبه ساعت 1 صبح)");
