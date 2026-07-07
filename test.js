// const { syncCompanyInsightService } = require("./src/services/insightService");

// (async () => {
//   try {
//     const result = await syncCompanyInsightService(
//       "9eee75a2-c49f-44ef-9c97-01b2bf56e505",
//       "5c56a500-636a-47f2-915b-4750f3bccd0b",
//     );

//     console.log(result);
//   } catch (err) {
//     console.error(err);
//   }

//   process.exit();
// })();

const {
  syncIndustryInsightService,
} = require("./src/services/IndustryInsightService");

(async () => {
  try {
    const result = await syncIndustryInsightService(
      "9eee75a2-c49f-44ef-9c97-01b2bf56e505",
    );

    console.log(result);
  } catch (err) {
    console.error(err);
  }

  process.exit();
})();
