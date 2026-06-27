import React from "react";

const DownloadFile = ({ record }) => {
  let filePath = record.params.filePath;

  if (!filePath) return <>-</>;

  if (filePath.includes("\\uploads\\")) {
    filePath = filePath.split("\\uploads\\")[1];

    filePath = `/uploads/${filePath.replaceAll("\\", "/")}`;
  }

  const url = encodeURI(filePath);

  console.log("FINAL URL:", url);

  return (
    <a href={url} download>
      دانلود
    </a>
  );
};

export default DownloadFile;
