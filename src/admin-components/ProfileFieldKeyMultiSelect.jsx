import React, { useCallback, useState } from "react";
import { Box, FormGroup, FormMessage, Label, Text } from "@adminjs/design-system";

const normalizeScalar = (raw) => {
  if (raw == null || raw === "") {
    return [];
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof raw === "object") {
    return Object.values(raw)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return [String(raw).trim()].filter(Boolean);
};

/** AdminJS flat.set stores arrays as `path.0`, `path.1`, … not always `path` as array */
const getSelectedFromRecordParams = (params, path) => {
  if (!params) {
    return [];
  }

  const direct = normalizeScalar(params[path]);
  if (direct.length) {
    return [...new Set(direct)];
  }

  const flatPrefix = `${path}.`;
  const fromFlat = Object.keys(params)
    .filter((key) => key.startsWith(flatPrefix))
    .sort((left, right) => {
      const leftIndex = Number(left.slice(flatPrefix.length));
      const rightIndex = Number(right.slice(flatPrefix.length));
      return leftIndex - rightIndex;
    })
    .map((key) => String(params[key] ?? "").trim())
    .filter(Boolean);

  return [...new Set(fromFlat)];
};

const ProfileFieldKeyMultiSelect = (props) => {
  const { property, record, onChange } = props;
  const path = property.path || property.propertyPath || "profileFieldKeys";
  const options = property.availableValues ?? property.props?.availableValues ?? [];
  const error = record?.errors?.[path];

  const [selectedKeys, setSelectedKeys] = useState(() =>
    getSelectedFromRecordParams(record?.params, path),
  );

  const selectedSet = new Set(selectedKeys);

  const applySelection = useCallback(
    (nextKeys) => {
      const unique = [...new Set(nextKeys.filter(Boolean))];
      setSelectedKeys(unique);
      onChange(path, unique);
    },
    [onChange, path],
  );

  const handleToggle = (value) => {
    const next = selectedSet.has(value)
      ? selectedKeys.filter((item) => item !== value)
      : [...selectedKeys, value];
    applySelection(next);
  };

  return (
    <FormGroup error={Boolean(error)}>
      <Label required={property.isRequired}>Profile Field Key</Label>
      <Text mb="default" size="sm" color="grey60">
        می‌توانید چند فیلد پروفایل را هم‌زمان انتخاب کنید؛ برای هر مورد یک
        رکورد جدا ذخیره می‌شود.
      </Text>
      <Box
        maxHeight={360}
        overflowY="auto"
        p="default"
        border="default"
        borderRadius="default"
      >
        {options.map((option) => {
          const inputId = `${path}-${option.value}`;
          const checked = selectedSet.has(option.value);

          return (
            <Box key={option.value} mb="sm">
              <label
                htmlFor={inputId}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <input
                  type="checkbox"
                  id={inputId}
                  name={`${path}.${option.value}`}
                  checked={checked}
                  onChange={() => handleToggle(option.value)}
                  style={{ marginTop: 4, flexShrink: 0 }}
                />
                <Text as="span">{option.label}</Text>
              </label>
            </Box>
          );
        })}
      </Box>
      <Text mt="sm" size="sm" color="grey60">
        {selectedKeys.length} مورد انتخاب شده
      </Text>
      <FormMessage>{error?.message}</FormMessage>
    </FormGroup>
  );
};

export default ProfileFieldKeyMultiSelect;
