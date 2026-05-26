import { ComponentLoader } from "adminjs";
import { ValidationError } from "adminjs";

export const questionTypeValues = [
  { value: "RADIO", label: "رادیویی" },
  { value: "CHECKBOX", label: "چک‌باکس" },
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

export const componentLoader = new ComponentLoader();
