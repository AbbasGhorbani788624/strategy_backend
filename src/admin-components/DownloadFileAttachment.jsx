import React, { useEffect, useState } from "react";
import { Loader, MessageBox } from "@adminjs/design-system";
import { useNavigate } from "react-router";

const normalizeUploadPath = (filePath) => {
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

const DownloadFileAttachment = (props) => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const publicPath = normalizeUploadPath(props.record?.params?.filePath);

    if (!publicPath) {
      setError("فایلی برای دانلود وجود ندارد");
      return undefined;
    }

    const fileName =
      props.record?.params?.originalName ||
      props.record?.params?.fileName ||
      pathBasename(publicPath);

    const downloadUrl = `/download-upload?path=${encodeURIComponent(
      publicPath.slice(1),
    )}`;

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
    return <MessageBox variant="danger" message={error} />;
  }

  return <Loader />;
};

const pathBasename = (filePath) => {
  const parts = String(filePath).split("/");
  return parts[parts.length - 1] || "download";
};

export default DownloadFileAttachment;
