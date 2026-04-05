/**
 * Root tRPC router — end-to-end type safety from API to client.
 * Change a type here, see the error in SolidStart instantly.
 */

import { router, publicProcedure } from "./init.js";
import { projectRouter } from "./procedures/projects.js";
import { userRouter } from "./procedures/users.js";
import { aiRouter } from "./procedures/ai.js";
import { authRouter } from "./procedures/auth.js";
import { billingRouter } from "./procedures/billing.js";
import { settingsRouter } from "./procedures/settings.js";

export const appRouter = router({
	health: publicProcedure.query(() => {
		return {
			status: "ok" as const,
			timestamp: new Date().toISOString(),
			version: "0.1.0",
		};
	}),

	project: projectRouter,
	user: userRouter,
	ai: aiRouter,
	auth: authRouter,
	billing: billingRouter,
	settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
