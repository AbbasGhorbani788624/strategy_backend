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
} from "@adminjs/design-system";

const CHOICE_TYPES = new Set(["RADIO", "CHECKBOX"]);

const DEFAULT_TYPE_OPTIONS = [
  { value: "RADIO", label: "رادیویی" },
  { value: "CHECKBOX", label: "چک‌باکس" },
  { value: "TEXT", label: "متن" },
];

const emptyOption = () => ({ label: "", value: "" });

const emptyQuestion = (order) => ({
  label: "",
  type: "RADIO",
  required: true,
  order: order ?? 1,
  options: [emptyOption()],
});

const parseQuestionsJson = (raw) => {
  if (raw == null || raw === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeQuestions = (questions) =>
  questions.map((question, index) => ({
    label: String(question?.label ?? ""),
    type: String(question?.type ?? "RADIO"),
    required:
      question?.required === false ||
      question?.required === "false" ||
      question?.required === "0"
        ? false
        : true,
    order:
      question?.order === null || question?.order === undefined || question?.order === ""
        ? index + 1
        : Number(question.order) || index + 1,
    options: Array.isArray(question?.options)
      ? question.options.map((opt) => ({
          label: String(opt?.label ?? ""),
          value: String(opt?.value ?? ""),
        }))
      : [],
  }));

const FollowUpFormQuestionsEditor = (props) => {
  const { property, record, onChange } = props;
  const path = property.path || property.propertyPath || "questionsJson";
  const typeOptions = property.props?.typeOptions ?? DEFAULT_TYPE_OPTIONS;
  const error = record?.errors?.[path];

  const [questions, setQuestions] = useState(() =>
    normalizeQuestions(parseQuestionsJson(record?.params?.[path])),
  );

  const pushToForm = useCallback(
    (nextQuestions) => {
      const normalized = normalizeQuestions(nextQuestions);
      setQuestions(normalized);
      onChange(path, JSON.stringify(normalized));
    },
    [onChange, path],
  );

  const updateQuestion = (index, patch) => {
    const next = questions.map((question, i) =>
      i === index ? { ...question, ...patch } : question,
    );
    pushToForm(next);
  };

  const handleAddQuestion = () => {
    pushToForm([...questions, emptyQuestion(questions.length + 1)]);
  };

  const handleRemoveQuestion = (index) => {
    const next = questions
      .filter((_, i) => i !== index)
      .map((question, i) => ({ ...question, order: i + 1 }));
    pushToForm(next);
  };

  const updateOption = (questionIndex, optionIndex, field, value) => {
    const question = questions[questionIndex];
    const options = question.options.map((option, i) =>
      i === optionIndex ? { ...option, [field]: value } : option,
    );
    updateQuestion(questionIndex, { options });
  };

  const addOption = (questionIndex) => {
    const question = questions[questionIndex];
    updateQuestion(questionIndex, {
      options: [...question.options, emptyOption()],
    });
  };

  const removeOption = (questionIndex, optionIndex) => {
    const question = questions[questionIndex];
    const options = question.options.filter((_, i) => i !== optionIndex);
    updateQuestion(questionIndex, {
      options: options.length ? options : [emptyOption()],
    });
  };

  return (
    <FormGroup error={Boolean(error)}>
      <Label>سوالات فرم</Label>
      <Text mb="default" size="sm" color="grey60">
        هر سوال را با نوع و گزینه‌ها (برای رادیو/چک‌باکس) تعریف کنید؛ همه با
        یک ذخیره ثبت می‌شوند.
      </Text>

      <Box border="default" borderRadius="default" p="default">
        {questions.length === 0 ? (
          <Text size="sm" color="grey60" mb="default">
            هنوز سوالی اضافه نشده است.
          </Text>
        ) : (
          questions.map((question, questionIndex) => {
            const isChoice = CHOICE_TYPES.has(question.type);
            const selectedType =
              typeOptions.find((opt) => opt.value === question.type) ??
              typeOptions[0];

            return (
              <Box
                key={`follow-up-question-${questionIndex}`}
                mb="xxl"
                pb="xxl"
                borderBottom="default"
              >
                <Text mb="default" fontWeight="bold">
                  سوال {questionIndex + 1}
                </Text>

                <Box
                  flex
                  flexDirection="row"
                  flexWrap="wrap"
                  mb="default"
                  style={{ gap: 12 }}
                >
                  <Box flex="1" minWidth="220px">
                    <Label size="sm">متن سوال</Label>
                    <Input
                      value={question.label}
                      onChange={(e) =>
                        updateQuestion(questionIndex, { label: e.target.value })
                      }
                    />
                  </Box>
                  <Box width="180px">
                    <Label size="sm">نوع</Label>
                    <Select
                      value={selectedType}
                      options={typeOptions}
                      onChange={(selected) => {
                        const type = selected?.value ?? "RADIO";
                        const patch = { type };
                        if (!CHOICE_TYPES.has(type)) {
                          patch.options = [];
                        } else if (!question.options.length) {
                          patch.options = [emptyOption()];
                        }
                        updateQuestion(questionIndex, patch);
                      }}
                    />
                  </Box>
                  <Box width="100px">
                    <Label size="sm">ترتیب</Label>
                    <Input
                      type="number"
                      value={question.order}
                      onChange={(e) =>
                        updateQuestion(questionIndex, { order: e.target.value })
                      }
                    />
                  </Box>
                  <Box display="flex" alignItems="center" pt="lg">
                    <CheckBox
                      checked={question.required}
                      onChange={() =>
                        updateQuestion(questionIndex, {
                          required: !question.required,
                        })
                      }
                    />
                    <Label ml="sm" size="sm">
                      الزامی
                    </Label>
                  </Box>
                </Box>

                {isChoice ? (
                  <Box ml="default" pl="default" borderLeft="default">
                    <Label size="sm" mb="sm">
                      گزینه‌ها
                    </Label>
                    {question.options.map((option, optionIndex) => (
                      <Box
                        key={`q-${questionIndex}-opt-${optionIndex}`}
                        flex
                        flexDirection="row"
                        flexWrap="wrap"
                        mb="sm"
                        style={{ gap: 8 }}
                      >
                        <Box flex="1" minWidth="160px">
                          <Input
                            placeholder="عنوان گزینه"
                            value={option.label}
                            onChange={(e) =>
                              updateOption(
                                questionIndex,
                                optionIndex,
                                "label",
                                e.target.value,
                              )
                            }
                          />
                        </Box>
                        <Box flex="1" minWidth="140px">
                          <Input
                            placeholder="value"
                            value={option.value}
                            onChange={(e) =>
                              updateOption(
                                questionIndex,
                                optionIndex,
                                "value",
                                e.target.value,
                              )
                            }
                          />
                        </Box>
                        <Button
                          type="button"
                          size="icon"
                          variant="text"
                          color="danger"
                          onClick={() =>
                            removeOption(questionIndex, optionIndex)
                          }
                        >
                          <Icon icon="Trash2" />
                        </Button>
                      </Box>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="text"
                      onClick={() => addOption(questionIndex)}
                    >
                      <Icon icon="Plus" />
                      افزودن گزینه
                    </Button>
                  </Box>
                ) : null}

                <Box mt="default">
                  <Button
                    type="button"
                    size="sm"
                    variant="text"
                    color="danger"
                    onClick={() => handleRemoveQuestion(questionIndex)}
                  >
                    <Icon icon="Trash2" />
                    حذف سوال
                  </Button>
                </Box>
              </Box>
            );
          })
        )}

        <Button type="button" variant="outlined" onClick={handleAddQuestion}>
          <Icon icon="Plus" />
          افزودن سوال
        </Button>
      </Box>

      <FormMessage>{error?.message}</FormMessage>
    </FormGroup>
  );
};

export default FollowUpFormQuestionsEditor;
