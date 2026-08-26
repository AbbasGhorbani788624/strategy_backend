import "./admin-env.mjs";
import path from "path";
import { fileURLToPath } from "url";
import AdminJS from "adminjs";
import { componentLoader } from "./component-loader.mjs";
import uploadFeature from "@adminjs/upload";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

componentLoader.add(
  "DownloadFileAttachment",
  path.join(__dirname, "admin-components", "DownloadFileAttachment"),
);

uploadFeature({
  componentLoader,
  provider: { local: { bucket: UPLOADS_ROOT } },
  properties: { key: "key", file: "file" },
})();

const admin = new AdminJS({
  componentLoader,
  resources: [],
});

await admin.initialize();
console.log("AdminJS components bundled to", process.env.ADMIN_JS_TMP_DIR);
