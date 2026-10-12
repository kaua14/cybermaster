import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { inject } from "vitest";

process.env.DATABASE_URL = inject("appUrl");
process.env.COOKIE_SECURE = "1";
process.env.STORAGE_DIR = mkdtempSync(path.join(tmpdir(), "cm-storage-"));
