const { syncCompanyInsightService } = require("./src/services/insightService");

(async () => {
  try {
    const result = await syncCompanyInsightService(
      "708ac1ba-33a5-4153-ae50-d8aed92762de",
      "bb441a8b-e920-4829-87bd-cf7097574286",
    );

    console.log(result);
  } catch (err) {
    console.error(err);
  }

  process.exit();
})();
