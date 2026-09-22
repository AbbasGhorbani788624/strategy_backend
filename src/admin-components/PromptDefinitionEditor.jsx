import React, { useCallback, useState } from "react";
import {
  Box,
  Button,
  CheckBox,
  FormGroup,
  FormMessage,
  Icon,
  Input,
  Label,
  Select,
  Text,
  TextArea,
} from "@adminjs/design-system";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "پیش‌نویس" },
  { value: "PUBLISHED", label: "منتشر شده" },
  { value: "ARCHIVED", label: "آرشیو" },
];

const emptySegment = (order) => ({
  label: `بخش ${order}`,
  description: "",
  isRequired: true,
  content: "",
});

const parseEditorJson = (raw) => {
  if (!raw) {
    return { status: "DRAFT", segments: [emptySegment(1)] };
  }
  try {
    const parsed = JSON.parse(String(raw));
    return {
      status: parsed.status || "DRAFT",
      segments:
        Array.isArray(parsed.segments) && parsed.segments.length
          ? parsed.segments
          : [emptySegment(1)],
    };
  } catch {
    return { status: "DRAFT", segments: [emptySegment(1)] };
  }
};

const PromptDefinitionEditor = (props) => {
  const { property, record, onChange } = props;
  const path = property.path || property.propertyPath || "promptEditorJson";
  const error = record?.errors?.[path];

  const initial = parseEditorJson(record?.params?.[path]);
  const [status, setStatus] = useState(initial.status);
  const [segments, setSegments] = useState(initial.segments);

  const pushToForm = useCallback(
    (nextStatus, nextSegments) => {
      setStatus(nextStatus);
      setSegments(nextSegments);
      onChange(
        path,
        JSON.stringify({
          status: nextStatus,
          segments: nextSegments,
        }),
      );
    },
    [onChange, path],
  );

  const updateSegment = (index, patch) => {
    const next = segments.map((segment, i) =>
      i === index ? { ...segment, ...patch } : segment,
    );
    pushToForm(status, next);
  };

  const addSegment = () => {
    pushToForm(status, [...segments, emptySegment(segments.length + 1)]);
  };

  const removeSegment = (index) => {
    if (segments.length <= 1) {
      return;
    }
    pushToForm(
      status,
      segments.filter((_, i) => i !== index),
    );
  };

  const selectedStatus =
    STATUS_OPTIONS.find((option) => option.value === status) ??
    STATUS_OPTIONS[0];

  return (
    <FormGroup error={Boolean(error)}>
      <Label>بخش‌ها و متن پرامپت</Label>
      <Text mb="default" size="sm" color="grey60">
        تعداد بخش‌ها را با «افزودن بخش» مشخص کنید و متن هر بخش را وارد کنید.
        ترتیب بخش‌ها همان ترتیب استفاده در AI است (بخش ۱، ۲، ۳، …).
      </Text>

      <Box mb="lg" width="240px">
        <Label size="sm">وضعیت نسخه</Label>
        <Select
          value={selectedStatus}
          options={STATUS_OPTIONS}
          onChange={(selected) => {
            const nextStatus = selected?.value ?? "DRAFT";
            pushToForm(nextStatus, segments);
          }}
        />
      </Box>

      <Box border="default" borderRadius="default" p="default">
        {segments.map((segment, index) => (
          <Box
            key={`prompt-segment-${index}`}
            mb="xxl"
            pb="xxl"
            borderBottom="default"
          >
            <Text mb="default" fontWeight="bold">
              بخش {index + 1}
            </Text>

            <Box mb="default">
              <Label size="sm">عنوان بخش</Label>
              <Input
                value={segment.label ?? ""}
                onChange={(e) =>
                  updateSegment(index, { label: e.target.value })
                }
              />
            </Box>

            <Box mb="default">
              <Label size="sm">توضیح (اختیاری)</Label>
              <Input
                value={segment.description ?? ""}
                onChange={(e) =>
                  updateSegment(index, { description: e.target.value })
                }
              />
            </Box>

            <Box mb="default" display="flex" alignItems="center">
              <CheckBox
                checked={segment.isRequired !== false}
                onChange={() =>
                  updateSegment(index, {
                    isRequired: segment.isRequired === false,
                  })
                }
              />
              <Label ml="sm" size="sm">
                محتوای این بخش الزامی است
              </Label>
            </Box>

            <Box mb="default">
              <Label size="sm">متن پرامپت</Label>
              <TextArea
                value={segment.content ?? ""}
                onChange={(e) =>
                  updateSegment(index, { content: e.target.value })
                }
                rows={8}
              />
            </Box>

            {segments.length > 1 ? (
              <Button
                type="button"
                size="sm"
                variant="text"
                color="danger"
                onClick={() => removeSegment(index)}
              >
                <Icon icon="Trash2" />
                حذف بخش
              </Button>
            ) : null}
          </Box>
        ))}

        <Button type="button" variant="outlined" onClick={addSegment}>
          <Icon icon="Plus" />
          افزودن بخش
        </Button>
      </Box>

      <FormMessage>{error?.message}</FormMessage>
    </FormGroup>
  );
};

export default PromptDefinitionEditor;
