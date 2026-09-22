import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  FormGroup,
  FormMessage,
  Icon,
  Input,
  Label,
  Select,
  Text,
} from "@adminjs/design-system";

const CHOICE_TYPES = new Set(["RADIO", "CHECKBOX"]);

const SCORE_OPTIONS = [
  { value: "", label: "—" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

const emptyRow = (order) => ({
  label: "",
  value: "",
  score: "",
  order: order ?? 1,
});

const parseOptionsJson = (raw) => {
  if (raw == null || raw === "") {
    return [];
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(raw)) {
    return raw;
  }

  return [];
};

const normalizeRows = (rows) =>
  rows.map((row, index) => ({
    label: String(row?.label ?? ""),
    value: String(row?.value ?? ""),
    score:
      row?.score === null || row?.score === undefined || row?.score === ""
        ? ""
        : String(row.score),
    order:
      row?.order === null || row?.order === undefined || row?.order === ""
        ? index + 1
        : Number(row.order) || index + 1,
  }));

const FormQuestionOptionsEditor = (props) => {
  const { property, record, onChange } = props;
  const path = property.path || property.propertyPath || "optionsJson";
  const error = record?.errors?.[path];

  const questionType = String(record?.params?.type ?? "");
  const isScored =
    record?.params?.isScored === true ||
    record?.params?.isScored === "true" ||
    record?.params?.isScored === "on" ||
    record?.params?.isScored === 1;
  const weightRaw = record?.params?.weight;
  const hasWeight =
    weightRaw !== null &&
    weightRaw !== undefined &&
    String(weightRaw).trim() !== "";
  const requiresScore = isScored && hasWeight;
  const isChoiceType = CHOICE_TYPES.has(questionType);

  const [rows, setRows] = useState(() =>
    normalizeRows(parseOptionsJson(record?.params?.[path])),
  );

  const pushToForm = useCallback(
    (nextRows) => {
      const normalized = normalizeRows(nextRows);
      setRows(normalized);
      onChange(path, JSON.stringify(normalized));
    },
    [onChange, path],
  );

  const handleFieldChange = (index, field, value) => {
    const next = rows.map((row, i) =>
      i === index ? { ...row, [field]: value } : row,
    );
    pushToForm(next);
  };

  const handleAddRow = () => {
    pushToForm([...rows, emptyRow(rows.length + 1)]);
  };

  const handleRemoveRow = (index) => {
    const next = rows
      .filter((_, i) => i !== index)
      .map((row, i) => ({ ...row, order: i + 1 }));
    pushToForm(next);
  };

  useEffect(() => {
    if (!isChoiceType && rows.length > 0) {
      pushToForm([]);
    }
  }, [isChoiceType, rows.length, pushToForm]);

  const hint = useMemo(() => {
    if (!isChoiceType) {
      return "برای سوالات متنی یا عددی گزینه‌ای لازم نیست.";
    }
    if (requiresScore) {
      return "این سوال امتیازی است؛ برای هر گزینه نمره (۱ تا ۵) الزامی است.";
    }
    return "عنوان و مقدار هر گزینه را وارد کنید.";
  }, [isChoiceType, requiresScore]);

  if (!isChoiceType) {
    return (
      <FormGroup>
        <Label>گزینه‌های سوال</Label>
        <Text size="sm" color="grey60">
          {hint}
        </Text>
      </FormGroup>
    );
  }

  return (
    <FormGroup error={Boolean(error)}>
      <Label>گزینه‌های سوال</Label>
      <Text mb="default" size="sm" color="grey60">
        {hint}
      </Text>

      <Box border="default" borderRadius="default" p="default">
        {rows.length === 0 ? (
          <Text size="sm" color="grey60" mb="default">
            هنوز گزینه‌ای اضافه نشده است.
          </Text>
        ) : (
          rows.map((row, index) => (
            <Box
              key={`option-row-${index}`}
              mb="lg"
              pb="lg"
              borderBottom="default"
            >
              <Box flex flexDirection="row" flexWrap="wrap" style={{ gap: 12 }}>
                <Box flex="1" minWidth="200px">
                  <Label size="sm">عنوان گزینه</Label>
                  <Input
                    value={row.label}
                    onChange={(e) =>
                      handleFieldChange(index, "label", e.target.value)
                    }
                  />
                </Box>
                <Box flex="1" minWidth="160px">
                  <Label size="sm">مقدار (value)</Label>
                  <Input
                    value={row.value}
                    onChange={(e) =>
                      handleFieldChange(index, "value", e.target.value)
                    }
                  />
                </Box>
                <Box width="100px">
                  <Label size="sm">ترتیب</Label>
                  <Input
                    type="number"
                    value={row.order}
                    onChange={(e) =>
                      handleFieldChange(index, "order", e.target.value)
                    }
                  />
                </Box>
                {requiresScore ? (
                  <Box width="120px">
                    <Label size="sm">نمره</Label>
                    <Select
                      value={
                        SCORE_OPTIONS.find(
                          (opt) => opt.value === String(row.score),
                        ) ?? SCORE_OPTIONS[0]
                      }
                      options={SCORE_OPTIONS.filter((opt) => opt.value !== "")}
                      onChange={(selected) =>
                        handleFieldChange(
                          index,
                          "score",
                          selected?.value ?? "",
                        )
                      }
                    />
                  </Box>
                ) : null}
                <Box display="flex" alignItems="flex-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="text"
                    color="danger"
                    onClick={() => handleRemoveRow(index)}
                    title="حذف گزینه"
                  >
                    <Icon icon="Trash2" />
                  </Button>
                </Box>
              </Box>
            </Box>
          ))
        )}

        <Button type="button" variant="outlined" onClick={handleAddRow}>
          <Icon icon="Plus" />
          افزودن گزینه
        </Button>
      </Box>

      <FormMessage>{error?.message}</FormMessage>
    </FormGroup>
  );
};

export default FormQuestionOptionsEditor;
