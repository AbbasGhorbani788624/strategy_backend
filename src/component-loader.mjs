import "./admin-env.mjs";
import { ComponentLoader } from "adminjs";
import { ValidationError } from "adminjs";
export const questionTypeValues = [
  { value: "RADIO", label: "رادیویی" },
  { value: "CHECKBOX", label: "چک‌باکس" },
  { value: "TEXT", label: "متن" },
];

const choiceQuestionTypes = ["RADIO", "CHECKBOX"];

export const formQuestionChoiceTypes = choiceQuestionTypes;

export const parseFormQuestionOptionsJson = (optionsJson) => {
  if (optionsJson === undefined || optionsJson === null) {
    return [];
  }

  const normalized = String(optionsJson).trim();
  if (!normalized) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    if (!Array.isArray(parsed)) {
      throw new Error("NOT_ARRAY");
    }
    return parsed;
  } catch {
    throw new ValidationError({
      optionsJson: {
        message: "فرمت گزینه‌ها معتبر نیست.",
      },
    });
  }
};

export const validateFormQuestionOptionsForSave = ({
  type,
  isScored,
  weight,
  options,
}) => {
  const isChoice = choiceQuestionTypes.includes(type);
  const requiresOptionScore = Boolean(isScored) && weight !== null;

  if (!isChoice) {
    return [];
  }

  if (!options.length) {
    throw new ValidationError({
      optionsJson: {
        message: "برای سوالات رادیویی و چک‌باکس حداقل یک گزینه لازم است.",
      },
    });
  }

  const normalized = [];

  for (let index = 0; index < options.length; index += 1) {
    const row = options[index] ?? {};
    const label = String(row.label ?? "").trim();
    const value = String(row.value ?? "").trim();
    const order = parseIntegerValue(row.order) ?? index + 1;
    const score =
      row.score === null || row.score === undefined || row.score === ""
        ? null
        : parseIntegerValue(row.score);

    if (!label) {
      throw new ValidationError({
        optionsJson: {
          message: `گزینه ${index + 1}: عنوان الزامی است.`,
        },
      });
    }

    if (!value) {
      throw new ValidationError({
        optionsJson: {
          message: `گزینه ${index + 1}: مقدار (value) الزامی است.`,
        },
      });
    }

    if (requiresOptionScore) {
      if (score === null) {
        throw new ValidationError({
          optionsJson: {
            message: `گزینه ${index + 1}: برای سوال امتیازی، نمره (۱ تا ۵) الزامی است.`,
          },
        });
      }
      if (![1, 2, 3, 4, 5].includes(score)) {
        throw new ValidationError({
          optionsJson: {
            message: `گزینه ${index + 1}: نمره باید بین ۱ تا ۵ باشد.`,
          },
        });
      }
    } else if (score !== null) {
      throw new ValidationError({
        optionsJson: {
          message: `گزینه ${index + 1}: برای سوال بدون وزن/امتیاز نمی‌توانید نمره وارد کنید.`,
        },
      });
    }

    normalized.push({ label, value, order, score });
  }

  return normalized;
};

export const parseFollowUpFormQuestionsJson = (questionsJson) => {
  if (questionsJson === undefined || questionsJson === null) {
    return [];
  }

  const normalized = String(questionsJson).trim();
  if (!normalized) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    if (!Array.isArray(parsed)) {
      throw new Error("NOT_ARRAY");
    }
    return parsed;
  } catch {
    throw new ValidationError({
      questionsJson: {
        message: "فرمت سوالات فرم معتبر نیست.",
      },
    });
  }
};

export const validateFollowUpFormQuestionsForSave = (questions) => {
  if (!questions.length) {
    return [];
  }

  const normalized = [];

  for (let index = 0; index < questions.length; index += 1) {
    const row = questions[index] ?? {};
    const label = String(row.label ?? "").trim();
    const type = String(row.type ?? "").trim();
    const required = parseBooleanValue(row.required);
    const order = parseIntegerValue(row.order) ?? index + 1;
    const optionsRaw = Array.isArray(row.options) ? row.options : [];

    if (!label) {
      throw new ValidationError({
        questionsJson: {
          message: `سوال ${index + 1}: متن سوال الزامی است.`,
        },
      });
    }

    if (!type) {
      throw new ValidationError({
        questionsJson: {
          message: `سوال ${index + 1}: نوع سوال الزامی است.`,
        },
      });
    }

    let options = null;

    if (choiceQuestionTypes.includes(type)) {
      if (!optionsRaw.length) {
        throw new ValidationError({
          questionsJson: {
            message: `سوال ${index + 1}: برای ${type} حداقل یک گزینه لازم است.`,
          },
        });
      }

      options = [];

      for (let optionIndex = 0; optionIndex < optionsRaw.length; optionIndex += 1) {
        const option = optionsRaw[optionIndex] ?? {};
        const optionLabel = String(option.label ?? "").trim();
        const optionValue = String(option.value ?? "").trim();

        if (!optionLabel) {
          throw new ValidationError({
            questionsJson: {
              message: `سوال ${index + 1}، گزینه ${optionIndex + 1}: عنوان الزامی است.`,
            },
          });
        }

        if (!optionValue) {
          throw new ValidationError({
            questionsJson: {
              message: `سوال ${index + 1}، گزینه ${optionIndex + 1}: value الزامی است.`,
            },
          });
        }

        options.push({ label: optionLabel, value: optionValue });
      }
    } else if (optionsRaw.length > 0) {
      throw new ValidationError({
        questionsJson: {
          message: `سوال ${index + 1}: برای نوع ${type} نباید گزینه تعریف شود.`,
        },
      });
    }

    normalized.push({
      label,
      type,
      required: required ?? true,
      order,
      options,
    });
  }

  return normalized;
};

export const parsePromptEditorJson = (promptEditorJson) => {
  if (promptEditorJson === undefined || promptEditorJson === null) {
    return { status: "DRAFT", segments: [] };
  }

  const normalized = String(promptEditorJson).trim();
  if (!normalized) {
    return { status: "DRAFT", segments: [] };
  }

  try {
    const parsed = JSON.parse(normalized);
    return {
      status: String(parsed.status || "DRAFT").trim(),
      segments: Array.isArray(parsed.segments) ? parsed.segments : [],
    };
  } catch {
    throw new ValidationError({
      promptEditorJson: {
        message: "فرمت بخش‌های پرامپت معتبر نیست.",
      },
    });
  }
};

export const validatePromptEditorSegmentsForSave = ({
  status,
  segments,
}) => {
  if (!segments.length) {
    throw new ValidationError({
      promptEditorJson: {
        message: "حداقل یک بخش برای پرامپت لازم است.",
      },
    });
  }

  const normalizedStatus = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)
    ? status
    : "DRAFT";

  const normalizedSegments = [];

  for (let index = 0; index < segments.length; index += 1) {
    const row = segments[index] ?? {};
    const label = String(row.label ?? "").trim();
    const description = String(row.description ?? "").trim();
    const content = String(row.content ?? "").trim();
    const isRequired = parseBooleanValue(row.isRequired) ?? true;

    if (!label) {
      throw new ValidationError({
        promptEditorJson: {
          message: `بخش ${index + 1}: عنوان الزامی است.`,
        },
      });
    }

    if (isRequired && !content) {
      throw new ValidationError({
        promptEditorJson: {
          message: `بخش ${index + 1}: متن پرامپت الزامی است.`,
        },
      });
    }

    if (normalizedStatus === "PUBLISHED" && !content) {
      throw new ValidationError({
        promptEditorJson: {
          message: `بخش ${index + 1}: برای انتشار، متن همه بخش‌ها باید پر باشد.`,
        },
      });
    }

    normalizedSegments.push({
      label,
      description: description || null,
      isRequired,
      content,
    });
  }

  return {
    status: normalizedStatus,
    segments: normalizedSegments,
  };
};

export const parseOptionsTextBeforeSave = async (request) => {
  if (request.method !== "post") {
    return request;
  }

  const optionsText = request.payload?.optionsText;

  if (optionsText === undefined) {
    return request;
  }

  const normalizedOptionsText = String(optionsText).trim();

  if (!normalizedOptionsText) {
    request.payload.options = null;
  } else {
    try {
      request.payload.options = JSON.parse(normalizedOptionsText);
    } catch (error) {
      throw new ValidationError({
        optionsText: {
          message: "فیلد options باید JSON معتبر باشد.",
        },
      });
    }
  }

  delete request.payload.optionsText;

  return request;
};

export const fillOptionsTextAfterLoad = async (response) => {
  if (!response.record?.params) {
    return response;
  }

  const options = response.record.params.options;

  if (options === undefined || options === null || options === "") {
    response.record.params.optionsText = "";
    return response;
  }

  try {
    if (typeof options === "string") {
      response.record.params.optionsText = JSON.stringify(
        JSON.parse(options),
        null,
        2,
      );
    } else {
      response.record.params.optionsText = JSON.stringify(options, null, 2);
    }
  } catch (error) {
    response.record.params.optionsText = "";
  }

  return response;
};

export const parseBooleanValue = (value) => {
  if (value === true) return true;
  if (value === false) return false;

  if (value === "true") return true;
  if (value === "false") return false;

  if (value === "on") return true;
  if (value === "1") return true;
  if (value === 1) return true;

  return false;
};

export const parseIntegerValue = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) return null;

  return parsed;
};

export const parseJsonText = (jsonText, fieldName = "jsonText") => {
  if (jsonText === undefined || jsonText === null) {
    return undefined;
  }

  const normalized = String(jsonText).trim();

  if (!normalized) {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch {
    throw new ValidationError({
      [fieldName]: {
        message: "فرمت JSON معتبر نیست.",
      },
    });
  }
};

export const parseOptionsText = (optionsText) => {
  if (!optionsText || !String(optionsText).trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(String(optionsText));

    if (!Array.isArray(parsed)) {
      throw new Error("OPTIONS_MUST_BE_ARRAY");
    }

    return parsed;
  } catch {
    throw new ValidationError({
      optionsText: {
        message:
          "فرمت JSON گزینه‌ها معتبر نیست. لطفاً یک آرایه JSON معتبر وارد کنید.",
      },
    });
  }
};

export const validateQuestionOptions = ({ type, options }) => {
  if (!choiceQuestionTypes.includes(type)) {
    return;
  }

  if (!options || !Array.isArray(options) || options.length === 0) {
    throw new ValidationError({
      optionsText: {
        message:
          "برای سوالات انتخابی مثل select، radio، checkbox و multiSelect وارد کردن گزینه‌ها الزامی است.",
      },
    });
  }

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];

    if (!option || typeof option !== "object" || Array.isArray(option)) {
      throw new ValidationError({
        optionsText: {
          message: `گزینه شماره ${index + 1} معتبر نیست.`,
        },
      });
    }

    if (!option.label || !String(option.label).trim()) {
      throw new ValidationError({
        optionsText: {
          message: `گزینه شماره ${index + 1} باید فیلد label داشته باشد.`,
        },
      });
    }

    if (!option.value || !String(option.value).trim()) {
      throw new ValidationError({
        optionsText: {
          message: `گزینه شماره ${index + 1} باید فیلد value داشته باشد.`,
        },
      });
    }
  }
};

const normalizeQuestionOptions = (options) => {
  if (!options) return [];

  if (Array.isArray(options)) return options;

  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const formatFollowUpAnswer = (question, answer) => {
  if (answer === undefined || answer === null) return "—";

  const options = normalizeQuestionOptions(question?.options);

  const findLabel = (value) => {
    const match = options.find(
      (option) =>
        option?.value === value || String(option?.value) === String(value),
    );

    return match?.label ?? String(value);
  };

  if (question?.type === "CHECKBOX") {
    const values = Array.isArray(answer) ? answer : [answer];

    if (values.length === 0) return "—";

    return values.map(findLabel).join("، ");
  }

  if (question?.type === "RADIO") {
    return findLabel(answer);
  }

  if (typeof answer === "string") {
    return answer.trim() || "—";
  }

  if (Array.isArray(answer)) {
    return answer.length ? answer.join("، ") : "—";
  }

  return String(answer);
};

export const buildFollowUpResponsesText = (responses, questions = []) => {
  if (!responses) return "";

  let parsedResponses = responses;

  if (typeof responses === "string") {
    try {
      parsedResponses = JSON.parse(responses);
    } catch {
      return responses;
    }
  }

  if (
    !parsedResponses ||
    typeof parsedResponses !== "object" ||
    Array.isArray(parsedResponses)
  ) {
    return JSON.stringify(parsedResponses, null, 2);
  }

  if (!questions.length) {
    return JSON.stringify(parsedResponses, null, 2);
  }

  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const lines = [];

  const sortedQuestions = [...questions].sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0),
  );

  for (const question of sortedQuestions) {
    const formattedAnswer = formatFollowUpAnswer(
      question,
      parsedResponses[question.id],
    );

    lines.push(`${question.order}. ${question.label}`);
    lines.push(`   پاسخ: ${formattedAnswer}`);
    lines.push("");
  }

  for (const [questionId, answer] of Object.entries(parsedResponses)) {
    if (questionMap.has(questionId)) continue;

    lines.push(`[سوال ناشناس: ${questionId}]`);
    lines.push(
      `   پاسخ: ${
        typeof answer === "object" ? JSON.stringify(answer) : String(answer)
      }`,
    );
    lines.push("");
  }

  return lines.join("\n").trim();
};

export const buildOptionsTextFromRecord = (recordJson) => {
  const params = recordJson?.params || {};

  if (params.optionsText) {
    return recordJson;
  }

  const options = params.options;

  if (options === null || options === undefined || options === "") {
    recordJson.params.optionsText = "";
    return recordJson;
  }

  try {
    if (typeof options === "string") {
      const parsed = JSON.parse(options);
      recordJson.params.optionsText = JSON.stringify(parsed, null, 2);
    } else {
      recordJson.params.optionsText = JSON.stringify(options, null, 2);
    }
  } catch {
    recordJson.params.optionsText = "";
  }

  return recordJson;
};

export const extractReferenceId = (value) => {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return extractReferenceId(value[0]);
  }

  if (typeof value === "object") {
    if ("id" in value && value.id) {
      return String(value.id).trim();
    }

    if ("value" in value && value.value) {
      return String(value.value).trim();
    }

    if ("recordId" in value && value.recordId) {
      return String(value.recordId).trim();
    }
  }

  return null;
};

export const normalizeString = (value) => {
  return String(value ?? "").trim();
};

export const buildPromptDefinitionLabel = (item) => {
  if (item.analysisForm?.title) {
    return `تحلیل: ${item.analysisForm.title}`;
  }

  if (item.multiAnalysisForm?.title) {
    return `تحلیل چندگانه: ${item.multiAnalysisForm.title}`;
  }

  return `PromptDefinition - ${item.id}`;
};

export const normalizeNullableString = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
};

export const parseNullableBooleanValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  return parseBooleanValue(value);
};

export const parseDecimalValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

export const componentLoader = new ComponentLoader();
