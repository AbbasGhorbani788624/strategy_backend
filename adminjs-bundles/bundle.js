(function (React, designSystem, reactRouter, adminjs) {
  'use strict';

  function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

  var React__default = /*#__PURE__*/_interopDefault(React);

  const normalizeUploadPath = filePath => {
    if (!filePath || typeof filePath !== "string") {
      return null;
    }
    const normalized = filePath.replaceAll("\\", "/");
    const uploadsIndex = normalized.indexOf("uploads/");
    if (uploadsIndex !== -1) {
      return `/${normalized.slice(uploadsIndex)}`;
    }
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  };
  const DownloadFileAttachment = props => {
    const navigate = reactRouter.useNavigate();
    const [error, setError] = React.useState(null);
    React.useEffect(() => {
      const publicPath = normalizeUploadPath(props.record?.params?.filePath);
      if (!publicPath) {
        setError("فایلی برای دانلود وجود ندارد");
        return undefined;
      }
      const fileName = props.record?.params?.originalName || props.record?.params?.fileName || pathBasename(publicPath);
      const downloadUrl = `/download-upload?path=${encodeURIComponent(publicPath.slice(1))}`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", fileName);
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      const timer = window.setTimeout(() => {
        navigate(-1);
      }, 200);
      return () => {
        window.clearTimeout(timer);
      };
    }, [navigate, props.record]);
    if (error) {
      return /*#__PURE__*/React__default.default.createElement(designSystem.MessageBox, {
        variant: "danger",
        message: error
      });
    }
    return /*#__PURE__*/React__default.default.createElement(designSystem.Loader, null);
  };
  const pathBasename = filePath => {
    const parts = String(filePath).split("/");
    return parts[parts.length - 1] || "download";
  };

  const api = new adminjs.ApiClient();
  const LOADING_COPY = {
    generateInsight: {
      title: "در حال دریافت تحلیل AI…",
      hint: "لطفاً صبر کنید. این درخواست ممکن است تا یک دقیقه طول بکشد."
    },
    generateIndustryInsight: {
      title: "در حال دریافت تحلیل صنعت…",
      hint: "لطفاً صبر کنید. این درخواست ممکن است تا دو دقیقه طول بکشد."
    }
  };
  const AsyncRecordActionLoader = props => {
    const {
      action,
      record,
      resource
    } = props;
    const addNotice = adminjs.useNotice();
    const navigate = reactRouter.useNavigate();
    const startedRef = React.useRef(false);
    const [error, setError] = React.useState(null);
    const copy = LOADING_COPY[action?.name] ?? {
      title: "در حال انجام عملیات…",
      hint: "لطفاً صبر کنید."
    };
    React.useEffect(() => {
      if (startedRef.current) {
        return undefined;
      }
      startedRef.current = true;
      let cancelled = false;
      const run = async () => {
        try {
          const response = await api.recordAction({
            resourceId: resource.id,
            recordId: record.id,
            actionName: action.name
          }, {
            method: "post"
          });
          if (cancelled) {
            return;
          }
          const {
            notice,
            redirectUrl
          } = response.data ?? {};
          if (notice) {
            addNotice(notice);
          }
          if (redirectUrl) {
            navigate(redirectUrl);
          }
        } catch (err) {
          if (cancelled) {
            return;
          }
          console.error("[AsyncRecordActionLoader]", err);
          setError("خطا در انجام درخواست. دوباره تلاش کنید.");
          addNotice({
            message: "خطا در انجام درخواست",
            type: "error"
          });
        }
      };
      run();
      return () => {
        cancelled = true;
      };
    }, [action.name, addNotice, navigate, record.id, resource.id]);
    if (error) {
      return /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        p: "xxl"
      }, /*#__PURE__*/React__default.default.createElement(designSystem.MessageBox, {
        variant: "danger",
        message: error
      }));
    }
    return /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flex: true,
      variant: "grey",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      p: "xxl",
      minHeight: 320
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
      icon: "Loader",
      spin: true,
      size: 48
    }), /*#__PURE__*/React__default.default.createElement(designSystem.H3, {
      mt: "lg"
    }, copy.title), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      mt: "default",
      opacity: 0.8
    }, copy.hint));
  };

  const normalizeScalar = raw => {
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
            return parsed.map(item => String(item).trim()).filter(Boolean);
          }
        } catch {
          return [trimmed];
        }
      }
      return [trimmed];
    }
    if (Array.isArray(raw)) {
      return raw.map(item => String(item).trim()).filter(Boolean);
    }
    if (typeof raw === "object") {
      return Object.values(raw).map(item => String(item).trim()).filter(Boolean);
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
    const fromFlat = Object.keys(params).filter(key => key.startsWith(flatPrefix)).sort((left, right) => {
      const leftIndex = Number(left.slice(flatPrefix.length));
      const rightIndex = Number(right.slice(flatPrefix.length));
      return leftIndex - rightIndex;
    }).map(key => String(params[key] ?? "").trim()).filter(Boolean);
    return [...new Set(fromFlat)];
  };
  const ProfileFieldKeyMultiSelect = props => {
    const {
      property,
      record,
      onChange
    } = props;
    const path = property.path || property.propertyPath || "profileFieldKeys";
    const options = property.availableValues ?? property.props?.availableValues ?? [];
    const error = record?.errors?.[path];
    const [selectedKeys, setSelectedKeys] = React.useState(() => getSelectedFromRecordParams(record?.params, path));
    const selectedSet = new Set(selectedKeys);
    const applySelection = React.useCallback(nextKeys => {
      const unique = [...new Set(nextKeys.filter(Boolean))];
      setSelectedKeys(unique);
      onChange(path, unique);
    }, [onChange, path]);
    const handleToggle = value => {
      const next = selectedSet.has(value) ? selectedKeys.filter(item => item !== value) : [...selectedKeys, value];
      applySelection(next);
    };
    return /*#__PURE__*/React__default.default.createElement(designSystem.FormGroup, {
      error: Boolean(error)
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
      required: property.isRequired
    }, "Profile Field Key"), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      mb: "default",
      size: "sm",
      color: "grey60"
    }, "\u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0686\u0646\u062F \u0641\u06CC\u0644\u062F \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u0631\u0627 \u0647\u0645\u200C\u0632\u0645\u0627\u0646 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F\u061B \u0628\u0631\u0627\u06CC \u0647\u0631 \u0645\u0648\u0631\u062F \u06CC\u06A9 \u0631\u06A9\u0648\u0631\u062F \u062C\u062F\u0627 \u0630\u062E\u06CC\u0631\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F."), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      maxHeight: 360,
      overflowY: "auto",
      p: "default",
      border: "default",
      borderRadius: "default"
    }, options.map(option => {
      const inputId = `${path}-${option.value}`;
      const checked = selectedSet.has(option.value);
      return /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        key: option.value,
        mb: "sm"
      }, /*#__PURE__*/React__default.default.createElement("label", {
        htmlFor: inputId,
        style: {
          cursor: "pointer",
          display: "flex",
          alignItems: "flex-start",
          gap: 8
        }
      }, /*#__PURE__*/React__default.default.createElement("input", {
        type: "checkbox",
        id: inputId,
        name: `${path}.${option.value}`,
        checked: checked,
        onChange: () => handleToggle(option.value),
        style: {
          marginTop: 4,
          flexShrink: 0
        }
      }), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
        as: "span"
      }, option.label)));
    })), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      mt: "sm",
      size: "sm",
      color: "grey60"
    }, selectedKeys.length, " \u0645\u0648\u0631\u062F \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F\u0647"), /*#__PURE__*/React__default.default.createElement(designSystem.FormMessage, null, error?.message));
  };

  const CHOICE_TYPES$1 = new Set(["RADIO", "CHECKBOX"]);
  const SCORE_OPTIONS = [{
    value: "",
    label: "—"
  }, {
    value: "1",
    label: "1"
  }, {
    value: "2",
    label: "2"
  }, {
    value: "3",
    label: "3"
  }, {
    value: "4",
    label: "4"
  }, {
    value: "5",
    label: "5"
  }];
  const emptyRow = order => ({
    label: "",
    value: "",
    score: "",
    order: order ?? 1
  });
  const parseOptionsJson = raw => {
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
  const normalizeRows = rows => rows.map((row, index) => ({
    label: String(row?.label ?? ""),
    value: String(row?.value ?? ""),
    score: row?.score === null || row?.score === undefined || row?.score === "" ? "" : String(row.score),
    order: row?.order === null || row?.order === undefined || row?.order === "" ? index + 1 : Number(row.order) || index + 1
  }));
  const FormQuestionOptionsEditor = props => {
    const {
      property,
      record,
      onChange
    } = props;
    const path = property.path || property.propertyPath || "optionsJson";
    const error = record?.errors?.[path];
    const questionType = String(record?.params?.type ?? "");
    const isScored = record?.params?.isScored === true || record?.params?.isScored === "true" || record?.params?.isScored === "on" || record?.params?.isScored === 1;
    const weightRaw = record?.params?.weight;
    const hasWeight = weightRaw !== null && weightRaw !== undefined && String(weightRaw).trim() !== "";
    const requiresScore = isScored && hasWeight;
    const isChoiceType = CHOICE_TYPES$1.has(questionType);
    const [rows, setRows] = React.useState(() => normalizeRows(parseOptionsJson(record?.params?.[path])));
    const pushToForm = React.useCallback(nextRows => {
      const normalized = normalizeRows(nextRows);
      setRows(normalized);
      onChange(path, JSON.stringify(normalized));
    }, [onChange, path]);
    const handleFieldChange = (index, field, value) => {
      const next = rows.map((row, i) => i === index ? {
        ...row,
        [field]: value
      } : row);
      pushToForm(next);
    };
    const handleAddRow = () => {
      pushToForm([...rows, emptyRow(rows.length + 1)]);
    };
    const handleRemoveRow = index => {
      const next = rows.filter((_, i) => i !== index).map((row, i) => ({
        ...row,
        order: i + 1
      }));
      pushToForm(next);
    };
    React.useEffect(() => {
      if (!isChoiceType && rows.length > 0) {
        pushToForm([]);
      }
    }, [isChoiceType, rows.length, pushToForm]);
    const hint = React.useMemo(() => {
      if (!isChoiceType) {
        return "برای سوالات متنی یا عددی گزینه‌ای لازم نیست.";
      }
      if (requiresScore) {
        return "این سوال امتیازی است؛ برای هر گزینه نمره (۱ تا ۵) الزامی است.";
      }
      return "عنوان و مقدار هر گزینه را وارد کنید.";
    }, [isChoiceType, requiresScore]);
    if (!isChoiceType) {
      return /*#__PURE__*/React__default.default.createElement(designSystem.FormGroup, null, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "\u06AF\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u0633\u0648\u0627\u0644"), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
        size: "sm",
        color: "grey60"
      }, hint));
    }
    return /*#__PURE__*/React__default.default.createElement(designSystem.FormGroup, {
      error: Boolean(error)
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "\u06AF\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u0633\u0648\u0627\u0644"), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      mb: "default",
      size: "sm",
      color: "grey60"
    }, hint), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      border: "default",
      borderRadius: "default",
      p: "default"
    }, rows.length === 0 ? /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      size: "sm",
      color: "grey60",
      mb: "default"
    }, "\u0647\u0646\u0648\u0632 \u06AF\u0632\u06CC\u0646\u0647\u200C\u0627\u06CC \u0627\u0636\u0627\u0641\u0647 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.") : rows.map((row, index) => /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      key: `option-row-${index}`,
      mb: "lg",
      pb: "lg",
      borderBottom: "default"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flex: true,
      flexDirection: "row",
      flexWrap: "wrap",
      style: {
        gap: 12
      }
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flex: "1",
      minWidth: "200px"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
      size: "sm"
    }, "\u0639\u0646\u0648\u0627\u0646 \u06AF\u0632\u06CC\u0646\u0647"), /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
      value: row.label,
      onChange: e => handleFieldChange(index, "label", e.target.value)
    })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      flex: "1",
      minWidth: "160px"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
      size: "sm"
    }, "\u0645\u0642\u062F\u0627\u0631 (value)"), /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
      value: row.value,
      onChange: e => handleFieldChange(index, "value", e.target.value)
    })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      width: "100px"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
      size: "sm"
    }, "\u062A\u0631\u062A\u06CC\u0628"), /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
      type: "number",
      value: row.order,
      onChange: e => handleFieldChange(index, "order", e.target.value)
    })), requiresScore ? /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      width: "120px"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
      size: "sm"
    }, "\u0646\u0645\u0631\u0647"), /*#__PURE__*/React__default.default.createElement(designSystem.Select, {
      value: SCORE_OPTIONS.find(opt => opt.value === String(row.score)) ?? SCORE_OPTIONS[0],
      options: SCORE_OPTIONS.filter(opt => opt.value !== ""),
      onChange: selected => handleFieldChange(index, "score", selected?.value ?? "")
    })) : null, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      display: "flex",
      alignItems: "flex-end"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Button, {
      type: "button",
      size: "icon",
      variant: "text",
      color: "danger",
      onClick: () => handleRemoveRow(index),
      title: "\u062D\u0630\u0641 \u06AF\u0632\u06CC\u0646\u0647"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
      icon: "Trash2"
    })))))), /*#__PURE__*/React__default.default.createElement(designSystem.Button, {
      type: "button",
      variant: "outlined",
      onClick: handleAddRow
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
      icon: "Plus"
    }), "\u0627\u0641\u0632\u0648\u062F\u0646 \u06AF\u0632\u06CC\u0646\u0647")), /*#__PURE__*/React__default.default.createElement(designSystem.FormMessage, null, error?.message));
  };

  const CHOICE_TYPES = new Set(["RADIO", "CHECKBOX"]);
  const DEFAULT_TYPE_OPTIONS = [{
    value: "RADIO",
    label: "رادیویی"
  }, {
    value: "CHECKBOX",
    label: "چک‌باکس"
  }, {
    value: "TEXT",
    label: "متن"
  }];
  const emptyOption = () => ({
    label: "",
    value: ""
  });
  const emptyQuestion = order => ({
    label: "",
    type: "RADIO",
    required: true,
    order: order ?? 1,
    options: [emptyOption()]
  });
  const parseQuestionsJson = raw => {
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
  const normalizeQuestions = questions => questions.map((question, index) => ({
    label: String(question?.label ?? ""),
    type: String(question?.type ?? "RADIO"),
    required: question?.required === false || question?.required === "false" || question?.required === "0" ? false : true,
    order: question?.order === null || question?.order === undefined || question?.order === "" ? index + 1 : Number(question.order) || index + 1,
    options: Array.isArray(question?.options) ? question.options.map(opt => ({
      label: String(opt?.label ?? ""),
      value: String(opt?.value ?? "")
    })) : []
  }));
  const FollowUpFormQuestionsEditor = props => {
    const {
      property,
      record,
      onChange
    } = props;
    const path = property.path || property.propertyPath || "questionsJson";
    const typeOptions = property.props?.typeOptions ?? DEFAULT_TYPE_OPTIONS;
    const error = record?.errors?.[path];
    const [questions, setQuestions] = React.useState(() => normalizeQuestions(parseQuestionsJson(record?.params?.[path])));
    const pushToForm = React.useCallback(nextQuestions => {
      const normalized = normalizeQuestions(nextQuestions);
      setQuestions(normalized);
      onChange(path, JSON.stringify(normalized));
    }, [onChange, path]);
    const updateQuestion = (index, patch) => {
      const next = questions.map((question, i) => i === index ? {
        ...question,
        ...patch
      } : question);
      pushToForm(next);
    };
    const handleAddQuestion = () => {
      pushToForm([...questions, emptyQuestion(questions.length + 1)]);
    };
    const handleRemoveQuestion = index => {
      const next = questions.filter((_, i) => i !== index).map((question, i) => ({
        ...question,
        order: i + 1
      }));
      pushToForm(next);
    };
    const updateOption = (questionIndex, optionIndex, field, value) => {
      const question = questions[questionIndex];
      const options = question.options.map((option, i) => i === optionIndex ? {
        ...option,
        [field]: value
      } : option);
      updateQuestion(questionIndex, {
        options
      });
    };
    const addOption = questionIndex => {
      const question = questions[questionIndex];
      updateQuestion(questionIndex, {
        options: [...question.options, emptyOption()]
      });
    };
    const removeOption = (questionIndex, optionIndex) => {
      const question = questions[questionIndex];
      const options = question.options.filter((_, i) => i !== optionIndex);
      updateQuestion(questionIndex, {
        options: options.length ? options : [emptyOption()]
      });
    };
    return /*#__PURE__*/React__default.default.createElement(designSystem.FormGroup, {
      error: Boolean(error)
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "\u0633\u0648\u0627\u0644\u0627\u062A \u0641\u0631\u0645"), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      mb: "default",
      size: "sm",
      color: "grey60"
    }, "\u0647\u0631 \u0633\u0648\u0627\u0644 \u0631\u0627 \u0628\u0627 \u0646\u0648\u0639 \u0648 \u06AF\u0632\u06CC\u0646\u0647\u200C\u0647\u0627 (\u0628\u0631\u0627\u06CC \u0631\u0627\u062F\u06CC\u0648/\u0686\u06A9\u200C\u0628\u0627\u06A9\u0633) \u062A\u0639\u0631\u06CC\u0641 \u06A9\u0646\u06CC\u062F\u061B \u0647\u0645\u0647 \u0628\u0627 \u06CC\u06A9 \u0630\u062E\u06CC\u0631\u0647 \u062B\u0628\u062A \u0645\u06CC\u200C\u0634\u0648\u0646\u062F."), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      border: "default",
      borderRadius: "default",
      p: "default"
    }, questions.length === 0 ? /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      size: "sm",
      color: "grey60",
      mb: "default"
    }, "\u0647\u0646\u0648\u0632 \u0633\u0648\u0627\u0644\u06CC \u0627\u0636\u0627\u0641\u0647 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.") : questions.map((question, questionIndex) => {
      const isChoice = CHOICE_TYPES.has(question.type);
      const selectedType = typeOptions.find(opt => opt.value === question.type) ?? typeOptions[0];
      return /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        key: `follow-up-question-${questionIndex}`,
        mb: "xxl",
        pb: "xxl",
        borderBottom: "default"
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
        mb: "default",
        fontWeight: "bold"
      }, "\u0633\u0648\u0627\u0644 ", questionIndex + 1), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        flex: true,
        flexDirection: "row",
        flexWrap: "wrap",
        mb: "default",
        style: {
          gap: 12
        }
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        flex: "1",
        minWidth: "220px"
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
        size: "sm"
      }, "\u0645\u062A\u0646 \u0633\u0648\u0627\u0644"), /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
        value: question.label,
        onChange: e => updateQuestion(questionIndex, {
          label: e.target.value
        })
      })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        width: "180px"
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
        size: "sm"
      }, "\u0646\u0648\u0639"), /*#__PURE__*/React__default.default.createElement(designSystem.Select, {
        value: selectedType,
        options: typeOptions,
        onChange: selected => {
          const type = selected?.value ?? "RADIO";
          const patch = {
            type
          };
          if (!CHOICE_TYPES.has(type)) {
            patch.options = [];
          } else if (!question.options.length) {
            patch.options = [emptyOption()];
          }
          updateQuestion(questionIndex, patch);
        }
      })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        width: "100px"
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
        size: "sm"
      }, "\u062A\u0631\u062A\u06CC\u0628"), /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
        type: "number",
        value: question.order,
        onChange: e => updateQuestion(questionIndex, {
          order: e.target.value
        })
      })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        display: "flex",
        alignItems: "center",
        pt: "lg"
      }, /*#__PURE__*/React__default.default.createElement(designSystem.CheckBox, {
        checked: question.required,
        onChange: () => updateQuestion(questionIndex, {
          required: !question.required
        })
      }), /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
        ml: "sm",
        size: "sm"
      }, "\u0627\u0644\u0632\u0627\u0645\u06CC"))), isChoice ? /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        ml: "default",
        pl: "default",
        borderLeft: "default"
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
        size: "sm",
        mb: "sm"
      }, "\u06AF\u0632\u06CC\u0646\u0647\u200C\u0647\u0627"), question.options.map((option, optionIndex) => /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        key: `q-${questionIndex}-opt-${optionIndex}`,
        flex: true,
        flexDirection: "row",
        flexWrap: "wrap",
        mb: "sm",
        style: {
          gap: 8
        }
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        flex: "1",
        minWidth: "160px"
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
        placeholder: "\u0639\u0646\u0648\u0627\u0646 \u06AF\u0632\u06CC\u0646\u0647",
        value: option.label,
        onChange: e => updateOption(questionIndex, optionIndex, "label", e.target.value)
      })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        flex: "1",
        minWidth: "140px"
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
        placeholder: "value",
        value: option.value,
        onChange: e => updateOption(questionIndex, optionIndex, "value", e.target.value)
      })), /*#__PURE__*/React__default.default.createElement(designSystem.Button, {
        type: "button",
        size: "icon",
        variant: "text",
        color: "danger",
        onClick: () => removeOption(questionIndex, optionIndex)
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
        icon: "Trash2"
      })))), /*#__PURE__*/React__default.default.createElement(designSystem.Button, {
        type: "button",
        size: "sm",
        variant: "text",
        onClick: () => addOption(questionIndex)
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
        icon: "Plus"
      }), "\u0627\u0641\u0632\u0648\u062F\u0646 \u06AF\u0632\u06CC\u0646\u0647")) : null, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        mt: "default"
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Button, {
        type: "button",
        size: "sm",
        variant: "text",
        color: "danger",
        onClick: () => handleRemoveQuestion(questionIndex)
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
        icon: "Trash2"
      }), "\u062D\u0630\u0641 \u0633\u0648\u0627\u0644")));
    }), /*#__PURE__*/React__default.default.createElement(designSystem.Button, {
      type: "button",
      variant: "outlined",
      onClick: handleAddQuestion
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
      icon: "Plus"
    }), "\u0627\u0641\u0632\u0648\u062F\u0646 \u0633\u0648\u0627\u0644")), /*#__PURE__*/React__default.default.createElement(designSystem.FormMessage, null, error?.message));
  };

  const STATUS_OPTIONS = [{
    value: "DRAFT",
    label: "پیش‌نویس"
  }, {
    value: "PUBLISHED",
    label: "منتشر شده"
  }, {
    value: "ARCHIVED",
    label: "آرشیو"
  }];
  const emptySegment = order => ({
    label: `بخش ${order}`,
    description: "",
    isRequired: true,
    content: ""
  });
  const parseEditorJson = raw => {
    if (!raw) {
      return {
        status: "DRAFT",
        segments: [emptySegment(1)]
      };
    }
    try {
      const parsed = JSON.parse(String(raw));
      return {
        status: parsed.status || "DRAFT",
        segments: Array.isArray(parsed.segments) && parsed.segments.length ? parsed.segments : [emptySegment(1)]
      };
    } catch {
      return {
        status: "DRAFT",
        segments: [emptySegment(1)]
      };
    }
  };
  const PromptDefinitionEditor = props => {
    const {
      property,
      record,
      onChange
    } = props;
    const path = property.path || property.propertyPath || "promptEditorJson";
    const error = record?.errors?.[path];
    const initial = parseEditorJson(record?.params?.[path]);
    const [status, setStatus] = React.useState(initial.status);
    const [segments, setSegments] = React.useState(initial.segments);
    const pushToForm = React.useCallback((nextStatus, nextSegments) => {
      setStatus(nextStatus);
      setSegments(nextSegments);
      onChange(path, JSON.stringify({
        status: nextStatus,
        segments: nextSegments
      }));
    }, [onChange, path]);
    const updateSegment = (index, patch) => {
      const next = segments.map((segment, i) => i === index ? {
        ...segment,
        ...patch
      } : segment);
      pushToForm(status, next);
    };
    const addSegment = () => {
      pushToForm(status, [...segments, emptySegment(segments.length + 1)]);
    };
    const removeSegment = index => {
      if (segments.length <= 1) {
        return;
      }
      pushToForm(status, segments.filter((_, i) => i !== index));
    };
    const selectedStatus = STATUS_OPTIONS.find(option => option.value === status) ?? STATUS_OPTIONS[0];
    return /*#__PURE__*/React__default.default.createElement(designSystem.FormGroup, {
      error: Boolean(error)
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "\u0628\u062E\u0634\u200C\u0647\u0627 \u0648 \u0645\u062A\u0646 \u067E\u0631\u0627\u0645\u067E\u062A"), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      mb: "default",
      size: "sm",
      color: "grey60"
    }, "\u062A\u0639\u062F\u0627\u062F \u0628\u062E\u0634\u200C\u0647\u0627 \u0631\u0627 \u0628\u0627 \xAB\u0627\u0641\u0632\u0648\u062F\u0646 \u0628\u062E\u0634\xBB \u0645\u0634\u062E\u0635 \u06A9\u0646\u06CC\u062F \u0648 \u0645\u062A\u0646 \u0647\u0631 \u0628\u062E\u0634 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F. \u062A\u0631\u062A\u06CC\u0628 \u0628\u062E\u0634\u200C\u0647\u0627 \u0647\u0645\u0627\u0646 \u062A\u0631\u062A\u06CC\u0628 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u062F\u0631 AI \u0627\u0633\u062A (\u0628\u062E\u0634 \u06F1\u060C \u06F2\u060C \u06F3\u060C \u2026)."), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      mb: "lg",
      width: "240px"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
      size: "sm"
    }, "\u0648\u0636\u0639\u06CC\u062A \u0646\u0633\u062E\u0647"), /*#__PURE__*/React__default.default.createElement(designSystem.Select, {
      value: selectedStatus,
      options: STATUS_OPTIONS,
      onChange: selected => {
        const nextStatus = selected?.value ?? "DRAFT";
        pushToForm(nextStatus, segments);
      }
    })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      border: "default",
      borderRadius: "default",
      p: "default"
    }, segments.map((segment, index) => /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      key: `prompt-segment-${index}`,
      mb: "xxl",
      pb: "xxl",
      borderBottom: "default"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      mb: "default",
      fontWeight: "bold"
    }, "\u0628\u062E\u0634 ", index + 1), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      mb: "default"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
      size: "sm"
    }, "\u0639\u0646\u0648\u0627\u0646 \u0628\u062E\u0634"), /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
      value: segment.label ?? "",
      onChange: e => updateSegment(index, {
        label: e.target.value
      })
    })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      mb: "default"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
      size: "sm"
    }, "\u062A\u0648\u0636\u06CC\u062D (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)"), /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
      value: segment.description ?? "",
      onChange: e => updateSegment(index, {
        description: e.target.value
      })
    })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      mb: "default",
      display: "flex",
      alignItems: "center"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.CheckBox, {
      checked: segment.isRequired !== false,
      onChange: () => updateSegment(index, {
        isRequired: segment.isRequired === false
      })
    }), /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
      ml: "sm",
      size: "sm"
    }, "\u0645\u062D\u062A\u0648\u0627\u06CC \u0627\u06CC\u0646 \u0628\u062E\u0634 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A")), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      mb: "default"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, {
      size: "sm"
    }, "\u0645\u062A\u0646 \u067E\u0631\u0627\u0645\u067E\u062A"), /*#__PURE__*/React__default.default.createElement(designSystem.TextArea, {
      value: segment.content ?? "",
      onChange: e => updateSegment(index, {
        content: e.target.value
      }),
      rows: 8
    })), segments.length > 1 ? /*#__PURE__*/React__default.default.createElement(designSystem.Button, {
      type: "button",
      size: "sm",
      variant: "text",
      color: "danger",
      onClick: () => removeSegment(index)
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
      icon: "Trash2"
    }), "\u062D\u0630\u0641 \u0628\u062E\u0634") : null)), /*#__PURE__*/React__default.default.createElement(designSystem.Button, {
      type: "button",
      variant: "outlined",
      onClick: addSegment
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Icon, {
      icon: "Plus"
    }), "\u0627\u0641\u0632\u0648\u062F\u0646 \u0628\u062E\u0634")), /*#__PURE__*/React__default.default.createElement(designSystem.FormMessage, null, error?.message));
  };

  const Edit = ({ property, record, onChange }) => {
      const { translateProperty } = adminjs.useTranslation();
      const { params } = record;
      const { custom } = property;
      const path = adminjs.flat.get(params, custom.filePathProperty);
      const key = adminjs.flat.get(params, custom.keyProperty);
      const file = adminjs.flat.get(params, custom.fileProperty);
      const [originalKey, setOriginalKey] = React.useState(key);
      const [filesToUpload, setFilesToUpload] = React.useState([]);
      React.useEffect(() => {
          // it means means that someone hit save and new file has been uploaded
          // in this case fliesToUpload should be cleared.
          // This happens when user turns off redirect after new/edit
          if ((typeof key === 'string' && key !== originalKey)
              || (typeof key !== 'string' && !originalKey)
              || (typeof key !== 'string' && Array.isArray(key) && key.length !== originalKey.length)) {
              setOriginalKey(key);
              setFilesToUpload([]);
          }
      }, [key, originalKey]);
      const onUpload = (files) => {
          setFilesToUpload(files);
          onChange(custom.fileProperty, files);
      };
      const handleRemove = () => {
          onChange(custom.fileProperty, null);
      };
      const handleMultiRemove = (singleKey) => {
          const index = (adminjs.flat.get(record.params, custom.keyProperty) || []).indexOf(singleKey);
          const filesToDelete = adminjs.flat.get(record.params, custom.filesToDeleteProperty) || [];
          if (path && path.length > 0) {
              const newPath = path.map((currentPath, i) => (i !== index ? currentPath : null));
              let newParams = adminjs.flat.set(record.params, custom.filesToDeleteProperty, [...filesToDelete, index]);
              newParams = adminjs.flat.set(newParams, custom.filePathProperty, newPath);
              onChange({
                  ...record,
                  params: newParams,
              });
          }
          else {
              // eslint-disable-next-line no-console
              console.log('You cannot remove file when there are no uploaded files yet');
          }
      };
      return (React__default.default.createElement(designSystem.FormGroup, null,
          React__default.default.createElement(designSystem.Label, null, translateProperty(property.label, property.resourceId)),
          React__default.default.createElement(designSystem.DropZone, { onChange: onUpload, multiple: custom.multiple, validate: {
                  mimeTypes: custom.mimeTypes,
                  maxSize: custom.maxSize,
              }, files: filesToUpload }),
          !custom.multiple && key && path && !filesToUpload.length && file !== null && (React__default.default.createElement(designSystem.DropZoneItem, { filename: key, src: path, onRemove: handleRemove })),
          custom.multiple && key && key.length && path ? (React__default.default.createElement(React__default.default.Fragment, null, key.map((singleKey, index) => {
              // when we remove items we set only path index to nulls.
              // key is still there. This is because
              // we have to maintain all the indexes. So here we simply filter out elements which
              // were removed and display only what was left
              const currentPath = path[index];
              return currentPath ? (React__default.default.createElement(designSystem.DropZoneItem, { key: singleKey, filename: singleKey, src: path[index], onRemove: () => handleMultiRemove(singleKey) })) : '';
          }))) : ''));
  };

  const AudioMimeTypes = [
      'audio/aac',
      'audio/midi',
      'audio/x-midi',
      'audio/mpeg',
      'audio/ogg',
      'application/ogg',
      'audio/opus',
      'audio/wav',
      'audio/webm',
      'audio/3gpp2',
  ];
  const ImageMimeTypes = [
      'image/bmp',
      'image/gif',
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'image/vnd.microsoft.icon',
      'image/tiff',
      'image/webp',
  ];

  // eslint-disable-next-line import/no-extraneous-dependencies
  const SingleFile = (props) => {
      const { name, path, mimeType, width } = props;
      if (path && path.length) {
          if (mimeType && ImageMimeTypes.includes(mimeType)) {
              return (React__default.default.createElement("img", { src: path, style: { maxHeight: width, maxWidth: width }, alt: name }));
          }
          if (mimeType && AudioMimeTypes.includes(mimeType)) {
              return (React__default.default.createElement("audio", { controls: true, src: path },
                  "Your browser does not support the",
                  React__default.default.createElement("code", null, "audio"),
                  React__default.default.createElement("track", { kind: "captions" })));
          }
      }
      return (React__default.default.createElement(designSystem.Box, null,
          React__default.default.createElement(designSystem.Button, { as: "a", href: path, ml: "default", size: "sm", rounded: true, target: "_blank" },
              React__default.default.createElement(designSystem.Icon, { icon: "DocumentDownload", color: "white", mr: "default" }),
              name)));
  };
  const File = ({ width, record, property }) => {
      const { custom } = property;
      let path = adminjs.flat.get(record?.params, custom.filePathProperty);
      if (!path) {
          return null;
      }
      const name = adminjs.flat.get(record?.params, custom.fileNameProperty ? custom.fileNameProperty : custom.keyProperty);
      const mimeType = custom.mimeTypeProperty
          && adminjs.flat.get(record?.params, custom.mimeTypeProperty);
      if (!property.custom.multiple) {
          if (custom.opts && custom.opts.baseUrl) {
              path = `${custom.opts.baseUrl}/${name}`;
          }
          return (React__default.default.createElement(SingleFile, { path: path, name: name, width: width, mimeType: mimeType }));
      }
      if (custom.opts && custom.opts.baseUrl) {
          const baseUrl = custom.opts.baseUrl || '';
          path = path.map((singlePath, index) => `${baseUrl}/${name[index]}`);
      }
      return (React__default.default.createElement(React__default.default.Fragment, null, path.map((singlePath, index) => (React__default.default.createElement(SingleFile, { key: singlePath, path: singlePath, name: name[index], width: width, mimeType: mimeType[index] })))));
  };

  const List = (props) => (React__default.default.createElement(File, { width: 100, ...props }));

  const Show = (props) => {
      const { property } = props;
      const { translateProperty } = adminjs.useTranslation();
      return (React__default.default.createElement(designSystem.FormGroup, null,
          React__default.default.createElement(designSystem.Label, null, translateProperty(property.label, property.resourceId)),
          React__default.default.createElement(File, { width: "100%", ...props })));
  };

  AdminJS.UserComponents = {};
  AdminJS.UserComponents.DownloadFileAttachment = DownloadFileAttachment;
  AdminJS.UserComponents.AsyncRecordActionLoader = AsyncRecordActionLoader;
  AdminJS.UserComponents.ProfileFieldKeyMultiSelect = ProfileFieldKeyMultiSelect;
  AdminJS.UserComponents.FormQuestionOptionsEditor = FormQuestionOptionsEditor;
  AdminJS.UserComponents.FollowUpFormQuestionsEditor = FollowUpFormQuestionsEditor;
  AdminJS.UserComponents.PromptDefinitionEditor = PromptDefinitionEditor;
  AdminJS.UserComponents.UploadEditComponent = Edit;
  AdminJS.UserComponents.UploadListComponent = List;
  AdminJS.UserComponents.UploadShowComponent = Show;

})(React, AdminJSDesignSystem, ReactRouter, AdminJS);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlcyI6WyIuLi9zcmMvYWRtaW4tY29tcG9uZW50cy9Eb3dubG9hZEZpbGVBdHRhY2htZW50LmpzeCIsIi4uL3NyYy9hZG1pbi1jb21wb25lbnRzL0FzeW5jUmVjb3JkQWN0aW9uTG9hZGVyLmpzeCIsIi4uL3NyYy9hZG1pbi1jb21wb25lbnRzL1Byb2ZpbGVGaWVsZEtleU11bHRpU2VsZWN0LmpzeCIsIi4uL3NyYy9hZG1pbi1jb21wb25lbnRzL0Zvcm1RdWVzdGlvbk9wdGlvbnNFZGl0b3IuanN4IiwiLi4vc3JjL2FkbWluLWNvbXBvbmVudHMvRm9sbG93VXBGb3JtUXVlc3Rpb25zRWRpdG9yLmpzeCIsIi4uL3NyYy9hZG1pbi1jb21wb25lbnRzL1Byb21wdERlZmluaXRpb25FZGl0b3IuanN4IiwiLi4vbm9kZV9tb2R1bGVzL0BhZG1pbmpzL3VwbG9hZC9idWlsZC9mZWF0dXJlcy91cGxvYWQtZmlsZS9jb21wb25lbnRzL1VwbG9hZEVkaXRDb21wb25lbnQuanMiLCIuLi9ub2RlX21vZHVsZXMvQGFkbWluanMvdXBsb2FkL2J1aWxkL2ZlYXR1cmVzL3VwbG9hZC1maWxlL3R5cGVzL21pbWUtdHlwZXMudHlwZS5qcyIsIi4uL25vZGVfbW9kdWxlcy9AYWRtaW5qcy91cGxvYWQvYnVpbGQvZmVhdHVyZXMvdXBsb2FkLWZpbGUvY29tcG9uZW50cy9maWxlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL0BhZG1pbmpzL3VwbG9hZC9idWlsZC9mZWF0dXJlcy91cGxvYWQtZmlsZS9jb21wb25lbnRzL1VwbG9hZExpc3RDb21wb25lbnQuanMiLCIuLi9ub2RlX21vZHVsZXMvQGFkbWluanMvdXBsb2FkL2J1aWxkL2ZlYXR1cmVzL3VwbG9hZC1maWxlL2NvbXBvbmVudHMvVXBsb2FkU2hvd0NvbXBvbmVudC5qcyIsImVudHJ5LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCwgeyB1c2VFZmZlY3QsIHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBMb2FkZXIsIE1lc3NhZ2VCb3ggfSBmcm9tIFwiQGFkbWluanMvZGVzaWduLXN5c3RlbVwiO1xuaW1wb3J0IHsgdXNlTmF2aWdhdGUgfSBmcm9tIFwicmVhY3Qtcm91dGVyXCI7XG5cbmNvbnN0IG5vcm1hbGl6ZVVwbG9hZFBhdGggPSAoZmlsZVBhdGgpID0+IHtcbiAgaWYgKCFmaWxlUGF0aCB8fCB0eXBlb2YgZmlsZVBhdGggIT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBmaWxlUGF0aC5yZXBsYWNlQWxsKFwiXFxcXFwiLCBcIi9cIik7XG4gIGNvbnN0IHVwbG9hZHNJbmRleCA9IG5vcm1hbGl6ZWQuaW5kZXhPZihcInVwbG9hZHMvXCIpO1xuXG4gIGlmICh1cGxvYWRzSW5kZXggIT09IC0xKSB7XG4gICAgcmV0dXJuIGAvJHtub3JtYWxpemVkLnNsaWNlKHVwbG9hZHNJbmRleCl9YDtcbiAgfVxuXG4gIHJldHVybiBub3JtYWxpemVkLnN0YXJ0c1dpdGgoXCIvXCIpID8gbm9ybWFsaXplZCA6IGAvJHtub3JtYWxpemVkfWA7XG59O1xuXG5jb25zdCBEb3dubG9hZEZpbGVBdHRhY2htZW50ID0gKHByb3BzKSA9PiB7XG4gIGNvbnN0IG5hdmlnYXRlID0gdXNlTmF2aWdhdGUoKTtcbiAgY29uc3QgW2Vycm9yLCBzZXRFcnJvcl0gPSB1c2VTdGF0ZShudWxsKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHB1YmxpY1BhdGggPSBub3JtYWxpemVVcGxvYWRQYXRoKHByb3BzLnJlY29yZD8ucGFyYW1zPy5maWxlUGF0aCk7XG5cbiAgICBpZiAoIXB1YmxpY1BhdGgpIHtcbiAgICAgIHNldEVycm9yKFwi2YHYp9uM2YTbjCDYqNix2KfbjCDYr9in2YbZhNmI2K8g2YjYrNmI2K8g2YbYr9in2LHYr1wiKTtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZU5hbWUgPVxuICAgICAgcHJvcHMucmVjb3JkPy5wYXJhbXM/Lm9yaWdpbmFsTmFtZSB8fFxuICAgICAgcHJvcHMucmVjb3JkPy5wYXJhbXM/LmZpbGVOYW1lIHx8XG4gICAgICBwYXRoQmFzZW5hbWUocHVibGljUGF0aCk7XG5cbiAgICBjb25zdCBkb3dubG9hZFVybCA9IGAvZG93bmxvYWQtdXBsb2FkP3BhdGg9JHtlbmNvZGVVUklDb21wb25lbnQoXG4gICAgICBwdWJsaWNQYXRoLnNsaWNlKDEpLFxuICAgICl9YDtcblxuICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKTtcbiAgICBsaW5rLmhyZWYgPSBkb3dubG9hZFVybDtcbiAgICBsaW5rLnNldEF0dHJpYnV0ZShcImRvd25sb2FkXCIsIGZpbGVOYW1lKTtcbiAgICBsaW5rLnJlbCA9IFwibm9vcGVuZXJcIjtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxpbmspO1xuICAgIGxpbmsuY2xpY2soKTtcbiAgICBsaW5rLnJlbW92ZSgpO1xuXG4gICAgY29uc3QgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBuYXZpZ2F0ZSgtMSk7XG4gICAgfSwgMjAwKTtcblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICB9O1xuICB9LCBbbmF2aWdhdGUsIHByb3BzLnJlY29yZF0pO1xuXG4gIGlmIChlcnJvcikge1xuICAgIHJldHVybiA8TWVzc2FnZUJveCB2YXJpYW50PVwiZGFuZ2VyXCIgbWVzc2FnZT17ZXJyb3J9IC8+O1xuICB9XG5cbiAgcmV0dXJuIDxMb2FkZXIgLz47XG59O1xuXG5jb25zdCBwYXRoQmFzZW5hbWUgPSAoZmlsZVBhdGgpID0+IHtcbiAgY29uc3QgcGFydHMgPSBTdHJpbmcoZmlsZVBhdGgpLnNwbGl0KFwiL1wiKTtcbiAgcmV0dXJuIHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdIHx8IFwiZG93bmxvYWRcIjtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IERvd25sb2FkRmlsZUF0dGFjaG1lbnQ7XG4iLCJpbXBvcnQgUmVhY3QsIHsgdXNlRWZmZWN0LCB1c2VSZWYsIHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBCb3gsIEgzLCBJY29uLCBNZXNzYWdlQm94LCBUZXh0IH0gZnJvbSBcIkBhZG1pbmpzL2Rlc2lnbi1zeXN0ZW1cIjtcbmltcG9ydCB7IEFwaUNsaWVudCwgdXNlTm90aWNlIH0gZnJvbSBcImFkbWluanNcIjtcbmltcG9ydCB7IHVzZU5hdmlnYXRlIH0gZnJvbSBcInJlYWN0LXJvdXRlclwiO1xuXG5jb25zdCBhcGkgPSBuZXcgQXBpQ2xpZW50KCk7XG5cbmNvbnN0IExPQURJTkdfQ09QWSA9IHtcbiAgZ2VuZXJhdGVJbnNpZ2h0OiB7XG4gICAgdGl0bGU6IFwi2K/YsSDYrdin2YQg2K/YsduM2KfZgdiqINiq2K3ZhNuM2YQgQUnigKZcIixcbiAgICBoaW50OiBcItmE2LfZgdin2Ysg2LXYqNixINqp2YbbjNivLiDYp9uM2YYg2K/Ysdiu2YjYp9iz2Kog2YXZhdqp2YYg2KfYs9iqINiq2Kcg24zaqSDYr9mC24zZgtmHINi32YjZhCDYqNqp2LTYry5cIixcbiAgfSxcbiAgZ2VuZXJhdGVJbmR1c3RyeUluc2lnaHQ6IHtcbiAgICB0aXRsZTogXCLYr9ixINit2KfZhCDYr9ix24zYp9mB2Kog2KrYrdmE24zZhCDYtdmG2LnYquKAplwiLFxuICAgIGhpbnQ6IFwi2YTYt9mB2KfZiyDYtdio2LEg2qnZhtuM2K8uINin24zZhiDYr9ix2K7ZiNin2LPYqiDZhdmF2qnZhiDYp9iz2Kog2KrYpyDYr9mIINiv2YLbjNmC2Ycg2LfZiNmEINio2qnYtNivLlwiLFxuICB9LFxufTtcblxuY29uc3QgQXN5bmNSZWNvcmRBY3Rpb25Mb2FkZXIgPSAocHJvcHMpID0+IHtcbiAgY29uc3QgeyBhY3Rpb24sIHJlY29yZCwgcmVzb3VyY2UgfSA9IHByb3BzO1xuICBjb25zdCBhZGROb3RpY2UgPSB1c2VOb3RpY2UoKTtcbiAgY29uc3QgbmF2aWdhdGUgPSB1c2VOYXZpZ2F0ZSgpO1xuICBjb25zdCBzdGFydGVkUmVmID0gdXNlUmVmKGZhbHNlKTtcbiAgY29uc3QgW2Vycm9yLCBzZXRFcnJvcl0gPSB1c2VTdGF0ZShudWxsKTtcblxuICBjb25zdCBjb3B5ID1cbiAgICBMT0FESU5HX0NPUFlbYWN0aW9uPy5uYW1lXSA/PyB7XG4gICAgICB0aXRsZTogXCLYr9ixINit2KfZhCDYp9mG2KzYp9mFINi52YXZhNuM2KfYquKAplwiLFxuICAgICAgaGludDogXCLZhNi32YHYp9mLINi12KjYsSDaqdmG24zYry5cIixcbiAgICB9O1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKHN0YXJ0ZWRSZWYuY3VycmVudCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgc3RhcnRlZFJlZi5jdXJyZW50ID0gdHJ1ZTtcblxuICAgIGxldCBjYW5jZWxsZWQgPSBmYWxzZTtcblxuICAgIGNvbnN0IHJ1biA9IGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXBpLnJlY29yZEFjdGlvbihcbiAgICAgICAgICB7XG4gICAgICAgICAgICByZXNvdXJjZUlkOiByZXNvdXJjZS5pZCxcbiAgICAgICAgICAgIHJlY29yZElkOiByZWNvcmQuaWQsXG4gICAgICAgICAgICBhY3Rpb25OYW1lOiBhY3Rpb24ubmFtZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHsgbWV0aG9kOiBcInBvc3RcIiB9LFxuICAgICAgICApO1xuXG4gICAgICAgIGlmIChjYW5jZWxsZWQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IG5vdGljZSwgcmVkaXJlY3RVcmwgfSA9IHJlc3BvbnNlLmRhdGEgPz8ge307XG5cbiAgICAgICAgaWYgKG5vdGljZSkge1xuICAgICAgICAgIGFkZE5vdGljZShub3RpY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlZGlyZWN0VXJsKSB7XG4gICAgICAgICAgbmF2aWdhdGUocmVkaXJlY3RVcmwpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgaWYgKGNhbmNlbGxlZCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmVycm9yKFwiW0FzeW5jUmVjb3JkQWN0aW9uTG9hZGVyXVwiLCBlcnIpO1xuICAgICAgICBzZXRFcnJvcihcItiu2LfYpyDYr9ixINin2YbYrNin2YUg2K/Ysdiu2YjYp9iz2KouINiv2YjYqNin2LHZhyDYqtmE2KfYtCDaqdmG24zYry5cIik7XG4gICAgICAgIGFkZE5vdGljZSh7XG4gICAgICAgICAgbWVzc2FnZTogXCLYrti32Kcg2K/YsSDYp9mG2KzYp9mFINiv2LHYrtmI2KfYs9iqXCIsXG4gICAgICAgICAgdHlwZTogXCJlcnJvclwiLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcnVuKCk7XG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgY2FuY2VsbGVkID0gdHJ1ZTtcbiAgICB9O1xuICB9LCBbYWN0aW9uLm5hbWUsIGFkZE5vdGljZSwgbmF2aWdhdGUsIHJlY29yZC5pZCwgcmVzb3VyY2UuaWRdKTtcblxuICBpZiAoZXJyb3IpIHtcbiAgICByZXR1cm4gKFxuICAgICAgPEJveCBwPVwieHhsXCI+XG4gICAgICAgIDxNZXNzYWdlQm94IHZhcmlhbnQ9XCJkYW5nZXJcIiBtZXNzYWdlPXtlcnJvcn0gLz5cbiAgICAgIDwvQm94PlxuICAgICk7XG4gIH1cblxuICByZXR1cm4gKFxuICAgIDxCb3hcbiAgICAgIGZsZXhcbiAgICAgIHZhcmlhbnQ9XCJncmV5XCJcbiAgICAgIGFsaWduSXRlbXM9XCJjZW50ZXJcIlxuICAgICAganVzdGlmeUNvbnRlbnQ9XCJjZW50ZXJcIlxuICAgICAgZmxleERpcmVjdGlvbj1cImNvbHVtblwiXG4gICAgICBwPVwieHhsXCJcbiAgICAgIG1pbkhlaWdodD17MzIwfVxuICAgID5cbiAgICAgIDxJY29uIGljb249XCJMb2FkZXJcIiBzcGluIHNpemU9ezQ4fSAvPlxuICAgICAgPEgzIG10PVwibGdcIj57Y29weS50aXRsZX08L0gzPlxuICAgICAgPFRleHQgbXQ9XCJkZWZhdWx0XCIgb3BhY2l0eT17MC44fT5cbiAgICAgICAge2NvcHkuaGludH1cbiAgICAgIDwvVGV4dD5cbiAgICA8L0JveD5cbiAgKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEFzeW5jUmVjb3JkQWN0aW9uTG9hZGVyO1xuIiwiaW1wb3J0IFJlYWN0LCB7IHVzZUNhbGxiYWNrLCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgQm94LCBGb3JtR3JvdXAsIEZvcm1NZXNzYWdlLCBMYWJlbCwgVGV4dCB9IGZyb20gXCJAYWRtaW5qcy9kZXNpZ24tc3lzdGVtXCI7XG5cbmNvbnN0IG5vcm1hbGl6ZVNjYWxhciA9IChyYXcpID0+IHtcbiAgaWYgKHJhdyA9PSBudWxsIHx8IHJhdyA9PT0gXCJcIikge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgcmF3ID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3QgdHJpbW1lZCA9IHJhdy50cmltKCk7XG4gICAgaWYgKCF0cmltbWVkKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgaWYgKHRyaW1tZWQuc3RhcnRzV2l0aChcIltcIikpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UodHJpbW1lZCk7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHBhcnNlZCkpIHtcbiAgICAgICAgICByZXR1cm4gcGFyc2VkLm1hcCgoaXRlbSkgPT4gU3RyaW5nKGl0ZW0pLnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIFt0cmltbWVkXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gW3RyaW1tZWRdO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkocmF3KSkge1xuICAgIHJldHVybiByYXcubWFwKChpdGVtKSA9PiBTdHJpbmcoaXRlbSkudHJpbSgpKS5maWx0ZXIoQm9vbGVhbik7XG4gIH1cblxuICBpZiAodHlwZW9mIHJhdyA9PT0gXCJvYmplY3RcIikge1xuICAgIHJldHVybiBPYmplY3QudmFsdWVzKHJhdylcbiAgICAgIC5tYXAoKGl0ZW0pID0+IFN0cmluZyhpdGVtKS50cmltKCkpXG4gICAgICAuZmlsdGVyKEJvb2xlYW4pO1xuICB9XG5cbiAgcmV0dXJuIFtTdHJpbmcocmF3KS50cmltKCldLmZpbHRlcihCb29sZWFuKTtcbn07XG5cbi8qKiBBZG1pbkpTIGZsYXQuc2V0IHN0b3JlcyBhcnJheXMgYXMgYHBhdGguMGAsIGBwYXRoLjFgLCDigKYgbm90IGFsd2F5cyBgcGF0aGAgYXMgYXJyYXkgKi9cbmNvbnN0IGdldFNlbGVjdGVkRnJvbVJlY29yZFBhcmFtcyA9IChwYXJhbXMsIHBhdGgpID0+IHtcbiAgaWYgKCFwYXJhbXMpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBkaXJlY3QgPSBub3JtYWxpemVTY2FsYXIocGFyYW1zW3BhdGhdKTtcbiAgaWYgKGRpcmVjdC5sZW5ndGgpIHtcbiAgICByZXR1cm4gWy4uLm5ldyBTZXQoZGlyZWN0KV07XG4gIH1cblxuICBjb25zdCBmbGF0UHJlZml4ID0gYCR7cGF0aH0uYDtcbiAgY29uc3QgZnJvbUZsYXQgPSBPYmplY3Qua2V5cyhwYXJhbXMpXG4gICAgLmZpbHRlcigoa2V5KSA9PiBrZXkuc3RhcnRzV2l0aChmbGF0UHJlZml4KSlcbiAgICAuc29ydCgobGVmdCwgcmlnaHQpID0+IHtcbiAgICAgIGNvbnN0IGxlZnRJbmRleCA9IE51bWJlcihsZWZ0LnNsaWNlKGZsYXRQcmVmaXgubGVuZ3RoKSk7XG4gICAgICBjb25zdCByaWdodEluZGV4ID0gTnVtYmVyKHJpZ2h0LnNsaWNlKGZsYXRQcmVmaXgubGVuZ3RoKSk7XG4gICAgICByZXR1cm4gbGVmdEluZGV4IC0gcmlnaHRJbmRleDtcbiAgICB9KVxuICAgIC5tYXAoKGtleSkgPT4gU3RyaW5nKHBhcmFtc1trZXldID8/IFwiXCIpLnRyaW0oKSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pO1xuXG4gIHJldHVybiBbLi4ubmV3IFNldChmcm9tRmxhdCldO1xufTtcblxuY29uc3QgUHJvZmlsZUZpZWxkS2V5TXVsdGlTZWxlY3QgPSAocHJvcHMpID0+IHtcbiAgY29uc3QgeyBwcm9wZXJ0eSwgcmVjb3JkLCBvbkNoYW5nZSB9ID0gcHJvcHM7XG4gIGNvbnN0IHBhdGggPSBwcm9wZXJ0eS5wYXRoIHx8IHByb3BlcnR5LnByb3BlcnR5UGF0aCB8fCBcInByb2ZpbGVGaWVsZEtleXNcIjtcbiAgY29uc3Qgb3B0aW9ucyA9IHByb3BlcnR5LmF2YWlsYWJsZVZhbHVlcyA/PyBwcm9wZXJ0eS5wcm9wcz8uYXZhaWxhYmxlVmFsdWVzID8/IFtdO1xuICBjb25zdCBlcnJvciA9IHJlY29yZD8uZXJyb3JzPy5bcGF0aF07XG5cbiAgY29uc3QgW3NlbGVjdGVkS2V5cywgc2V0U2VsZWN0ZWRLZXlzXSA9IHVzZVN0YXRlKCgpID0+XG4gICAgZ2V0U2VsZWN0ZWRGcm9tUmVjb3JkUGFyYW1zKHJlY29yZD8ucGFyYW1zLCBwYXRoKSxcbiAgKTtcblxuICBjb25zdCBzZWxlY3RlZFNldCA9IG5ldyBTZXQoc2VsZWN0ZWRLZXlzKTtcblxuICBjb25zdCBhcHBseVNlbGVjdGlvbiA9IHVzZUNhbGxiYWNrKFxuICAgIChuZXh0S2V5cykgPT4ge1xuICAgICAgY29uc3QgdW5pcXVlID0gWy4uLm5ldyBTZXQobmV4dEtleXMuZmlsdGVyKEJvb2xlYW4pKV07XG4gICAgICBzZXRTZWxlY3RlZEtleXModW5pcXVlKTtcbiAgICAgIG9uQ2hhbmdlKHBhdGgsIHVuaXF1ZSk7XG4gICAgfSxcbiAgICBbb25DaGFuZ2UsIHBhdGhdLFxuICApO1xuXG4gIGNvbnN0IGhhbmRsZVRvZ2dsZSA9ICh2YWx1ZSkgPT4ge1xuICAgIGNvbnN0IG5leHQgPSBzZWxlY3RlZFNldC5oYXModmFsdWUpXG4gICAgICA/IHNlbGVjdGVkS2V5cy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0gIT09IHZhbHVlKVxuICAgICAgOiBbLi4uc2VsZWN0ZWRLZXlzLCB2YWx1ZV07XG4gICAgYXBwbHlTZWxlY3Rpb24obmV4dCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8Rm9ybUdyb3VwIGVycm9yPXtCb29sZWFuKGVycm9yKX0+XG4gICAgICA8TGFiZWwgcmVxdWlyZWQ9e3Byb3BlcnR5LmlzUmVxdWlyZWR9PlByb2ZpbGUgRmllbGQgS2V5PC9MYWJlbD5cbiAgICAgIDxUZXh0IG1iPVwiZGVmYXVsdFwiIHNpemU9XCJzbVwiIGNvbG9yPVwiZ3JleTYwXCI+XG4gICAgICAgINmF24zigIzYqtmI2KfZhtuM2K8g2obZhtivINmB24zZhNivINm+2LHZiNmB2KfbjNmEINix2Kcg2YfZheKAjNiy2YXYp9mGINin2YbYqtiu2KfYqCDaqdmG24zYr9ibINio2LHYp9uMINmH2LEg2YXZiNix2K8g24zaqVxuICAgICAgICDYsdqp2YjYsdivINis2K/YpyDYsNiu24zYsdmHINmF24zigIzYtNmI2K8uXG4gICAgICA8L1RleHQ+XG4gICAgICA8Qm94XG4gICAgICAgIG1heEhlaWdodD17MzYwfVxuICAgICAgICBvdmVyZmxvd1k9XCJhdXRvXCJcbiAgICAgICAgcD1cImRlZmF1bHRcIlxuICAgICAgICBib3JkZXI9XCJkZWZhdWx0XCJcbiAgICAgICAgYm9yZGVyUmFkaXVzPVwiZGVmYXVsdFwiXG4gICAgICA+XG4gICAgICAgIHtvcHRpb25zLm1hcCgob3B0aW9uKSA9PiB7XG4gICAgICAgICAgY29uc3QgaW5wdXRJZCA9IGAke3BhdGh9LSR7b3B0aW9uLnZhbHVlfWA7XG4gICAgICAgICAgY29uc3QgY2hlY2tlZCA9IHNlbGVjdGVkU2V0LmhhcyhvcHRpb24udmFsdWUpO1xuXG4gICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDxCb3gga2V5PXtvcHRpb24udmFsdWV9IG1iPVwic21cIj5cbiAgICAgICAgICAgICAgPGxhYmVsXG4gICAgICAgICAgICAgICAgaHRtbEZvcj17aW5wdXRJZH1cbiAgICAgICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgICAgY3Vyc29yOiBcInBvaW50ZXJcIixcbiAgICAgICAgICAgICAgICAgIGRpc3BsYXk6IFwiZmxleFwiLFxuICAgICAgICAgICAgICAgICAgYWxpZ25JdGVtczogXCJmbGV4LXN0YXJ0XCIsXG4gICAgICAgICAgICAgICAgICBnYXA6IDgsXG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgICAgIGlkPXtpbnB1dElkfVxuICAgICAgICAgICAgICAgICAgbmFtZT17YCR7cGF0aH0uJHtvcHRpb24udmFsdWV9YH1cbiAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e2NoZWNrZWR9XG4gICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KCkgPT4gaGFuZGxlVG9nZ2xlKG9wdGlvbi52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICBzdHlsZT17eyBtYXJnaW5Ub3A6IDQsIGZsZXhTaHJpbms6IDAgfX1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgIDxUZXh0IGFzPVwic3BhblwiPntvcHRpb24ubGFiZWx9PC9UZXh0PlxuICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgKTtcbiAgICAgICAgfSl9XG4gICAgICA8L0JveD5cbiAgICAgIDxUZXh0IG10PVwic21cIiBzaXplPVwic21cIiBjb2xvcj1cImdyZXk2MFwiPlxuICAgICAgICB7c2VsZWN0ZWRLZXlzLmxlbmd0aH0g2YXZiNix2K8g2KfZhtiq2K7Yp9ioINi02K/Zh1xuICAgICAgPC9UZXh0PlxuICAgICAgPEZvcm1NZXNzYWdlPntlcnJvcj8ubWVzc2FnZX08L0Zvcm1NZXNzYWdlPlxuICAgIDwvRm9ybUdyb3VwPlxuICApO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgUHJvZmlsZUZpZWxkS2V5TXVsdGlTZWxlY3Q7XG4iLCJpbXBvcnQgUmVhY3QsIHsgdXNlQ2FsbGJhY2ssIHVzZUVmZmVjdCwgdXNlTWVtbywgdXNlU3RhdGUgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB7XG4gIEJveCxcbiAgQnV0dG9uLFxuICBGb3JtR3JvdXAsXG4gIEZvcm1NZXNzYWdlLFxuICBJY29uLFxuICBJbnB1dCxcbiAgTGFiZWwsXG4gIFNlbGVjdCxcbiAgVGV4dCxcbn0gZnJvbSBcIkBhZG1pbmpzL2Rlc2lnbi1zeXN0ZW1cIjtcblxuY29uc3QgQ0hPSUNFX1RZUEVTID0gbmV3IFNldChbXCJSQURJT1wiLCBcIkNIRUNLQk9YXCJdKTtcblxuY29uc3QgU0NPUkVfT1BUSU9OUyA9IFtcbiAgeyB2YWx1ZTogXCJcIiwgbGFiZWw6IFwi4oCUXCIgfSxcbiAgeyB2YWx1ZTogXCIxXCIsIGxhYmVsOiBcIjFcIiB9LFxuICB7IHZhbHVlOiBcIjJcIiwgbGFiZWw6IFwiMlwiIH0sXG4gIHsgdmFsdWU6IFwiM1wiLCBsYWJlbDogXCIzXCIgfSxcbiAgeyB2YWx1ZTogXCI0XCIsIGxhYmVsOiBcIjRcIiB9LFxuICB7IHZhbHVlOiBcIjVcIiwgbGFiZWw6IFwiNVwiIH0sXG5dO1xuXG5jb25zdCBlbXB0eVJvdyA9IChvcmRlcikgPT4gKHtcbiAgbGFiZWw6IFwiXCIsXG4gIHZhbHVlOiBcIlwiLFxuICBzY29yZTogXCJcIixcbiAgb3JkZXI6IG9yZGVyID8/IDEsXG59KTtcblxuY29uc3QgcGFyc2VPcHRpb25zSnNvbiA9IChyYXcpID0+IHtcbiAgaWYgKHJhdyA9PSBudWxsIHx8IHJhdyA9PT0gXCJcIikge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgcmF3ID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3QgdHJpbW1lZCA9IHJhdy50cmltKCk7XG4gICAgaWYgKCF0cmltbWVkKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHRyaW1tZWQpO1xuICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkocGFyc2VkKSA/IHBhcnNlZCA6IFtdO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHJhdykpIHtcbiAgICByZXR1cm4gcmF3O1xuICB9XG5cbiAgcmV0dXJuIFtdO1xufTtcblxuY29uc3Qgbm9ybWFsaXplUm93cyA9IChyb3dzKSA9PlxuICByb3dzLm1hcCgocm93LCBpbmRleCkgPT4gKHtcbiAgICBsYWJlbDogU3RyaW5nKHJvdz8ubGFiZWwgPz8gXCJcIiksXG4gICAgdmFsdWU6IFN0cmluZyhyb3c/LnZhbHVlID8/IFwiXCIpLFxuICAgIHNjb3JlOlxuICAgICAgcm93Py5zY29yZSA9PT0gbnVsbCB8fCByb3c/LnNjb3JlID09PSB1bmRlZmluZWQgfHwgcm93Py5zY29yZSA9PT0gXCJcIlxuICAgICAgICA/IFwiXCJcbiAgICAgICAgOiBTdHJpbmcocm93LnNjb3JlKSxcbiAgICBvcmRlcjpcbiAgICAgIHJvdz8ub3JkZXIgPT09IG51bGwgfHwgcm93Py5vcmRlciA9PT0gdW5kZWZpbmVkIHx8IHJvdz8ub3JkZXIgPT09IFwiXCJcbiAgICAgICAgPyBpbmRleCArIDFcbiAgICAgICAgOiBOdW1iZXIocm93Lm9yZGVyKSB8fCBpbmRleCArIDEsXG4gIH0pKTtcblxuY29uc3QgRm9ybVF1ZXN0aW9uT3B0aW9uc0VkaXRvciA9IChwcm9wcykgPT4ge1xuICBjb25zdCB7IHByb3BlcnR5LCByZWNvcmQsIG9uQ2hhbmdlIH0gPSBwcm9wcztcbiAgY29uc3QgcGF0aCA9IHByb3BlcnR5LnBhdGggfHwgcHJvcGVydHkucHJvcGVydHlQYXRoIHx8IFwib3B0aW9uc0pzb25cIjtcbiAgY29uc3QgZXJyb3IgPSByZWNvcmQ/LmVycm9ycz8uW3BhdGhdO1xuXG4gIGNvbnN0IHF1ZXN0aW9uVHlwZSA9IFN0cmluZyhyZWNvcmQ/LnBhcmFtcz8udHlwZSA/PyBcIlwiKTtcbiAgY29uc3QgaXNTY29yZWQgPVxuICAgIHJlY29yZD8ucGFyYW1zPy5pc1Njb3JlZCA9PT0gdHJ1ZSB8fFxuICAgIHJlY29yZD8ucGFyYW1zPy5pc1Njb3JlZCA9PT0gXCJ0cnVlXCIgfHxcbiAgICByZWNvcmQ/LnBhcmFtcz8uaXNTY29yZWQgPT09IFwib25cIiB8fFxuICAgIHJlY29yZD8ucGFyYW1zPy5pc1Njb3JlZCA9PT0gMTtcbiAgY29uc3Qgd2VpZ2h0UmF3ID0gcmVjb3JkPy5wYXJhbXM/LndlaWdodDtcbiAgY29uc3QgaGFzV2VpZ2h0ID1cbiAgICB3ZWlnaHRSYXcgIT09IG51bGwgJiZcbiAgICB3ZWlnaHRSYXcgIT09IHVuZGVmaW5lZCAmJlxuICAgIFN0cmluZyh3ZWlnaHRSYXcpLnRyaW0oKSAhPT0gXCJcIjtcbiAgY29uc3QgcmVxdWlyZXNTY29yZSA9IGlzU2NvcmVkICYmIGhhc1dlaWdodDtcbiAgY29uc3QgaXNDaG9pY2VUeXBlID0gQ0hPSUNFX1RZUEVTLmhhcyhxdWVzdGlvblR5cGUpO1xuXG4gIGNvbnN0IFtyb3dzLCBzZXRSb3dzXSA9IHVzZVN0YXRlKCgpID0+XG4gICAgbm9ybWFsaXplUm93cyhwYXJzZU9wdGlvbnNKc29uKHJlY29yZD8ucGFyYW1zPy5bcGF0aF0pKSxcbiAgKTtcblxuICBjb25zdCBwdXNoVG9Gb3JtID0gdXNlQ2FsbGJhY2soXG4gICAgKG5leHRSb3dzKSA9PiB7XG4gICAgICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplUm93cyhuZXh0Um93cyk7XG4gICAgICBzZXRSb3dzKG5vcm1hbGl6ZWQpO1xuICAgICAgb25DaGFuZ2UocGF0aCwgSlNPTi5zdHJpbmdpZnkobm9ybWFsaXplZCkpO1xuICAgIH0sXG4gICAgW29uQ2hhbmdlLCBwYXRoXSxcbiAgKTtcblxuICBjb25zdCBoYW5kbGVGaWVsZENoYW5nZSA9IChpbmRleCwgZmllbGQsIHZhbHVlKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9IHJvd3MubWFwKChyb3csIGkpID0+XG4gICAgICBpID09PSBpbmRleCA/IHsgLi4ucm93LCBbZmllbGRdOiB2YWx1ZSB9IDogcm93LFxuICAgICk7XG4gICAgcHVzaFRvRm9ybShuZXh0KTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVBZGRSb3cgPSAoKSA9PiB7XG4gICAgcHVzaFRvRm9ybShbLi4ucm93cywgZW1wdHlSb3cocm93cy5sZW5ndGggKyAxKV0pO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVJlbW92ZVJvdyA9IChpbmRleCkgPT4ge1xuICAgIGNvbnN0IG5leHQgPSByb3dzXG4gICAgICAuZmlsdGVyKChfLCBpKSA9PiBpICE9PSBpbmRleClcbiAgICAgIC5tYXAoKHJvdywgaSkgPT4gKHsgLi4ucm93LCBvcmRlcjogaSArIDEgfSkpO1xuICAgIHB1c2hUb0Zvcm0obmV4dCk7XG4gIH07XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWlzQ2hvaWNlVHlwZSAmJiByb3dzLmxlbmd0aCA+IDApIHtcbiAgICAgIHB1c2hUb0Zvcm0oW10pO1xuICAgIH1cbiAgfSwgW2lzQ2hvaWNlVHlwZSwgcm93cy5sZW5ndGgsIHB1c2hUb0Zvcm1dKTtcblxuICBjb25zdCBoaW50ID0gdXNlTWVtbygoKSA9PiB7XG4gICAgaWYgKCFpc0Nob2ljZVR5cGUpIHtcbiAgICAgIHJldHVybiBcItio2LHYp9uMINiz2YjYp9mE2KfYqiDZhdiq2YbbjCDbjNinINi52K/Yr9uMINqv2LLbjNmG2YfigIzYp9uMINmE2KfYstmFINmG24zYs9iqLlwiO1xuICAgIH1cbiAgICBpZiAocmVxdWlyZXNTY29yZSkge1xuICAgICAgcmV0dXJuIFwi2KfbjNmGINiz2YjYp9mEINin2YXYqtuM2KfYstuMINin2LPYqtibINio2LHYp9uMINmH2LEg2q/YstuM2YbZhyDZhtmF2LHZhyAo27Eg2KrYpyDbtSkg2KfZhNiy2KfZhduMINin2LPYqi5cIjtcbiAgICB9XG4gICAgcmV0dXJuIFwi2LnZhtmI2KfZhiDZiCDZhdmC2K/Yp9ixINmH2LEg2q/YstuM2YbZhyDYsdinINmI2KfYsdivINqp2YbbjNivLlwiO1xuICB9LCBbaXNDaG9pY2VUeXBlLCByZXF1aXJlc1Njb3JlXSk7XG5cbiAgaWYgKCFpc0Nob2ljZVR5cGUpIHtcbiAgICByZXR1cm4gKFxuICAgICAgPEZvcm1Hcm91cD5cbiAgICAgICAgPExhYmVsPtqv2LLbjNmG2YfigIzZh9in24wg2LPZiNin2YQ8L0xhYmVsPlxuICAgICAgICA8VGV4dCBzaXplPVwic21cIiBjb2xvcj1cImdyZXk2MFwiPlxuICAgICAgICAgIHtoaW50fVxuICAgICAgICA8L1RleHQ+XG4gICAgICA8L0Zvcm1Hcm91cD5cbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8Rm9ybUdyb3VwIGVycm9yPXtCb29sZWFuKGVycm9yKX0+XG4gICAgICA8TGFiZWw+2q/YstuM2YbZh+KAjNmH2KfbjCDYs9mI2KfZhDwvTGFiZWw+XG4gICAgICA8VGV4dCBtYj1cImRlZmF1bHRcIiBzaXplPVwic21cIiBjb2xvcj1cImdyZXk2MFwiPlxuICAgICAgICB7aGludH1cbiAgICAgIDwvVGV4dD5cblxuICAgICAgPEJveCBib3JkZXI9XCJkZWZhdWx0XCIgYm9yZGVyUmFkaXVzPVwiZGVmYXVsdFwiIHA9XCJkZWZhdWx0XCI+XG4gICAgICAgIHtyb3dzLmxlbmd0aCA9PT0gMCA/IChcbiAgICAgICAgICA8VGV4dCBzaXplPVwic21cIiBjb2xvcj1cImdyZXk2MFwiIG1iPVwiZGVmYXVsdFwiPlxuICAgICAgICAgICAg2YfZhtmI2LIg2q/YstuM2YbZh+KAjNin24wg2KfYttin2YHZhyDZhti02K/ZhyDYp9iz2KouXG4gICAgICAgICAgPC9UZXh0PlxuICAgICAgICApIDogKFxuICAgICAgICAgIHJvd3MubWFwKChyb3csIGluZGV4KSA9PiAoXG4gICAgICAgICAgICA8Qm94XG4gICAgICAgICAgICAgIGtleT17YG9wdGlvbi1yb3ctJHtpbmRleH1gfVxuICAgICAgICAgICAgICBtYj1cImxnXCJcbiAgICAgICAgICAgICAgcGI9XCJsZ1wiXG4gICAgICAgICAgICAgIGJvcmRlckJvdHRvbT1cImRlZmF1bHRcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8Qm94IGZsZXggZmxleERpcmVjdGlvbj1cInJvd1wiIGZsZXhXcmFwPVwid3JhcFwiIHN0eWxlPXt7IGdhcDogMTIgfX0+XG4gICAgICAgICAgICAgICAgPEJveCBmbGV4PVwiMVwiIG1pbldpZHRoPVwiMjAwcHhcIj5cbiAgICAgICAgICAgICAgICAgIDxMYWJlbCBzaXplPVwic21cIj7YudmG2YjYp9mGINqv2LLbjNmG2Yc8L0xhYmVsPlxuICAgICAgICAgICAgICAgICAgPElucHV0XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlPXtyb3cubGFiZWx9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT5cbiAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVGaWVsZENoYW5nZShpbmRleCwgXCJsYWJlbFwiLCBlLnRhcmdldC52YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICA8Qm94IGZsZXg9XCIxXCIgbWluV2lkdGg9XCIxNjBweFwiPlxuICAgICAgICAgICAgICAgICAgPExhYmVsIHNpemU9XCJzbVwiPtmF2YLYr9in2LEgKHZhbHVlKTwvTGFiZWw+XG4gICAgICAgICAgICAgICAgICA8SW5wdXRcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9e3Jvdy52YWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PlxuICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZUZpZWxkQ2hhbmdlKGluZGV4LCBcInZhbHVlXCIsIGUudGFyZ2V0LnZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICAgIDxCb3ggd2lkdGg9XCIxMDBweFwiPlxuICAgICAgICAgICAgICAgICAgPExhYmVsIHNpemU9XCJzbVwiPtiq2LHYqtuM2Kg8L0xhYmVsPlxuICAgICAgICAgICAgICAgICAgPElucHV0XG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJudW1iZXJcIlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT17cm93Lm9yZGVyfVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+XG4gICAgICAgICAgICAgICAgICAgICAgaGFuZGxlRmllbGRDaGFuZ2UoaW5kZXgsIFwib3JkZXJcIiwgZS50YXJnZXQudmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAge3JlcXVpcmVzU2NvcmUgPyAoXG4gICAgICAgICAgICAgICAgICA8Qm94IHdpZHRoPVwiMTIwcHhcIj5cbiAgICAgICAgICAgICAgICAgICAgPExhYmVsIHNpemU9XCJzbVwiPtmG2YXYsdmHPC9MYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPFNlbGVjdFxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtcbiAgICAgICAgICAgICAgICAgICAgICAgIFNDT1JFX09QVElPTlMuZmluZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKG9wdCkgPT4gb3B0LnZhbHVlID09PSBTdHJpbmcocm93LnNjb3JlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICkgPz8gU0NPUkVfT1BUSU9OU1swXVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zPXtTQ09SRV9PUFRJT05TLmZpbHRlcigob3B0KSA9PiBvcHQudmFsdWUgIT09IFwiXCIpfVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoc2VsZWN0ZWQpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVGaWVsZENoYW5nZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwic2NvcmVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ/LnZhbHVlID8/IFwiXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgICAgICAgPEJveCBkaXNwbGF5PVwiZmxleFwiIGFsaWduSXRlbXM9XCJmbGV4LWVuZFwiPlxuICAgICAgICAgICAgICAgICAgPEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgc2l6ZT1cImljb25cIlxuICAgICAgICAgICAgICAgICAgICB2YXJpYW50PVwidGV4dFwiXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yPVwiZGFuZ2VyXCJcbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlUmVtb3ZlUm93KGluZGV4KX1cbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCLYrdiw2YEg2q/YstuM2YbZh1wiXG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIDxJY29uIGljb249XCJUcmFzaDJcIiAvPlxuICAgICAgICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgKSlcbiAgICAgICAgKX1cblxuICAgICAgICA8QnV0dG9uIHR5cGU9XCJidXR0b25cIiB2YXJpYW50PVwib3V0bGluZWRcIiBvbkNsaWNrPXtoYW5kbGVBZGRSb3d9PlxuICAgICAgICAgIDxJY29uIGljb249XCJQbHVzXCIgLz5cbiAgICAgICAgICDYp9mB2LLZiNiv2YYg2q/YstuM2YbZh1xuICAgICAgICA8L0J1dHRvbj5cbiAgICAgIDwvQm94PlxuXG4gICAgICA8Rm9ybU1lc3NhZ2U+e2Vycm9yPy5tZXNzYWdlfTwvRm9ybU1lc3NhZ2U+XG4gICAgPC9Gb3JtR3JvdXA+XG4gICk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBGb3JtUXVlc3Rpb25PcHRpb25zRWRpdG9yO1xuIiwiaW1wb3J0IFJlYWN0LCB7IHVzZUNhbGxiYWNrLCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHtcbiAgQm94LFxuICBCdXR0b24sXG4gIENoZWNrQm94LFxuICBGb3JtR3JvdXAsXG4gIEZvcm1NZXNzYWdlLFxuICBJY29uLFxuICBJbnB1dCxcbiAgTGFiZWwsXG4gIFNlbGVjdCxcbiAgVGV4dCxcbn0gZnJvbSBcIkBhZG1pbmpzL2Rlc2lnbi1zeXN0ZW1cIjtcblxuY29uc3QgQ0hPSUNFX1RZUEVTID0gbmV3IFNldChbXCJSQURJT1wiLCBcIkNIRUNLQk9YXCJdKTtcblxuY29uc3QgREVGQVVMVF9UWVBFX09QVElPTlMgPSBbXG4gIHsgdmFsdWU6IFwiUkFESU9cIiwgbGFiZWw6IFwi2LHYp9iv24zZiNuM24xcIiB9LFxuICB7IHZhbHVlOiBcIkNIRUNLQk9YXCIsIGxhYmVsOiBcItqG2qnigIzYqNin2qnYs1wiIH0sXG4gIHsgdmFsdWU6IFwiVEVYVFwiLCBsYWJlbDogXCLZhdiq2YZcIiB9LFxuXTtcblxuY29uc3QgZW1wdHlPcHRpb24gPSAoKSA9PiAoeyBsYWJlbDogXCJcIiwgdmFsdWU6IFwiXCIgfSk7XG5cbmNvbnN0IGVtcHR5UXVlc3Rpb24gPSAob3JkZXIpID0+ICh7XG4gIGxhYmVsOiBcIlwiLFxuICB0eXBlOiBcIlJBRElPXCIsXG4gIHJlcXVpcmVkOiB0cnVlLFxuICBvcmRlcjogb3JkZXIgPz8gMSxcbiAgb3B0aW9uczogW2VtcHR5T3B0aW9uKCldLFxufSk7XG5cbmNvbnN0IHBhcnNlUXVlc3Rpb25zSnNvbiA9IChyYXcpID0+IHtcbiAgaWYgKHJhdyA9PSBudWxsIHx8IHJhdyA9PT0gXCJcIikge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShTdHJpbmcocmF3KSk7XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkocGFyc2VkKSA/IHBhcnNlZCA6IFtdO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gW107XG4gIH1cbn07XG5cbmNvbnN0IG5vcm1hbGl6ZVF1ZXN0aW9ucyA9IChxdWVzdGlvbnMpID0+XG4gIHF1ZXN0aW9ucy5tYXAoKHF1ZXN0aW9uLCBpbmRleCkgPT4gKHtcbiAgICBsYWJlbDogU3RyaW5nKHF1ZXN0aW9uPy5sYWJlbCA/PyBcIlwiKSxcbiAgICB0eXBlOiBTdHJpbmcocXVlc3Rpb24/LnR5cGUgPz8gXCJSQURJT1wiKSxcbiAgICByZXF1aXJlZDpcbiAgICAgIHF1ZXN0aW9uPy5yZXF1aXJlZCA9PT0gZmFsc2UgfHxcbiAgICAgIHF1ZXN0aW9uPy5yZXF1aXJlZCA9PT0gXCJmYWxzZVwiIHx8XG4gICAgICBxdWVzdGlvbj8ucmVxdWlyZWQgPT09IFwiMFwiXG4gICAgICAgID8gZmFsc2VcbiAgICAgICAgOiB0cnVlLFxuICAgIG9yZGVyOlxuICAgICAgcXVlc3Rpb24/Lm9yZGVyID09PSBudWxsIHx8IHF1ZXN0aW9uPy5vcmRlciA9PT0gdW5kZWZpbmVkIHx8IHF1ZXN0aW9uPy5vcmRlciA9PT0gXCJcIlxuICAgICAgICA/IGluZGV4ICsgMVxuICAgICAgICA6IE51bWJlcihxdWVzdGlvbi5vcmRlcikgfHwgaW5kZXggKyAxLFxuICAgIG9wdGlvbnM6IEFycmF5LmlzQXJyYXkocXVlc3Rpb24/Lm9wdGlvbnMpXG4gICAgICA/IHF1ZXN0aW9uLm9wdGlvbnMubWFwKChvcHQpID0+ICh7XG4gICAgICAgICAgbGFiZWw6IFN0cmluZyhvcHQ/LmxhYmVsID8/IFwiXCIpLFxuICAgICAgICAgIHZhbHVlOiBTdHJpbmcob3B0Py52YWx1ZSA/PyBcIlwiKSxcbiAgICAgICAgfSkpXG4gICAgICA6IFtdLFxuICB9KSk7XG5cbmNvbnN0IEZvbGxvd1VwRm9ybVF1ZXN0aW9uc0VkaXRvciA9IChwcm9wcykgPT4ge1xuICBjb25zdCB7IHByb3BlcnR5LCByZWNvcmQsIG9uQ2hhbmdlIH0gPSBwcm9wcztcbiAgY29uc3QgcGF0aCA9IHByb3BlcnR5LnBhdGggfHwgcHJvcGVydHkucHJvcGVydHlQYXRoIHx8IFwicXVlc3Rpb25zSnNvblwiO1xuICBjb25zdCB0eXBlT3B0aW9ucyA9IHByb3BlcnR5LnByb3BzPy50eXBlT3B0aW9ucyA/PyBERUZBVUxUX1RZUEVfT1BUSU9OUztcbiAgY29uc3QgZXJyb3IgPSByZWNvcmQ/LmVycm9ycz8uW3BhdGhdO1xuXG4gIGNvbnN0IFtxdWVzdGlvbnMsIHNldFF1ZXN0aW9uc10gPSB1c2VTdGF0ZSgoKSA9PlxuICAgIG5vcm1hbGl6ZVF1ZXN0aW9ucyhwYXJzZVF1ZXN0aW9uc0pzb24ocmVjb3JkPy5wYXJhbXM/LltwYXRoXSkpLFxuICApO1xuXG4gIGNvbnN0IHB1c2hUb0Zvcm0gPSB1c2VDYWxsYmFjayhcbiAgICAobmV4dFF1ZXN0aW9ucykgPT4ge1xuICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVF1ZXN0aW9ucyhuZXh0UXVlc3Rpb25zKTtcbiAgICAgIHNldFF1ZXN0aW9ucyhub3JtYWxpemVkKTtcbiAgICAgIG9uQ2hhbmdlKHBhdGgsIEpTT04uc3RyaW5naWZ5KG5vcm1hbGl6ZWQpKTtcbiAgICB9LFxuICAgIFtvbkNoYW5nZSwgcGF0aF0sXG4gICk7XG5cbiAgY29uc3QgdXBkYXRlUXVlc3Rpb24gPSAoaW5kZXgsIHBhdGNoKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9IHF1ZXN0aW9ucy5tYXAoKHF1ZXN0aW9uLCBpKSA9PlxuICAgICAgaSA9PT0gaW5kZXggPyB7IC4uLnF1ZXN0aW9uLCAuLi5wYXRjaCB9IDogcXVlc3Rpb24sXG4gICAgKTtcbiAgICBwdXNoVG9Gb3JtKG5leHQpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUFkZFF1ZXN0aW9uID0gKCkgPT4ge1xuICAgIHB1c2hUb0Zvcm0oWy4uLnF1ZXN0aW9ucywgZW1wdHlRdWVzdGlvbihxdWVzdGlvbnMubGVuZ3RoICsgMSldKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVSZW1vdmVRdWVzdGlvbiA9IChpbmRleCkgPT4ge1xuICAgIGNvbnN0IG5leHQgPSBxdWVzdGlvbnNcbiAgICAgIC5maWx0ZXIoKF8sIGkpID0+IGkgIT09IGluZGV4KVxuICAgICAgLm1hcCgocXVlc3Rpb24sIGkpID0+ICh7IC4uLnF1ZXN0aW9uLCBvcmRlcjogaSArIDEgfSkpO1xuICAgIHB1c2hUb0Zvcm0obmV4dCk7XG4gIH07XG5cbiAgY29uc3QgdXBkYXRlT3B0aW9uID0gKHF1ZXN0aW9uSW5kZXgsIG9wdGlvbkluZGV4LCBmaWVsZCwgdmFsdWUpID0+IHtcbiAgICBjb25zdCBxdWVzdGlvbiA9IHF1ZXN0aW9uc1txdWVzdGlvbkluZGV4XTtcbiAgICBjb25zdCBvcHRpb25zID0gcXVlc3Rpb24ub3B0aW9ucy5tYXAoKG9wdGlvbiwgaSkgPT5cbiAgICAgIGkgPT09IG9wdGlvbkluZGV4ID8geyAuLi5vcHRpb24sIFtmaWVsZF06IHZhbHVlIH0gOiBvcHRpb24sXG4gICAgKTtcbiAgICB1cGRhdGVRdWVzdGlvbihxdWVzdGlvbkluZGV4LCB7IG9wdGlvbnMgfSk7XG4gIH07XG5cbiAgY29uc3QgYWRkT3B0aW9uID0gKHF1ZXN0aW9uSW5kZXgpID0+IHtcbiAgICBjb25zdCBxdWVzdGlvbiA9IHF1ZXN0aW9uc1txdWVzdGlvbkluZGV4XTtcbiAgICB1cGRhdGVRdWVzdGlvbihxdWVzdGlvbkluZGV4LCB7XG4gICAgICBvcHRpb25zOiBbLi4ucXVlc3Rpb24ub3B0aW9ucywgZW1wdHlPcHRpb24oKV0sXG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgcmVtb3ZlT3B0aW9uID0gKHF1ZXN0aW9uSW5kZXgsIG9wdGlvbkluZGV4KSA9PiB7XG4gICAgY29uc3QgcXVlc3Rpb24gPSBxdWVzdGlvbnNbcXVlc3Rpb25JbmRleF07XG4gICAgY29uc3Qgb3B0aW9ucyA9IHF1ZXN0aW9uLm9wdGlvbnMuZmlsdGVyKChfLCBpKSA9PiBpICE9PSBvcHRpb25JbmRleCk7XG4gICAgdXBkYXRlUXVlc3Rpb24ocXVlc3Rpb25JbmRleCwge1xuICAgICAgb3B0aW9uczogb3B0aW9ucy5sZW5ndGggPyBvcHRpb25zIDogW2VtcHR5T3B0aW9uKCldLFxuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPEZvcm1Hcm91cCBlcnJvcj17Qm9vbGVhbihlcnJvcil9PlxuICAgICAgPExhYmVsPtiz2YjYp9mE2KfYqiDZgdix2YU8L0xhYmVsPlxuICAgICAgPFRleHQgbWI9XCJkZWZhdWx0XCIgc2l6ZT1cInNtXCIgY29sb3I9XCJncmV5NjBcIj5cbiAgICAgICAg2YfYsSDYs9mI2KfZhCDYsdinINio2Kcg2YbZiNi5INmIINqv2LLbjNmG2YfigIzZh9inICjYqNix2KfbjCDYsdin2K/bjNmIL9qG2qnigIzYqNin2qnYsykg2KrYudix24zZgSDaqdmG24zYr9ibINmH2YXZhyDYqNinXG4gICAgICAgINuM2qkg2LDYrtuM2LHZhyDYq9io2Kog2YXbjOKAjNi02YjZhtivLlxuICAgICAgPC9UZXh0PlxuXG4gICAgICA8Qm94IGJvcmRlcj1cImRlZmF1bHRcIiBib3JkZXJSYWRpdXM9XCJkZWZhdWx0XCIgcD1cImRlZmF1bHRcIj5cbiAgICAgICAge3F1ZXN0aW9ucy5sZW5ndGggPT09IDAgPyAoXG4gICAgICAgICAgPFRleHQgc2l6ZT1cInNtXCIgY29sb3I9XCJncmV5NjBcIiBtYj1cImRlZmF1bHRcIj5cbiAgICAgICAgICAgINmH2YbZiNiyINiz2YjYp9mE24wg2KfYttin2YHZhyDZhti02K/ZhyDYp9iz2KouXG4gICAgICAgICAgPC9UZXh0PlxuICAgICAgICApIDogKFxuICAgICAgICAgIHF1ZXN0aW9ucy5tYXAoKHF1ZXN0aW9uLCBxdWVzdGlvbkluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc0Nob2ljZSA9IENIT0lDRV9UWVBFUy5oYXMocXVlc3Rpb24udHlwZSk7XG4gICAgICAgICAgICBjb25zdCBzZWxlY3RlZFR5cGUgPVxuICAgICAgICAgICAgICB0eXBlT3B0aW9ucy5maW5kKChvcHQpID0+IG9wdC52YWx1ZSA9PT0gcXVlc3Rpb24udHlwZSkgPz9cbiAgICAgICAgICAgICAgdHlwZU9wdGlvbnNbMF07XG5cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIDxCb3hcbiAgICAgICAgICAgICAgICBrZXk9e2Bmb2xsb3ctdXAtcXVlc3Rpb24tJHtxdWVzdGlvbkluZGV4fWB9XG4gICAgICAgICAgICAgICAgbWI9XCJ4eGxcIlxuICAgICAgICAgICAgICAgIHBiPVwieHhsXCJcbiAgICAgICAgICAgICAgICBib3JkZXJCb3R0b209XCJkZWZhdWx0XCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxUZXh0IG1iPVwiZGVmYXVsdFwiIGZvbnRXZWlnaHQ9XCJib2xkXCI+XG4gICAgICAgICAgICAgICAgICDYs9mI2KfZhCB7cXVlc3Rpb25JbmRleCArIDF9XG4gICAgICAgICAgICAgICAgPC9UZXh0PlxuXG4gICAgICAgICAgICAgICAgPEJveFxuICAgICAgICAgICAgICAgICAgZmxleFxuICAgICAgICAgICAgICAgICAgZmxleERpcmVjdGlvbj1cInJvd1wiXG4gICAgICAgICAgICAgICAgICBmbGV4V3JhcD1cIndyYXBcIlxuICAgICAgICAgICAgICAgICAgbWI9XCJkZWZhdWx0XCJcbiAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGdhcDogMTIgfX1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8Qm94IGZsZXg9XCIxXCIgbWluV2lkdGg9XCIyMjBweFwiPlxuICAgICAgICAgICAgICAgICAgICA8TGFiZWwgc2l6ZT1cInNtXCI+2YXYqtmGINiz2YjYp9mEPC9MYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPElucHV0XG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e3F1ZXN0aW9uLmxhYmVsfVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVF1ZXN0aW9uKHF1ZXN0aW9uSW5kZXgsIHsgbGFiZWw6IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICA8Qm94IHdpZHRoPVwiMTgwcHhcIj5cbiAgICAgICAgICAgICAgICAgICAgPExhYmVsIHNpemU9XCJzbVwiPtmG2YjYuTwvTGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxTZWxlY3RcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZT17c2VsZWN0ZWRUeXBlfVxuICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnM9e3R5cGVPcHRpb25zfVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoc2VsZWN0ZWQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBzZWxlY3RlZD8udmFsdWUgPz8gXCJSQURJT1wiO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0Y2ggPSB7IHR5cGUgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghQ0hPSUNFX1RZUEVTLmhhcyh0eXBlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRjaC5vcHRpb25zID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFxdWVzdGlvbi5vcHRpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRjaC5vcHRpb25zID0gW2VtcHR5T3B0aW9uKCldO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUXVlc3Rpb24ocXVlc3Rpb25JbmRleCwgcGF0Y2gpO1xuICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICAgIDxCb3ggd2lkdGg9XCIxMDBweFwiPlxuICAgICAgICAgICAgICAgICAgICA8TGFiZWwgc2l6ZT1cInNtXCI+2KrYsdiq24zYqDwvTGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxJbnB1dFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJudW1iZXJcIlxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtxdWVzdGlvbi5vcmRlcn1cbiAgICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVRdWVzdGlvbihxdWVzdGlvbkluZGV4LCB7IG9yZGVyOiBlLnRhcmdldC52YWx1ZSB9KVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICAgICAgPEJveCBkaXNwbGF5PVwiZmxleFwiIGFsaWduSXRlbXM9XCJjZW50ZXJcIiBwdD1cImxnXCI+XG4gICAgICAgICAgICAgICAgICAgIDxDaGVja0JveFxuICAgICAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e3F1ZXN0aW9uLnJlcXVpcmVkfVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUXVlc3Rpb24ocXVlc3Rpb25JbmRleCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogIXF1ZXN0aW9uLnJlcXVpcmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgIDxMYWJlbCBtbD1cInNtXCIgc2l6ZT1cInNtXCI+XG4gICAgICAgICAgICAgICAgICAgICAg2KfZhNiy2KfZhduMXG4gICAgICAgICAgICAgICAgICAgIDwvTGFiZWw+XG4gICAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICA8L0JveD5cblxuICAgICAgICAgICAgICAgIHtpc0Nob2ljZSA/IChcbiAgICAgICAgICAgICAgICAgIDxCb3ggbWw9XCJkZWZhdWx0XCIgcGw9XCJkZWZhdWx0XCIgYm9yZGVyTGVmdD1cImRlZmF1bHRcIj5cbiAgICAgICAgICAgICAgICAgICAgPExhYmVsIHNpemU9XCJzbVwiIG1iPVwic21cIj5cbiAgICAgICAgICAgICAgICAgICAgICDar9iy24zZhtmH4oCM2YfYp1xuICAgICAgICAgICAgICAgICAgICA8L0xhYmVsPlxuICAgICAgICAgICAgICAgICAgICB7cXVlc3Rpb24ub3B0aW9ucy5tYXAoKG9wdGlvbiwgb3B0aW9uSW5kZXgpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICA8Qm94XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2BxLSR7cXVlc3Rpb25JbmRleH0tb3B0LSR7b3B0aW9uSW5kZXh9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGZsZXhcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsZXhEaXJlY3Rpb249XCJyb3dcIlxuICAgICAgICAgICAgICAgICAgICAgICAgZmxleFdyYXA9XCJ3cmFwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1iPVwic21cIlxuICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgZ2FwOiA4IH19XG4gICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgPEJveCBmbGV4PVwiMVwiIG1pbldpZHRoPVwiMTYwcHhcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPElucHV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCLYudmG2YjYp9mGINqv2LLbjNmG2YdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtvcHRpb24ubGFiZWx9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlT3B0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWVzdGlvbkluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJsYWJlbFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxCb3ggZmxleD1cIjFcIiBtaW5XaWR0aD1cIjE0MHB4XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxJbnB1dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwidmFsdWVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtvcHRpb24udmFsdWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlT3B0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWVzdGlvbkluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHNpemU9XCJpY29uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFudD1cInRleHRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcj1cImRhbmdlclwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlT3B0aW9uKHF1ZXN0aW9uSW5kZXgsIG9wdGlvbkluZGV4KVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxJY29uIGljb249XCJUcmFzaDJcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgc2l6ZT1cInNtXCJcbiAgICAgICAgICAgICAgICAgICAgICB2YXJpYW50PVwidGV4dFwiXG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gYWRkT3B0aW9uKHF1ZXN0aW9uSW5kZXgpfVxuICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgPEljb24gaWNvbj1cIlBsdXNcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgINin2YHYstmI2K/ZhiDar9iy24zZhtmHXG4gICAgICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgKSA6IG51bGx9XG5cbiAgICAgICAgICAgICAgICA8Qm94IG10PVwiZGVmYXVsdFwiPlxuICAgICAgICAgICAgICAgICAgPEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgc2l6ZT1cInNtXCJcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFudD1cInRleHRcIlxuICAgICAgICAgICAgICAgICAgICBjb2xvcj1cImRhbmdlclwiXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVJlbW92ZVF1ZXN0aW9uKHF1ZXN0aW9uSW5kZXgpfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8SWNvbiBpY29uPVwiVHJhc2gyXCIgLz5cbiAgICAgICAgICAgICAgICAgICAg2K3YsNmBINiz2YjYp9mEXG4gICAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pXG4gICAgICAgICl9XG5cbiAgICAgICAgPEJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdmFyaWFudD1cIm91dGxpbmVkXCIgb25DbGljaz17aGFuZGxlQWRkUXVlc3Rpb259PlxuICAgICAgICAgIDxJY29uIGljb249XCJQbHVzXCIgLz5cbiAgICAgICAgICDYp9mB2LLZiNiv2YYg2LPZiNin2YRcbiAgICAgICAgPC9CdXR0b24+XG4gICAgICA8L0JveD5cblxuICAgICAgPEZvcm1NZXNzYWdlPntlcnJvcj8ubWVzc2FnZX08L0Zvcm1NZXNzYWdlPlxuICAgIDwvRm9ybUdyb3VwPlxuICApO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgRm9sbG93VXBGb3JtUXVlc3Rpb25zRWRpdG9yO1xuIiwiaW1wb3J0IFJlYWN0LCB7IHVzZUNhbGxiYWNrLCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHtcbiAgQm94LFxuICBCdXR0b24sXG4gIENoZWNrQm94LFxuICBGb3JtR3JvdXAsXG4gIEZvcm1NZXNzYWdlLFxuICBJY29uLFxuICBJbnB1dCxcbiAgTGFiZWwsXG4gIFNlbGVjdCxcbiAgVGV4dCxcbiAgVGV4dEFyZWEsXG59IGZyb20gXCJAYWRtaW5qcy9kZXNpZ24tc3lzdGVtXCI7XG5cbmNvbnN0IFNUQVRVU19PUFRJT05TID0gW1xuICB7IHZhbHVlOiBcIkRSQUZUXCIsIGxhYmVsOiBcItm+24zYtOKAjNmG2YjbjNizXCIgfSxcbiAgeyB2YWx1ZTogXCJQVUJMSVNIRURcIiwgbGFiZWw6IFwi2YXZhtiq2LTYsSDYtNiv2YdcIiB9LFxuICB7IHZhbHVlOiBcIkFSQ0hJVkVEXCIsIGxhYmVsOiBcItii2LHYtNuM2YhcIiB9LFxuXTtcblxuY29uc3QgZW1wdHlTZWdtZW50ID0gKG9yZGVyKSA9PiAoe1xuICBsYWJlbDogYNio2K7YtCAke29yZGVyfWAsXG4gIGRlc2NyaXB0aW9uOiBcIlwiLFxuICBpc1JlcXVpcmVkOiB0cnVlLFxuICBjb250ZW50OiBcIlwiLFxufSk7XG5cbmNvbnN0IHBhcnNlRWRpdG9ySnNvbiA9IChyYXcpID0+IHtcbiAgaWYgKCFyYXcpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IFwiRFJBRlRcIiwgc2VnbWVudHM6IFtlbXB0eVNlZ21lbnQoMSldIH07XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKFN0cmluZyhyYXcpKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzOiBwYXJzZWQuc3RhdHVzIHx8IFwiRFJBRlRcIixcbiAgICAgIHNlZ21lbnRzOlxuICAgICAgICBBcnJheS5pc0FycmF5KHBhcnNlZC5zZWdtZW50cykgJiYgcGFyc2VkLnNlZ21lbnRzLmxlbmd0aFxuICAgICAgICAgID8gcGFyc2VkLnNlZ21lbnRzXG4gICAgICAgICAgOiBbZW1wdHlTZWdtZW50KDEpXSxcbiAgICB9O1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IFwiRFJBRlRcIiwgc2VnbWVudHM6IFtlbXB0eVNlZ21lbnQoMSldIH07XG4gIH1cbn07XG5cbmNvbnN0IFByb21wdERlZmluaXRpb25FZGl0b3IgPSAocHJvcHMpID0+IHtcbiAgY29uc3QgeyBwcm9wZXJ0eSwgcmVjb3JkLCBvbkNoYW5nZSB9ID0gcHJvcHM7XG4gIGNvbnN0IHBhdGggPSBwcm9wZXJ0eS5wYXRoIHx8IHByb3BlcnR5LnByb3BlcnR5UGF0aCB8fCBcInByb21wdEVkaXRvckpzb25cIjtcbiAgY29uc3QgZXJyb3IgPSByZWNvcmQ/LmVycm9ycz8uW3BhdGhdO1xuXG4gIGNvbnN0IGluaXRpYWwgPSBwYXJzZUVkaXRvckpzb24ocmVjb3JkPy5wYXJhbXM/LltwYXRoXSk7XG4gIGNvbnN0IFtzdGF0dXMsIHNldFN0YXR1c10gPSB1c2VTdGF0ZShpbml0aWFsLnN0YXR1cyk7XG4gIGNvbnN0IFtzZWdtZW50cywgc2V0U2VnbWVudHNdID0gdXNlU3RhdGUoaW5pdGlhbC5zZWdtZW50cyk7XG5cbiAgY29uc3QgcHVzaFRvRm9ybSA9IHVzZUNhbGxiYWNrKFxuICAgIChuZXh0U3RhdHVzLCBuZXh0U2VnbWVudHMpID0+IHtcbiAgICAgIHNldFN0YXR1cyhuZXh0U3RhdHVzKTtcbiAgICAgIHNldFNlZ21lbnRzKG5leHRTZWdtZW50cyk7XG4gICAgICBvbkNoYW5nZShcbiAgICAgICAgcGF0aCxcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHN0YXR1czogbmV4dFN0YXR1cyxcbiAgICAgICAgICBzZWdtZW50czogbmV4dFNlZ21lbnRzLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfSxcbiAgICBbb25DaGFuZ2UsIHBhdGhdLFxuICApO1xuXG4gIGNvbnN0IHVwZGF0ZVNlZ21lbnQgPSAoaW5kZXgsIHBhdGNoKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9IHNlZ21lbnRzLm1hcCgoc2VnbWVudCwgaSkgPT5cbiAgICAgIGkgPT09IGluZGV4ID8geyAuLi5zZWdtZW50LCAuLi5wYXRjaCB9IDogc2VnbWVudCxcbiAgICApO1xuICAgIHB1c2hUb0Zvcm0oc3RhdHVzLCBuZXh0KTtcbiAgfTtcblxuICBjb25zdCBhZGRTZWdtZW50ID0gKCkgPT4ge1xuICAgIHB1c2hUb0Zvcm0oc3RhdHVzLCBbLi4uc2VnbWVudHMsIGVtcHR5U2VnbWVudChzZWdtZW50cy5sZW5ndGggKyAxKV0pO1xuICB9O1xuXG4gIGNvbnN0IHJlbW92ZVNlZ21lbnQgPSAoaW5kZXgpID0+IHtcbiAgICBpZiAoc2VnbWVudHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcHVzaFRvRm9ybShcbiAgICAgIHN0YXR1cyxcbiAgICAgIHNlZ21lbnRzLmZpbHRlcigoXywgaSkgPT4gaSAhPT0gaW5kZXgpLFxuICAgICk7XG4gIH07XG5cbiAgY29uc3Qgc2VsZWN0ZWRTdGF0dXMgPVxuICAgIFNUQVRVU19PUFRJT05TLmZpbmQoKG9wdGlvbikgPT4gb3B0aW9uLnZhbHVlID09PSBzdGF0dXMpID8/XG4gICAgU1RBVFVTX09QVElPTlNbMF07XG5cbiAgcmV0dXJuIChcbiAgICA8Rm9ybUdyb3VwIGVycm9yPXtCb29sZWFuKGVycm9yKX0+XG4gICAgICA8TGFiZWw+2KjYrti04oCM2YfYpyDZiCDZhdiq2YYg2b7Ysdin2YXZvtiqPC9MYWJlbD5cbiAgICAgIDxUZXh0IG1iPVwiZGVmYXVsdFwiIHNpemU9XCJzbVwiIGNvbG9yPVwiZ3JleTYwXCI+XG4gICAgICAgINiq2LnYr9in2K8g2KjYrti04oCM2YfYpyDYsdinINio2KcgwqvYp9mB2LLZiNiv2YYg2KjYrti0wrsg2YXYtNiu2LUg2qnZhtuM2K8g2Ygg2YXYqtmGINmH2LEg2KjYrti0INix2Kcg2YjYp9ix2K8g2qnZhtuM2K8uXG4gICAgICAgINiq2LHYqtuM2Kgg2KjYrti04oCM2YfYpyDZh9mF2KfZhiDYqtix2KrbjNioINin2LPYqtmB2KfYr9mHINiv2LEgQUkg2KfYs9iqICjYqNiu2LQg27HYjCDbstiMINuz2Iwg4oCmKS5cbiAgICAgIDwvVGV4dD5cblxuICAgICAgPEJveCBtYj1cImxnXCIgd2lkdGg9XCIyNDBweFwiPlxuICAgICAgICA8TGFiZWwgc2l6ZT1cInNtXCI+2YjYtti524zYqiDZhtiz2K7ZhzwvTGFiZWw+XG4gICAgICAgIDxTZWxlY3RcbiAgICAgICAgICB2YWx1ZT17c2VsZWN0ZWRTdGF0dXN9XG4gICAgICAgICAgb3B0aW9ucz17U1RBVFVTX09QVElPTlN9XG4gICAgICAgICAgb25DaGFuZ2U9eyhzZWxlY3RlZCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV4dFN0YXR1cyA9IHNlbGVjdGVkPy52YWx1ZSA/PyBcIkRSQUZUXCI7XG4gICAgICAgICAgICBwdXNoVG9Gb3JtKG5leHRTdGF0dXMsIHNlZ21lbnRzKTtcbiAgICAgICAgICB9fVxuICAgICAgICAvPlxuICAgICAgPC9Cb3g+XG5cbiAgICAgIDxCb3ggYm9yZGVyPVwiZGVmYXVsdFwiIGJvcmRlclJhZGl1cz1cImRlZmF1bHRcIiBwPVwiZGVmYXVsdFwiPlxuICAgICAgICB7c2VnbWVudHMubWFwKChzZWdtZW50LCBpbmRleCkgPT4gKFxuICAgICAgICAgIDxCb3hcbiAgICAgICAgICAgIGtleT17YHByb21wdC1zZWdtZW50LSR7aW5kZXh9YH1cbiAgICAgICAgICAgIG1iPVwieHhsXCJcbiAgICAgICAgICAgIHBiPVwieHhsXCJcbiAgICAgICAgICAgIGJvcmRlckJvdHRvbT1cImRlZmF1bHRcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxUZXh0IG1iPVwiZGVmYXVsdFwiIGZvbnRXZWlnaHQ9XCJib2xkXCI+XG4gICAgICAgICAgICAgINio2K7YtCB7aW5kZXggKyAxfVxuICAgICAgICAgICAgPC9UZXh0PlxuXG4gICAgICAgICAgICA8Qm94IG1iPVwiZGVmYXVsdFwiPlxuICAgICAgICAgICAgICA8TGFiZWwgc2l6ZT1cInNtXCI+2LnZhtmI2KfZhiDYqNiu2LQ8L0xhYmVsPlxuICAgICAgICAgICAgICA8SW5wdXRcbiAgICAgICAgICAgICAgICB2YWx1ZT17c2VnbWVudC5sYWJlbCA/PyBcIlwifVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT5cbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVNlZ21lbnQoaW5kZXgsIHsgbGFiZWw6IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9Cb3g+XG5cbiAgICAgICAgICAgIDxCb3ggbWI9XCJkZWZhdWx0XCI+XG4gICAgICAgICAgICAgIDxMYWJlbCBzaXplPVwic21cIj7YqtmI2LbbjNitICjYp9iu2KrbjNin2LHbjCk8L0xhYmVsPlxuICAgICAgICAgICAgICA8SW5wdXRcbiAgICAgICAgICAgICAgICB2YWx1ZT17c2VnbWVudC5kZXNjcmlwdGlvbiA/PyBcIlwifVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT5cbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVNlZ21lbnQoaW5kZXgsIHsgZGVzY3JpcHRpb246IGUudGFyZ2V0LnZhbHVlIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9Cb3g+XG5cbiAgICAgICAgICAgIDxCb3ggbWI9XCJkZWZhdWx0XCIgZGlzcGxheT1cImZsZXhcIiBhbGlnbkl0ZW1zPVwiY2VudGVyXCI+XG4gICAgICAgICAgICAgIDxDaGVja0JveFxuICAgICAgICAgICAgICAgIGNoZWNrZWQ9e3NlZ21lbnQuaXNSZXF1aXJlZCAhPT0gZmFsc2V9XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9eygpID0+XG4gICAgICAgICAgICAgICAgICB1cGRhdGVTZWdtZW50KGluZGV4LCB7XG4gICAgICAgICAgICAgICAgICAgIGlzUmVxdWlyZWQ6IHNlZ21lbnQuaXNSZXF1aXJlZCA9PT0gZmFsc2UsXG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPExhYmVsIG1sPVwic21cIiBzaXplPVwic21cIj5cbiAgICAgICAgICAgICAgICDZhdit2KrZiNin24wg2KfbjNmGINio2K7YtCDYp9mE2LLYp9mF24wg2KfYs9iqXG4gICAgICAgICAgICAgIDwvTGFiZWw+XG4gICAgICAgICAgICA8L0JveD5cblxuICAgICAgICAgICAgPEJveCBtYj1cImRlZmF1bHRcIj5cbiAgICAgICAgICAgICAgPExhYmVsIHNpemU9XCJzbVwiPtmF2KrZhiDZvtix2KfZhdm+2Ko8L0xhYmVsPlxuICAgICAgICAgICAgICA8VGV4dEFyZWFcbiAgICAgICAgICAgICAgICB2YWx1ZT17c2VnbWVudC5jb250ZW50ID8/IFwiXCJ9XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PlxuICAgICAgICAgICAgICAgICAgdXBkYXRlU2VnbWVudChpbmRleCwgeyBjb250ZW50OiBlLnRhcmdldC52YWx1ZSB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByb3dzPXs4fVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgPC9Cb3g+XG5cbiAgICAgICAgICAgIHtzZWdtZW50cy5sZW5ndGggPiAxID8gKFxuICAgICAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgc2l6ZT1cInNtXCJcbiAgICAgICAgICAgICAgICB2YXJpYW50PVwidGV4dFwiXG4gICAgICAgICAgICAgICAgY29sb3I9XCJkYW5nZXJcIlxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHJlbW92ZVNlZ21lbnQoaW5kZXgpfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPEljb24gaWNvbj1cIlRyYXNoMlwiIC8+XG4gICAgICAgICAgICAgICAg2K3YsNmBINio2K7YtFxuICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgIDwvQm94PlxuICAgICAgICApKX1cblxuICAgICAgICA8QnV0dG9uIHR5cGU9XCJidXR0b25cIiB2YXJpYW50PVwib3V0bGluZWRcIiBvbkNsaWNrPXthZGRTZWdtZW50fT5cbiAgICAgICAgICA8SWNvbiBpY29uPVwiUGx1c1wiIC8+XG4gICAgICAgICAg2KfZgdiy2YjYr9mGINio2K7YtFxuICAgICAgICA8L0J1dHRvbj5cbiAgICAgIDwvQm94PlxuXG4gICAgICA8Rm9ybU1lc3NhZ2U+e2Vycm9yPy5tZXNzYWdlfTwvRm9ybU1lc3NhZ2U+XG4gICAgPC9Gb3JtR3JvdXA+XG4gICk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBQcm9tcHREZWZpbml0aW9uRWRpdG9yO1xuIiwiaW1wb3J0IHsgRHJvcFpvbmUsIERyb3Bab25lSXRlbSwgRm9ybUdyb3VwLCBMYWJlbCB9IGZyb20gJ0BhZG1pbmpzL2Rlc2lnbi1zeXN0ZW0nO1xuaW1wb3J0IHsgZmxhdCwgdXNlVHJhbnNsYXRpb24gfSBmcm9tICdhZG1pbmpzJztcbmltcG9ydCBSZWFjdCwgeyB1c2VFZmZlY3QsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuY29uc3QgRWRpdCA9ICh7IHByb3BlcnR5LCByZWNvcmQsIG9uQ2hhbmdlIH0pID0+IHtcbiAgICBjb25zdCB7IHRyYW5zbGF0ZVByb3BlcnR5IH0gPSB1c2VUcmFuc2xhdGlvbigpO1xuICAgIGNvbnN0IHsgcGFyYW1zIH0gPSByZWNvcmQ7XG4gICAgY29uc3QgeyBjdXN0b20gfSA9IHByb3BlcnR5O1xuICAgIGNvbnN0IHBhdGggPSBmbGF0LmdldChwYXJhbXMsIGN1c3RvbS5maWxlUGF0aFByb3BlcnR5KTtcbiAgICBjb25zdCBrZXkgPSBmbGF0LmdldChwYXJhbXMsIGN1c3RvbS5rZXlQcm9wZXJ0eSk7XG4gICAgY29uc3QgZmlsZSA9IGZsYXQuZ2V0KHBhcmFtcywgY3VzdG9tLmZpbGVQcm9wZXJ0eSk7XG4gICAgY29uc3QgW29yaWdpbmFsS2V5LCBzZXRPcmlnaW5hbEtleV0gPSB1c2VTdGF0ZShrZXkpO1xuICAgIGNvbnN0IFtmaWxlc1RvVXBsb2FkLCBzZXRGaWxlc1RvVXBsb2FkXSA9IHVzZVN0YXRlKFtdKTtcbiAgICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgICAgICAvLyBpdCBtZWFucyBtZWFucyB0aGF0IHNvbWVvbmUgaGl0IHNhdmUgYW5kIG5ldyBmaWxlIGhhcyBiZWVuIHVwbG9hZGVkXG4gICAgICAgIC8vIGluIHRoaXMgY2FzZSBmbGllc1RvVXBsb2FkIHNob3VsZCBiZSBjbGVhcmVkLlxuICAgICAgICAvLyBUaGlzIGhhcHBlbnMgd2hlbiB1c2VyIHR1cm5zIG9mZiByZWRpcmVjdCBhZnRlciBuZXcvZWRpdFxuICAgICAgICBpZiAoKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnICYmIGtleSAhPT0gb3JpZ2luYWxLZXkpXG4gICAgICAgICAgICB8fCAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycgJiYgIW9yaWdpbmFsS2V5KVxuICAgICAgICAgICAgfHwgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnICYmIEFycmF5LmlzQXJyYXkoa2V5KSAmJiBrZXkubGVuZ3RoICE9PSBvcmlnaW5hbEtleS5sZW5ndGgpKSB7XG4gICAgICAgICAgICBzZXRPcmlnaW5hbEtleShrZXkpO1xuICAgICAgICAgICAgc2V0RmlsZXNUb1VwbG9hZChbXSk7XG4gICAgICAgIH1cbiAgICB9LCBba2V5LCBvcmlnaW5hbEtleV0pO1xuICAgIGNvbnN0IG9uVXBsb2FkID0gKGZpbGVzKSA9PiB7XG4gICAgICAgIHNldEZpbGVzVG9VcGxvYWQoZmlsZXMpO1xuICAgICAgICBvbkNoYW5nZShjdXN0b20uZmlsZVByb3BlcnR5LCBmaWxlcyk7XG4gICAgfTtcbiAgICBjb25zdCBoYW5kbGVSZW1vdmUgPSAoKSA9PiB7XG4gICAgICAgIG9uQ2hhbmdlKGN1c3RvbS5maWxlUHJvcGVydHksIG51bGwpO1xuICAgIH07XG4gICAgY29uc3QgaGFuZGxlTXVsdGlSZW1vdmUgPSAoc2luZ2xlS2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gKGZsYXQuZ2V0KHJlY29yZC5wYXJhbXMsIGN1c3RvbS5rZXlQcm9wZXJ0eSkgfHwgW10pLmluZGV4T2Yoc2luZ2xlS2V5KTtcbiAgICAgICAgY29uc3QgZmlsZXNUb0RlbGV0ZSA9IGZsYXQuZ2V0KHJlY29yZC5wYXJhbXMsIGN1c3RvbS5maWxlc1RvRGVsZXRlUHJvcGVydHkpIHx8IFtdO1xuICAgICAgICBpZiAocGF0aCAmJiBwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1BhdGggPSBwYXRoLm1hcCgoY3VycmVudFBhdGgsIGkpID0+IChpICE9PSBpbmRleCA/IGN1cnJlbnRQYXRoIDogbnVsbCkpO1xuICAgICAgICAgICAgbGV0IG5ld1BhcmFtcyA9IGZsYXQuc2V0KHJlY29yZC5wYXJhbXMsIGN1c3RvbS5maWxlc1RvRGVsZXRlUHJvcGVydHksIFsuLi5maWxlc1RvRGVsZXRlLCBpbmRleF0pO1xuICAgICAgICAgICAgbmV3UGFyYW1zID0gZmxhdC5zZXQobmV3UGFyYW1zLCBjdXN0b20uZmlsZVBhdGhQcm9wZXJ0eSwgbmV3UGF0aCk7XG4gICAgICAgICAgICBvbkNoYW5nZSh7XG4gICAgICAgICAgICAgICAgLi4ucmVjb3JkLFxuICAgICAgICAgICAgICAgIHBhcmFtczogbmV3UGFyYW1zLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1lvdSBjYW5ub3QgcmVtb3ZlIGZpbGUgd2hlbiB0aGVyZSBhcmUgbm8gdXBsb2FkZWQgZmlsZXMgeWV0Jyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiAoUmVhY3QuY3JlYXRlRWxlbWVudChGb3JtR3JvdXAsIG51bGwsXG4gICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoTGFiZWwsIG51bGwsIHRyYW5zbGF0ZVByb3BlcnR5KHByb3BlcnR5LmxhYmVsLCBwcm9wZXJ0eS5yZXNvdXJjZUlkKSksXG4gICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoRHJvcFpvbmUsIHsgb25DaGFuZ2U6IG9uVXBsb2FkLCBtdWx0aXBsZTogY3VzdG9tLm11bHRpcGxlLCB2YWxpZGF0ZToge1xuICAgICAgICAgICAgICAgIG1pbWVUeXBlczogY3VzdG9tLm1pbWVUeXBlcyxcbiAgICAgICAgICAgICAgICBtYXhTaXplOiBjdXN0b20ubWF4U2l6ZSxcbiAgICAgICAgICAgIH0sIGZpbGVzOiBmaWxlc1RvVXBsb2FkIH0pLFxuICAgICAgICAhY3VzdG9tLm11bHRpcGxlICYmIGtleSAmJiBwYXRoICYmICFmaWxlc1RvVXBsb2FkLmxlbmd0aCAmJiBmaWxlICE9PSBudWxsICYmIChSZWFjdC5jcmVhdGVFbGVtZW50KERyb3Bab25lSXRlbSwgeyBmaWxlbmFtZToga2V5LCBzcmM6IHBhdGgsIG9uUmVtb3ZlOiBoYW5kbGVSZW1vdmUgfSkpLFxuICAgICAgICBjdXN0b20ubXVsdGlwbGUgJiYga2V5ICYmIGtleS5sZW5ndGggJiYgcGF0aCA/IChSZWFjdC5jcmVhdGVFbGVtZW50KFJlYWN0LkZyYWdtZW50LCBudWxsLCBrZXkubWFwKChzaW5nbGVLZXksIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAvLyB3aGVuIHdlIHJlbW92ZSBpdGVtcyB3ZSBzZXQgb25seSBwYXRoIGluZGV4IHRvIG51bGxzLlxuICAgICAgICAgICAgLy8ga2V5IGlzIHN0aWxsIHRoZXJlLiBUaGlzIGlzIGJlY2F1c2VcbiAgICAgICAgICAgIC8vIHdlIGhhdmUgdG8gbWFpbnRhaW4gYWxsIHRoZSBpbmRleGVzLiBTbyBoZXJlIHdlIHNpbXBseSBmaWx0ZXIgb3V0IGVsZW1lbnRzIHdoaWNoXG4gICAgICAgICAgICAvLyB3ZXJlIHJlbW92ZWQgYW5kIGRpc3BsYXkgb25seSB3aGF0IHdhcyBsZWZ0XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50UGF0aCA9IHBhdGhbaW5kZXhdO1xuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRQYXRoID8gKFJlYWN0LmNyZWF0ZUVsZW1lbnQoRHJvcFpvbmVJdGVtLCB7IGtleTogc2luZ2xlS2V5LCBmaWxlbmFtZTogc2luZ2xlS2V5LCBzcmM6IHBhdGhbaW5kZXhdLCBvblJlbW92ZTogKCkgPT4gaGFuZGxlTXVsdGlSZW1vdmUoc2luZ2xlS2V5KSB9KSkgOiAnJztcbiAgICAgICAgfSkpKSA6ICcnKSk7XG59O1xuZXhwb3J0IGRlZmF1bHQgRWRpdDtcbiIsImV4cG9ydCBjb25zdCBBdWRpb01pbWVUeXBlcyA9IFtcbiAgICAnYXVkaW8vYWFjJyxcbiAgICAnYXVkaW8vbWlkaScsXG4gICAgJ2F1ZGlvL3gtbWlkaScsXG4gICAgJ2F1ZGlvL21wZWcnLFxuICAgICdhdWRpby9vZ2cnLFxuICAgICdhcHBsaWNhdGlvbi9vZ2cnLFxuICAgICdhdWRpby9vcHVzJyxcbiAgICAnYXVkaW8vd2F2JyxcbiAgICAnYXVkaW8vd2VibScsXG4gICAgJ2F1ZGlvLzNncHAyJyxcbl07XG5leHBvcnQgY29uc3QgVmlkZW9NaW1lVHlwZXMgPSBbXG4gICAgJ3ZpZGVvL3gtbXN2aWRlbycsXG4gICAgJ3ZpZGVvL21wZWcnLFxuICAgICd2aWRlby9vZ2cnLFxuICAgICd2aWRlby9tcDJ0JyxcbiAgICAndmlkZW8vd2VibScsXG4gICAgJ3ZpZGVvLzNncHAnLFxuICAgICd2aWRlby8zZ3BwMicsXG5dO1xuZXhwb3J0IGNvbnN0IEltYWdlTWltZVR5cGVzID0gW1xuICAgICdpbWFnZS9ibXAnLFxuICAgICdpbWFnZS9naWYnLFxuICAgICdpbWFnZS9qcGVnJyxcbiAgICAnaW1hZ2UvcG5nJyxcbiAgICAnaW1hZ2Uvc3ZnK3htbCcsXG4gICAgJ2ltYWdlL3ZuZC5taWNyb3NvZnQuaWNvbicsXG4gICAgJ2ltYWdlL3RpZmYnLFxuICAgICdpbWFnZS93ZWJwJyxcbl07XG5leHBvcnQgY29uc3QgQ29tcHJlc3NlZE1pbWVUeXBlcyA9IFtcbiAgICAnYXBwbGljYXRpb24veC1iemlwJyxcbiAgICAnYXBwbGljYXRpb24veC1iemlwMicsXG4gICAgJ2FwcGxpY2F0aW9uL2d6aXAnLFxuICAgICdhcHBsaWNhdGlvbi9qYXZhLWFyY2hpdmUnLFxuICAgICdhcHBsaWNhdGlvbi94LXRhcicsXG4gICAgJ2FwcGxpY2F0aW9uL3ppcCcsXG4gICAgJ2FwcGxpY2F0aW9uL3gtN3otY29tcHJlc3NlZCcsXG5dO1xuZXhwb3J0IGNvbnN0IERvY3VtZW50TWltZVR5cGVzID0gW1xuICAgICdhcHBsaWNhdGlvbi94LWFiaXdvcmQnLFxuICAgICdhcHBsaWNhdGlvbi94LWZyZWVhcmMnLFxuICAgICdhcHBsaWNhdGlvbi92bmQuYW1hem9uLmVib29rJyxcbiAgICAnYXBwbGljYXRpb24vbXN3b3JkJyxcbiAgICAnYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LndvcmRwcm9jZXNzaW5nbWwuZG9jdW1lbnQnLFxuICAgICdhcHBsaWNhdGlvbi92bmQubXMtZm9udG9iamVjdCcsXG4gICAgJ2FwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQucHJlc2VudGF0aW9uJyxcbiAgICAnYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC5zcHJlYWRzaGVldCcsXG4gICAgJ2FwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQudGV4dCcsXG4gICAgJ2FwcGxpY2F0aW9uL3ZuZC5tcy1wb3dlcnBvaW50JyxcbiAgICAnYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnByZXNlbnRhdGlvbicsXG4gICAgJ2FwcGxpY2F0aW9uL3ZuZC5yYXInLFxuICAgICdhcHBsaWNhdGlvbi9ydGYnLFxuICAgICdhcHBsaWNhdGlvbi92bmQubXMtZXhjZWwnLFxuICAgICdhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5zaGVldCcsXG5dO1xuZXhwb3J0IGNvbnN0IFRleHRNaW1lVHlwZXMgPSBbXG4gICAgJ3RleHQvY3NzJyxcbiAgICAndGV4dC9jc3YnLFxuICAgICd0ZXh0L2h0bWwnLFxuICAgICd0ZXh0L2NhbGVuZGFyJyxcbiAgICAndGV4dC9qYXZhc2NyaXB0JyxcbiAgICAnYXBwbGljYXRpb24vanNvbicsXG4gICAgJ2FwcGxpY2F0aW9uL2xkK2pzb24nLFxuICAgICd0ZXh0L2phdmFzY3JpcHQnLFxuICAgICd0ZXh0L3BsYWluJyxcbiAgICAnYXBwbGljYXRpb24veGh0bWwreG1sJyxcbiAgICAnYXBwbGljYXRpb24veG1sJyxcbiAgICAndGV4dC94bWwnLFxuXTtcbmV4cG9ydCBjb25zdCBCaW5hcnlEb2NzTWltZVR5cGVzID0gW1xuICAgICdhcHBsaWNhdGlvbi9lcHViK3ppcCcsXG4gICAgJ2FwcGxpY2F0aW9uL3BkZicsXG5dO1xuZXhwb3J0IGNvbnN0IEZvbnRNaW1lVHlwZXMgPSBbXG4gICAgJ2ZvbnQvb3RmJyxcbiAgICAnZm9udC90dGYnLFxuICAgICdmb250L3dvZmYnLFxuICAgICdmb250L3dvZmYyJyxcbl07XG5leHBvcnQgY29uc3QgT3RoZXJNaW1lVHlwZXMgPSBbXG4gICAgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScsXG4gICAgJ2FwcGxpY2F0aW9uL3gtY3NoJyxcbiAgICAnYXBwbGljYXRpb24vdm5kLmFwcGxlLmluc3RhbGxlcit4bWwnLFxuICAgICdhcHBsaWNhdGlvbi94LWh0dHBkLXBocCcsXG4gICAgJ2FwcGxpY2F0aW9uL3gtc2gnLFxuICAgICdhcHBsaWNhdGlvbi94LXNob2Nrd2F2ZS1mbGFzaCcsXG4gICAgJ3ZuZC52aXNpbycsXG4gICAgJ2FwcGxpY2F0aW9uL3ZuZC5tb3ppbGxhLnh1bCt4bWwnLFxuXTtcbmV4cG9ydCBjb25zdCBNaW1lVHlwZXMgPSBbXG4gICAgLi4uQXVkaW9NaW1lVHlwZXMsXG4gICAgLi4uVmlkZW9NaW1lVHlwZXMsXG4gICAgLi4uSW1hZ2VNaW1lVHlwZXMsXG4gICAgLi4uQ29tcHJlc3NlZE1pbWVUeXBlcyxcbiAgICAuLi5Eb2N1bWVudE1pbWVUeXBlcyxcbiAgICAuLi5UZXh0TWltZVR5cGVzLFxuICAgIC4uLkJpbmFyeURvY3NNaW1lVHlwZXMsXG4gICAgLi4uT3RoZXJNaW1lVHlwZXMsXG4gICAgLi4uRm9udE1pbWVUeXBlcyxcbiAgICAuLi5PdGhlck1pbWVUeXBlcyxcbl07XG4iLCIvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgaW1wb3J0L25vLWV4dHJhbmVvdXMtZGVwZW5kZW5jaWVzXG5pbXBvcnQgeyBCb3gsIEJ1dHRvbiwgSWNvbiB9IGZyb20gJ0BhZG1pbmpzL2Rlc2lnbi1zeXN0ZW0nO1xuaW1wb3J0IHsgZmxhdCB9IGZyb20gJ2FkbWluanMnO1xuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IEF1ZGlvTWltZVR5cGVzLCBJbWFnZU1pbWVUeXBlcyB9IGZyb20gJy4uL3R5cGVzL21pbWUtdHlwZXMudHlwZS5qcyc7XG5jb25zdCBTaW5nbGVGaWxlID0gKHByb3BzKSA9PiB7XG4gICAgY29uc3QgeyBuYW1lLCBwYXRoLCBtaW1lVHlwZSwgd2lkdGggfSA9IHByb3BzO1xuICAgIGlmIChwYXRoICYmIHBhdGgubGVuZ3RoKSB7XG4gICAgICAgIGlmIChtaW1lVHlwZSAmJiBJbWFnZU1pbWVUeXBlcy5pbmNsdWRlcyhtaW1lVHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAoUmVhY3QuY3JlYXRlRWxlbWVudChcImltZ1wiLCB7IHNyYzogcGF0aCwgc3R5bGU6IHsgbWF4SGVpZ2h0OiB3aWR0aCwgbWF4V2lkdGg6IHdpZHRoIH0sIGFsdDogbmFtZSB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1pbWVUeXBlICYmIEF1ZGlvTWltZVR5cGVzLmluY2x1ZGVzKG1pbWVUeXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIChSZWFjdC5jcmVhdGVFbGVtZW50KFwiYXVkaW9cIiwgeyBjb250cm9sczogdHJ1ZSwgc3JjOiBwYXRoIH0sXG4gICAgICAgICAgICAgICAgXCJZb3VyIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB0aGVcIixcbiAgICAgICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KFwiY29kZVwiLCBudWxsLCBcImF1ZGlvXCIpLFxuICAgICAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ0cmFja1wiLCB7IGtpbmQ6IFwiY2FwdGlvbnNcIiB9KSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAoUmVhY3QuY3JlYXRlRWxlbWVudChCb3gsIG51bGwsXG4gICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoQnV0dG9uLCB7IGFzOiBcImFcIiwgaHJlZjogcGF0aCwgbWw6IFwiZGVmYXVsdFwiLCBzaXplOiBcInNtXCIsIHJvdW5kZWQ6IHRydWUsIHRhcmdldDogXCJfYmxhbmtcIiB9LFxuICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChJY29uLCB7IGljb246IFwiRG9jdW1lbnREb3dubG9hZFwiLCBjb2xvcjogXCJ3aGl0ZVwiLCBtcjogXCJkZWZhdWx0XCIgfSksXG4gICAgICAgICAgICBuYW1lKSkpO1xufTtcbmNvbnN0IEZpbGUgPSAoeyB3aWR0aCwgcmVjb3JkLCBwcm9wZXJ0eSB9KSA9PiB7XG4gICAgY29uc3QgeyBjdXN0b20gfSA9IHByb3BlcnR5O1xuICAgIGxldCBwYXRoID0gZmxhdC5nZXQocmVjb3JkPy5wYXJhbXMsIGN1c3RvbS5maWxlUGF0aFByb3BlcnR5KTtcbiAgICBpZiAoIXBhdGgpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IG5hbWUgPSBmbGF0LmdldChyZWNvcmQ/LnBhcmFtcywgY3VzdG9tLmZpbGVOYW1lUHJvcGVydHkgPyBjdXN0b20uZmlsZU5hbWVQcm9wZXJ0eSA6IGN1c3RvbS5rZXlQcm9wZXJ0eSk7XG4gICAgY29uc3QgbWltZVR5cGUgPSBjdXN0b20ubWltZVR5cGVQcm9wZXJ0eVxuICAgICAgICAmJiBmbGF0LmdldChyZWNvcmQ/LnBhcmFtcywgY3VzdG9tLm1pbWVUeXBlUHJvcGVydHkpO1xuICAgIGlmICghcHJvcGVydHkuY3VzdG9tLm11bHRpcGxlKSB7XG4gICAgICAgIGlmIChjdXN0b20ub3B0cyAmJiBjdXN0b20ub3B0cy5iYXNlVXJsKSB7XG4gICAgICAgICAgICBwYXRoID0gYCR7Y3VzdG9tLm9wdHMuYmFzZVVybH0vJHtuYW1lfWA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChSZWFjdC5jcmVhdGVFbGVtZW50KFNpbmdsZUZpbGUsIHsgcGF0aDogcGF0aCwgbmFtZTogbmFtZSwgd2lkdGg6IHdpZHRoLCBtaW1lVHlwZTogbWltZVR5cGUgfSkpO1xuICAgIH1cbiAgICBpZiAoY3VzdG9tLm9wdHMgJiYgY3VzdG9tLm9wdHMuYmFzZVVybCkge1xuICAgICAgICBjb25zdCBiYXNlVXJsID0gY3VzdG9tLm9wdHMuYmFzZVVybCB8fCAnJztcbiAgICAgICAgcGF0aCA9IHBhdGgubWFwKChzaW5nbGVQYXRoLCBpbmRleCkgPT4gYCR7YmFzZVVybH0vJHtuYW1lW2luZGV4XX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIChSZWFjdC5jcmVhdGVFbGVtZW50KFJlYWN0LkZyYWdtZW50LCBudWxsLCBwYXRoLm1hcCgoc2luZ2xlUGF0aCwgaW5kZXgpID0+IChSZWFjdC5jcmVhdGVFbGVtZW50KFNpbmdsZUZpbGUsIHsga2V5OiBzaW5nbGVQYXRoLCBwYXRoOiBzaW5nbGVQYXRoLCBuYW1lOiBuYW1lW2luZGV4XSwgd2lkdGg6IHdpZHRoLCBtaW1lVHlwZTogbWltZVR5cGVbaW5kZXhdIH0pKSkpKTtcbn07XG5leHBvcnQgZGVmYXVsdCBGaWxlO1xuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBGaWxlIGZyb20gJy4vZmlsZS5qcyc7XG5jb25zdCBMaXN0ID0gKHByb3BzKSA9PiAoUmVhY3QuY3JlYXRlRWxlbWVudChGaWxlLCB7IHdpZHRoOiAxMDAsIC4uLnByb3BzIH0pKTtcbmV4cG9ydCBkZWZhdWx0IExpc3Q7XG4iLCJpbXBvcnQgeyBGb3JtR3JvdXAsIExhYmVsIH0gZnJvbSAnQGFkbWluanMvZGVzaWduLXN5c3RlbSc7XG5pbXBvcnQgeyB1c2VUcmFuc2xhdGlvbiB9IGZyb20gJ2FkbWluanMnO1xuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBGaWxlIGZyb20gJy4vZmlsZS5qcyc7XG5jb25zdCBTaG93ID0gKHByb3BzKSA9PiB7XG4gICAgY29uc3QgeyBwcm9wZXJ0eSB9ID0gcHJvcHM7XG4gICAgY29uc3QgeyB0cmFuc2xhdGVQcm9wZXJ0eSB9ID0gdXNlVHJhbnNsYXRpb24oKTtcbiAgICByZXR1cm4gKFJlYWN0LmNyZWF0ZUVsZW1lbnQoRm9ybUdyb3VwLCBudWxsLFxuICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KExhYmVsLCBudWxsLCB0cmFuc2xhdGVQcm9wZXJ0eShwcm9wZXJ0eS5sYWJlbCwgcHJvcGVydHkucmVzb3VyY2VJZCkpLFxuICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KEZpbGUsIHsgd2lkdGg6IFwiMTAwJVwiLCAuLi5wcm9wcyB9KSkpO1xufTtcbmV4cG9ydCBkZWZhdWx0IFNob3c7XG4iLCJBZG1pbkpTLlVzZXJDb21wb25lbnRzID0ge31cbmltcG9ydCBEb3dubG9hZEZpbGVBdHRhY2htZW50IGZyb20gJy4uL3NyYy9hZG1pbi1jb21wb25lbnRzL0Rvd25sb2FkRmlsZUF0dGFjaG1lbnQnXG5BZG1pbkpTLlVzZXJDb21wb25lbnRzLkRvd25sb2FkRmlsZUF0dGFjaG1lbnQgPSBEb3dubG9hZEZpbGVBdHRhY2htZW50XG5pbXBvcnQgQXN5bmNSZWNvcmRBY3Rpb25Mb2FkZXIgZnJvbSAnLi4vc3JjL2FkbWluLWNvbXBvbmVudHMvQXN5bmNSZWNvcmRBY3Rpb25Mb2FkZXInXG5BZG1pbkpTLlVzZXJDb21wb25lbnRzLkFzeW5jUmVjb3JkQWN0aW9uTG9hZGVyID0gQXN5bmNSZWNvcmRBY3Rpb25Mb2FkZXJcbmltcG9ydCBQcm9maWxlRmllbGRLZXlNdWx0aVNlbGVjdCBmcm9tICcuLi9zcmMvYWRtaW4tY29tcG9uZW50cy9Qcm9maWxlRmllbGRLZXlNdWx0aVNlbGVjdCdcbkFkbWluSlMuVXNlckNvbXBvbmVudHMuUHJvZmlsZUZpZWxkS2V5TXVsdGlTZWxlY3QgPSBQcm9maWxlRmllbGRLZXlNdWx0aVNlbGVjdFxuaW1wb3J0IEZvcm1RdWVzdGlvbk9wdGlvbnNFZGl0b3IgZnJvbSAnLi4vc3JjL2FkbWluLWNvbXBvbmVudHMvRm9ybVF1ZXN0aW9uT3B0aW9uc0VkaXRvcidcbkFkbWluSlMuVXNlckNvbXBvbmVudHMuRm9ybVF1ZXN0aW9uT3B0aW9uc0VkaXRvciA9IEZvcm1RdWVzdGlvbk9wdGlvbnNFZGl0b3JcbmltcG9ydCBGb2xsb3dVcEZvcm1RdWVzdGlvbnNFZGl0b3IgZnJvbSAnLi4vc3JjL2FkbWluLWNvbXBvbmVudHMvRm9sbG93VXBGb3JtUXVlc3Rpb25zRWRpdG9yJ1xuQWRtaW5KUy5Vc2VyQ29tcG9uZW50cy5Gb2xsb3dVcEZvcm1RdWVzdGlvbnNFZGl0b3IgPSBGb2xsb3dVcEZvcm1RdWVzdGlvbnNFZGl0b3JcbmltcG9ydCBQcm9tcHREZWZpbml0aW9uRWRpdG9yIGZyb20gJy4uL3NyYy9hZG1pbi1jb21wb25lbnRzL1Byb21wdERlZmluaXRpb25FZGl0b3InXG5BZG1pbkpTLlVzZXJDb21wb25lbnRzLlByb21wdERlZmluaXRpb25FZGl0b3IgPSBQcm9tcHREZWZpbml0aW9uRWRpdG9yXG5pbXBvcnQgVXBsb2FkRWRpdENvbXBvbmVudCBmcm9tICcuLi9ub2RlX21vZHVsZXMvQGFkbWluanMvdXBsb2FkL2J1aWxkL2ZlYXR1cmVzL3VwbG9hZC1maWxlL2NvbXBvbmVudHMvVXBsb2FkRWRpdENvbXBvbmVudCdcbkFkbWluSlMuVXNlckNvbXBvbmVudHMuVXBsb2FkRWRpdENvbXBvbmVudCA9IFVwbG9hZEVkaXRDb21wb25lbnRcbmltcG9ydCBVcGxvYWRMaXN0Q29tcG9uZW50IGZyb20gJy4uL25vZGVfbW9kdWxlcy9AYWRtaW5qcy91cGxvYWQvYnVpbGQvZmVhdHVyZXMvdXBsb2FkLWZpbGUvY29tcG9uZW50cy9VcGxvYWRMaXN0Q29tcG9uZW50J1xuQWRtaW5KUy5Vc2VyQ29tcG9uZW50cy5VcGxvYWRMaXN0Q29tcG9uZW50ID0gVXBsb2FkTGlzdENvbXBvbmVudFxuaW1wb3J0IFVwbG9hZFNob3dDb21wb25lbnQgZnJvbSAnLi4vbm9kZV9tb2R1bGVzL0BhZG1pbmpzL3VwbG9hZC9idWlsZC9mZWF0dXJlcy91cGxvYWQtZmlsZS9jb21wb25lbnRzL1VwbG9hZFNob3dDb21wb25lbnQnXG5BZG1pbkpTLlVzZXJDb21wb25lbnRzLlVwbG9hZFNob3dDb21wb25lbnQgPSBVcGxvYWRTaG93Q29tcG9uZW50Il0sIm5hbWVzIjpbIm5vcm1hbGl6ZVVwbG9hZFBhdGgiLCJmaWxlUGF0aCIsIm5vcm1hbGl6ZWQiLCJyZXBsYWNlQWxsIiwidXBsb2Fkc0luZGV4IiwiaW5kZXhPZiIsInNsaWNlIiwic3RhcnRzV2l0aCIsIkRvd25sb2FkRmlsZUF0dGFjaG1lbnQiLCJwcm9wcyIsIm5hdmlnYXRlIiwidXNlTmF2aWdhdGUiLCJlcnJvciIsInNldEVycm9yIiwidXNlU3RhdGUiLCJ1c2VFZmZlY3QiLCJwdWJsaWNQYXRoIiwicmVjb3JkIiwicGFyYW1zIiwidW5kZWZpbmVkIiwiZmlsZU5hbWUiLCJvcmlnaW5hbE5hbWUiLCJwYXRoQmFzZW5hbWUiLCJkb3dubG9hZFVybCIsImVuY29kZVVSSUNvbXBvbmVudCIsImxpbmsiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJocmVmIiwic2V0QXR0cmlidXRlIiwicmVsIiwiYm9keSIsImFwcGVuZENoaWxkIiwiY2xpY2siLCJyZW1vdmUiLCJ0aW1lciIsIndpbmRvdyIsInNldFRpbWVvdXQiLCJjbGVhclRpbWVvdXQiLCJSZWFjdCIsIk1lc3NhZ2VCb3giLCJ2YXJpYW50IiwibWVzc2FnZSIsIkxvYWRlciIsInBhcnRzIiwiU3RyaW5nIiwic3BsaXQiLCJsZW5ndGgiLCJhcGkiLCJBcGlDbGllbnQiLCJMT0FESU5HX0NPUFkiLCJnZW5lcmF0ZUluc2lnaHQiLCJ0aXRsZSIsImhpbnQiLCJnZW5lcmF0ZUluZHVzdHJ5SW5zaWdodCIsIkFzeW5jUmVjb3JkQWN0aW9uTG9hZGVyIiwiYWN0aW9uIiwicmVzb3VyY2UiLCJhZGROb3RpY2UiLCJ1c2VOb3RpY2UiLCJzdGFydGVkUmVmIiwidXNlUmVmIiwiY29weSIsIm5hbWUiLCJjdXJyZW50IiwiY2FuY2VsbGVkIiwicnVuIiwicmVzcG9uc2UiLCJyZWNvcmRBY3Rpb24iLCJyZXNvdXJjZUlkIiwiaWQiLCJyZWNvcmRJZCIsImFjdGlvbk5hbWUiLCJtZXRob2QiLCJub3RpY2UiLCJyZWRpcmVjdFVybCIsImRhdGEiLCJlcnIiLCJjb25zb2xlIiwidHlwZSIsIkJveCIsInAiLCJmbGV4IiwiYWxpZ25JdGVtcyIsImp1c3RpZnlDb250ZW50IiwiZmxleERpcmVjdGlvbiIsIm1pbkhlaWdodCIsIkljb24iLCJpY29uIiwic3BpbiIsInNpemUiLCJIMyIsIm10IiwiVGV4dCIsIm9wYWNpdHkiLCJub3JtYWxpemVTY2FsYXIiLCJyYXciLCJ0cmltbWVkIiwidHJpbSIsInBhcnNlZCIsIkpTT04iLCJwYXJzZSIsIkFycmF5IiwiaXNBcnJheSIsIm1hcCIsIml0ZW0iLCJmaWx0ZXIiLCJCb29sZWFuIiwiT2JqZWN0IiwidmFsdWVzIiwiZ2V0U2VsZWN0ZWRGcm9tUmVjb3JkUGFyYW1zIiwicGF0aCIsImRpcmVjdCIsIlNldCIsImZsYXRQcmVmaXgiLCJmcm9tRmxhdCIsImtleXMiLCJrZXkiLCJzb3J0IiwibGVmdCIsInJpZ2h0IiwibGVmdEluZGV4IiwiTnVtYmVyIiwicmlnaHRJbmRleCIsIlByb2ZpbGVGaWVsZEtleU11bHRpU2VsZWN0IiwicHJvcGVydHkiLCJvbkNoYW5nZSIsInByb3BlcnR5UGF0aCIsIm9wdGlvbnMiLCJhdmFpbGFibGVWYWx1ZXMiLCJlcnJvcnMiLCJzZWxlY3RlZEtleXMiLCJzZXRTZWxlY3RlZEtleXMiLCJzZWxlY3RlZFNldCIsImFwcGx5U2VsZWN0aW9uIiwidXNlQ2FsbGJhY2siLCJuZXh0S2V5cyIsInVuaXF1ZSIsImhhbmRsZVRvZ2dsZSIsInZhbHVlIiwibmV4dCIsImhhcyIsIkZvcm1Hcm91cCIsIkxhYmVsIiwicmVxdWlyZWQiLCJpc1JlcXVpcmVkIiwibWIiLCJjb2xvciIsIm1heEhlaWdodCIsIm92ZXJmbG93WSIsImJvcmRlciIsImJvcmRlclJhZGl1cyIsIm9wdGlvbiIsImlucHV0SWQiLCJjaGVja2VkIiwiaHRtbEZvciIsInN0eWxlIiwiY3Vyc29yIiwiZGlzcGxheSIsImdhcCIsIm1hcmdpblRvcCIsImZsZXhTaHJpbmsiLCJhcyIsImxhYmVsIiwiRm9ybU1lc3NhZ2UiLCJDSE9JQ0VfVFlQRVMiLCJTQ09SRV9PUFRJT05TIiwiZW1wdHlSb3ciLCJvcmRlciIsInNjb3JlIiwicGFyc2VPcHRpb25zSnNvbiIsIm5vcm1hbGl6ZVJvd3MiLCJyb3dzIiwicm93IiwiaW5kZXgiLCJGb3JtUXVlc3Rpb25PcHRpb25zRWRpdG9yIiwicXVlc3Rpb25UeXBlIiwiaXNTY29yZWQiLCJ3ZWlnaHRSYXciLCJ3ZWlnaHQiLCJoYXNXZWlnaHQiLCJyZXF1aXJlc1Njb3JlIiwiaXNDaG9pY2VUeXBlIiwic2V0Um93cyIsInB1c2hUb0Zvcm0iLCJuZXh0Um93cyIsInN0cmluZ2lmeSIsImhhbmRsZUZpZWxkQ2hhbmdlIiwiZmllbGQiLCJpIiwiaGFuZGxlQWRkUm93IiwiaGFuZGxlUmVtb3ZlUm93IiwiXyIsInVzZU1lbW8iLCJwYiIsImJvcmRlckJvdHRvbSIsImZsZXhXcmFwIiwibWluV2lkdGgiLCJJbnB1dCIsImUiLCJ0YXJnZXQiLCJ3aWR0aCIsIlNlbGVjdCIsImZpbmQiLCJvcHQiLCJzZWxlY3RlZCIsIkJ1dHRvbiIsIm9uQ2xpY2siLCJERUZBVUxUX1RZUEVfT1BUSU9OUyIsImVtcHR5T3B0aW9uIiwiZW1wdHlRdWVzdGlvbiIsInBhcnNlUXVlc3Rpb25zSnNvbiIsIm5vcm1hbGl6ZVF1ZXN0aW9ucyIsInF1ZXN0aW9ucyIsInF1ZXN0aW9uIiwiRm9sbG93VXBGb3JtUXVlc3Rpb25zRWRpdG9yIiwidHlwZU9wdGlvbnMiLCJzZXRRdWVzdGlvbnMiLCJuZXh0UXVlc3Rpb25zIiwidXBkYXRlUXVlc3Rpb24iLCJwYXRjaCIsImhhbmRsZUFkZFF1ZXN0aW9uIiwiaGFuZGxlUmVtb3ZlUXVlc3Rpb24iLCJ1cGRhdGVPcHRpb24iLCJxdWVzdGlvbkluZGV4Iiwib3B0aW9uSW5kZXgiLCJhZGRPcHRpb24iLCJyZW1vdmVPcHRpb24iLCJpc0Nob2ljZSIsInNlbGVjdGVkVHlwZSIsImZvbnRXZWlnaHQiLCJwdCIsIkNoZWNrQm94IiwibWwiLCJwbCIsImJvcmRlckxlZnQiLCJwbGFjZWhvbGRlciIsIlNUQVRVU19PUFRJT05TIiwiZW1wdHlTZWdtZW50IiwiZGVzY3JpcHRpb24iLCJjb250ZW50IiwicGFyc2VFZGl0b3JKc29uIiwic3RhdHVzIiwic2VnbWVudHMiLCJQcm9tcHREZWZpbml0aW9uRWRpdG9yIiwiaW5pdGlhbCIsInNldFN0YXR1cyIsInNldFNlZ21lbnRzIiwibmV4dFN0YXR1cyIsIm5leHRTZWdtZW50cyIsInVwZGF0ZVNlZ21lbnQiLCJzZWdtZW50IiwiYWRkU2VnbWVudCIsInJlbW92ZVNlZ21lbnQiLCJzZWxlY3RlZFN0YXR1cyIsIlRleHRBcmVhIiwidXNlVHJhbnNsYXRpb24iLCJmbGF0IiwiRHJvcFpvbmUiLCJEcm9wWm9uZUl0ZW0iLCJBZG1pbkpTIiwiVXNlckNvbXBvbmVudHMiLCJVcGxvYWRFZGl0Q29tcG9uZW50IiwiVXBsb2FkTGlzdENvbXBvbmVudCIsIlVwbG9hZFNob3dDb21wb25lbnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7RUFJQSxNQUFNQSxtQkFBbUIsR0FBSUMsUUFBUSxJQUFLO0VBQ3hDLEVBQUEsSUFBSSxDQUFDQSxRQUFRLElBQUksT0FBT0EsUUFBUSxLQUFLLFFBQVEsRUFBRTtFQUM3QyxJQUFBLE9BQU8sSUFBSTtFQUNiLEVBQUE7SUFFQSxNQUFNQyxVQUFVLEdBQUdELFFBQVEsQ0FBQ0UsVUFBVSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUM7RUFDakQsRUFBQSxNQUFNQyxZQUFZLEdBQUdGLFVBQVUsQ0FBQ0csT0FBTyxDQUFDLFVBQVUsQ0FBQztFQUVuRCxFQUFBLElBQUlELFlBQVksS0FBSyxFQUFFLEVBQUU7RUFDdkIsSUFBQSxPQUFPLElBQUlGLFVBQVUsQ0FBQ0ksS0FBSyxDQUFDRixZQUFZLENBQUMsQ0FBQSxDQUFFO0VBQzdDLEVBQUE7SUFFQSxPQUFPRixVQUFVLENBQUNLLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBR0wsVUFBVSxHQUFHLENBQUEsQ0FBQSxFQUFJQSxVQUFVLENBQUEsQ0FBRTtFQUNuRSxDQUFDO0VBRUQsTUFBTU0sc0JBQXNCLEdBQUlDLEtBQUssSUFBSztFQUN4QyxFQUFBLE1BQU1DLFFBQVEsR0FBR0MsdUJBQVcsRUFBRTtJQUM5QixNQUFNLENBQUNDLEtBQUssRUFBRUMsUUFBUSxDQUFDLEdBQUdDLGNBQVEsQ0FBQyxJ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
