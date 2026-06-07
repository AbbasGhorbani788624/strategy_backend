import { COMPANY_PROFILE_FIELDS_BY_MODEL } from "./companyProfileFieldKeys.mjs";

export const parseProfileFieldKey = (profileFieldKey) => {
  if (!profileFieldKey || typeof profileFieldKey !== "string") {
    return null;
  }

  const parts = profileFieldKey.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [model, fieldName] = parts;

  if (!model || !fieldName) {
    return null;
  }

  return { model, fieldName };
};

export const isValidProfileFieldKey = (profileFieldKey) => {
  const parsed = parseProfileFieldKey(profileFieldKey);

  if (!parsed) return false;

  const { model, fieldName } = parsed;

  const allowedFields = COMPANY_PROFILE_FIELDS_BY_MODEL[model];
  if (!allowedFields) return false;

  return allowedFields.some((item) => item.value === fieldName);
};

export const validateProfileFieldKey = (profileFieldKey) => {
  if (!isValidProfileFieldKey(profileFieldKey)) {
    throw new Error(`Invalid profileFieldKey: ${profileFieldKey}`);
  }

  return true;
};
