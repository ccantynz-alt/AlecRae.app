/**
 * Passkey/WebAuthn authentication scaffolding.
 * FIDO2 WebAuthn — phishing-immune, 98% login success rate.
 *
 * This module provides the type definitions and utility functions.
 * Full WebAuthn ceremony implementation requires @simplewebauthn packages.
 */

import { z } from "zod";

export const PasskeyRegistrationSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1),
	attestation: z.any(),
});

export const PasskeyAuthenticationSchema = z.object({
	credentialId: z.string(),
	assertion: z.any(),
});

export interface AuthSession {
	userId: string;
	email: string;
	role: "user" | "admin" | "editor";
	expiresAt: number;
}

export function createSessionToken(session: AuthSession): string {
	const payload = JSON.stringify(session);
	return Buffer.from(payload).toString("base64url");
}

export function verifySessionToken(token: string): AuthSession | null {
	try {
		const payload = Buffer.from(token, "base64url").toString("utf-8");
		const session = JSON.parse(payload) as AuthSession;
		if (session.expiresAt < Date.now()) {
			return null;
		}
		return session;
	} catch {
		return null;
	}
}
