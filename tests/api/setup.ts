import { inject } from "vitest";

process.env.DATABASE_URL = inject("appUrl");
process.env.COOKIE_SECURE = "1";
