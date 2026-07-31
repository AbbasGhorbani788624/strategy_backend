import { ComponentLoader } from "adminjs";
import { ValidationError } from "adminjs";
export const questionTypeValues = [
  { value: "RADIO", label: "رادیویی" },
  { value: "CHECKBOX", label: "چک‌باکس" },
  { value: "TEXT", label: "متن" },
];

const choiceQuestionTypes = ["RADIO", "CHECKBOX"];

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
