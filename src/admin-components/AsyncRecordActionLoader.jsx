import React, { useEffect, useRef, useState } from "react";
import { Box, H3, Icon, MessageBox, Text } from "@adminjs/design-system";
import { ApiClient, useNotice } from "adminjs";
import { useNavigate } from "react-router";

const api = new ApiClient();

const LOADING_COPY = {
  generateInsight: {
    title: "در حال دریافت تحلیل AI…",
    hint: "لطفاً صبر کنید. این درخواست ممکن است تا یک دقیقه طول بکشد.",
  },
  generateIndustryInsight: {
    title: "در حال دریافت تحلیل صنعت…",
    hint: "لطفاً صبر کنید. این درخواست ممکن است تا دو دقیقه طول بکشد.",
  },
};

const AsyncRecordActionLoader = (props) => {
  const { action, record, resource } = props;
  const addNotice = useNotice();
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const [error, setError] = useState(null);

  const copy =
    LOADING_COPY[action?.name] ?? {
      title: "در حال انجام عملیات…",
      hint: "لطفاً صبر کنید.",
    };

  useEffect(() => {
    if (startedRef.current) {
      return undefined;
    }
    startedRef.current = true;

    let cancelled = false;

    const run = async () => {
      try {
        const response = await api.recordAction(
          {
            resourceId: resource.id,
            recordId: record.id,
            actionName: action.name,
          },
          { method: "post" },
        );

        if (cancelled) {
          return;
        }

        const { notice, redirectUrl } = response.data ?? {};

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
          type: "error",
        });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [action.name, addNotice, navigate, record.id, resource.id]);

  if (error) {
    return (
      <Box p="xxl">
        <MessageBox variant="danger" message={error} />
      </Box>
    );
  }

  return (
    <Box
      flex
      variant="grey"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      p="xxl"
      minHeight={320}
    >
      <Icon icon="Loader" spin size={48} />
      <H3 mt="lg">{copy.title}</H3>
      <Text mt="default" opacity={0.8}>
        {copy.hint}
      </Text>
    </Box>
  );
};

export default AsyncRecordActionLoader;
