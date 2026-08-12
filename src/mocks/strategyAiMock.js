const MOCK_BSC_MAP = {
  perspectives: [
    {
      key: "FINANCIAL",
      title: "مالی",
      columns: [
        {
          key: "EFFICIENCY",
          title: "کارایی",
          objectives: [
            "کاهش هزینه‌های عوامل تولید",
            "افزایش پایداری و کاهش هزینه‌های تامین",
            "افزایش بهره‌وری منابع انسانی",
          ],
        },
        {
          key: "SUSTAINABLE_PROFITABILITY",
          title: "سودآوری پایدار",
          objectives: [],
        },
        {
          key: "EFFECTIVENESS",
          title: "اثربخشی",
          objectives: [
            "فروش در بازار جدید",
            "فروش سبد محصولات و خدمات",
            "افزایش فروش در بازار فعلی",
            "فروش محصولات با حاشیه سود بیشتر",
          ],
        },
      ],
    },
    {
      key: "CUSTOMER",
      title: "مشتری",
      objectives: [
        "بهبود سطح ارتباط با مشتری",
        "افزایش سطح رضایت و وفاداری مشتریان",
        "بهبود قدرت برند",
        "بهبود کیفیت محصولات",
      ],
    },
    {
      key: "INTERNAL_PROCESS",
      title: "فرایندهای داخلی",
      objectives: [
        "بهبود پایداری تامین کالای استراتژیک",
        "افزایش کارایی فرایند تحقیق و توسعه",
        "بهبود اثربخشی فرایند فروش",
        "بهبود فرایند مدیریت ارتباط با مشتری",
      ],
    },
    {
      key: "LEARNING_GROWTH",
      title: "یادگیری و رشد",
      columns: [
        {
          key: "HUMAN_CAPITAL",
          title: "سرمایه انسانی",
          objectives: [
            "بهبود اثربخشی مدیریت شایستگی‌های کارکنان",
            "افزایش سطح رضایت کارکنان",
          ],
        },
        {
          key: "INFORMATION_CAPITAL",
          title: "سرمایه اطلاعاتی",
          objectives: [
            "ایجاد زیرساخت هوش کسب و کار",
            "توسعه سیستم‌های اطلاعاتی یکپارچه",
          ],
        },
        {
          key: "ORGANIZATIONAL_CAPITAL",
          title: "سرمایه سازمانی",
          objectives: [
            "بهبود سبک رهبری",
            "بهبود فرهنگ سازمانی و کار تیمی",
          ],
        },
      ],
    },
  ],
  mock: true,
};

const MOCK_BSC_KPI_TABLE = [
  {
    strategicObjective: "سودآوری پایدار",
    kpis: [
      {
        metric: "سود ناخالص",
        formula: "درآمد - هزینه",
        measurementPeriod: "شش ماهه",
      },
      {
        metric: "نسبت اهرمی",
        formula: "ROE = (سود خالص / فروش) × (فروش / دارایی) × (دارایی / حقوق صاحبان سهام)",
        measurementPeriod: "شش ماهه",
      },
    ],
  },
  {
    strategicObjective: "افزایش فروش در بازار موجود",
    kpis: [
      {
        metric: "میزان ریالی فروش",
        formula: "",
        measurementPeriod: "سه ماهه",
      },
      {
        metric: "تعداد فروش محصول",
        formula: "",
        measurementPeriod: "سه ماهه",
      },
    ],
  },
  {
    strategicObjective: "فروش در بازار جدید",
    kpis: [
      {
        metric: "حجم ریالی فروش در بازار جدید",
        formula: "",
        measurementPeriod: "سه ماهه",
      },
    ],
  },
  {
    strategicObjective: "افزایش بهره‌وری منابع انسانی",
    kpis: [
      {
        metric: "نسبت هزینه‌های منابع انسانی",
        formula: "جمع هزینه‌های منابع انسانی / تناژ تولید",
        measurementPeriod: "سه ماهه",
      },
    ],
  },
];

const clone = (value) => JSON.parse(JSON.stringify(value));

const MOCK_OKR_KPI_TABLE = clone(MOCK_BSC_KPI_TABLE);

const withMockMeta = (data, state) => {
  const meta = {
    _mock: true,
    _mockState: state,
    _generatedAt: new Date().toISOString(),
  };

  if (Array.isArray(data)) {
    return Object.assign(clone(data), meta);
  }

  return { ...clone(data), ...meta };
};

const buildMockStrategyAiResponse = (payload) => {
  const { framework, state } = payload;

  if (framework === "BSC" && state === "MAP_GENERATION") {
    return { map: withMockMeta(clone(MOCK_BSC_MAP), state) };
  }

  if (framework === "BSC" && state === "MAP_VALIDATION") {
    const editedMap = payload.edited_map || payload.initial_map || clone(MOCK_BSC_MAP);
    return {
      map: withMockMeta(
        {
          ...clone(editedMap),
          validated: true,
        },
        state,
      ),
    };
  }

  if (framework === "BSC" && state === "KPI_GENERATION") {
    return { kpi_table: withMockMeta(clone(MOCK_BSC_KPI_TABLE), state) };
  }

  if (framework === "BSC" && state === "KPI_VALIDATION") {
    const editedTable = payload.edited_map || payload.initial_map || clone(MOCK_BSC_KPI_TABLE);
    return {
      kpi_table: withMockMeta(
        clone(Array.isArray(editedTable) ? editedTable : MOCK_BSC_KPI_TABLE).map(
          (row) => ({
            ...row,
            validated: true,
          }),
        ),
        state,
      ),
    };
  }

  if (framework === "OKR" && state === "TABLE_GENERATION") {
    return { kpi_table: withMockMeta(clone(MOCK_OKR_KPI_TABLE), state) };
  }

  if (framework === "OKR" && state === "TABLE_VALIDATION") {
    const editedTable =
      payload.edited_table ||
      payload.edited_kpi_table ||
      payload.initial_table ||
      payload.initial_kpi_table ||
      clone(MOCK_OKR_KPI_TABLE);
    return {
      kpi_table: withMockMeta(
        clone(Array.isArray(editedTable) ? editedTable : MOCK_OKR_KPI_TABLE).map(
          (row) => ({
            ...row,
            validated: true,
          }),
        ),
        state,
      ),
    };
  }

  return {
    mock: true,
    framework,
    state,
    message: "Mock response for unsupported strategy AI state",
    receivedPayload: payload,
  };
};

const isStrategyAiMockEnabled = () =>
  process.env.STRATEGY_AI_MOCK === "true" ||
  process.env.STRATEGY_AI_MOCK === "1";

module.exports = {
  buildMockStrategyAiResponse,
  isStrategyAiMockEnabled,
};
