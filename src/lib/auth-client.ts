"use client";

import { createAuthClient } from "better-auth/react";

/** Same-origin Better Auth client (login, logout, email reset). */
export const authClient = createAuthClient();
