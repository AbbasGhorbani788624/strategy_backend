import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const ADMIN_JS_TMP_DIR =
  process.env.ADMIN_JS_TMP_DIR ||
  path.join(PROJECT_ROOT, "adminjs-bundles");

process.env.ADMIN_JS_TMP_DIR = ADMIN_JS_TMP_DIR;

// AdminJS bundler resolves Babel plugins from process.cwd().
process.chdir(PROJECT_ROOT);

if (!fs.existsSync(ADMIN_JS_TMP_DIR)) {
  fs.mkdirSync(ADMIN_JS_TMP_DIR, { recursive: true });
}

export { ADMIN_JS_TMP_DIR, PROJECT_ROOT };
