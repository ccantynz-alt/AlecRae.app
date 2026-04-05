/**
 * Settings page — Account, Billing, and API Keys management.
 * SolidJS signals for tab state. All components from @btf/ui.
 */

import { createSignal, Show } from "solid-js";
import { Button, Card, Input, Badge } from "@btf/ui";
import { authStore } from "~/stores/auth.js";

type Tab = "account" | "billing" | "api-keys";

export default function Settings() {
	const [activeTab, setActiveTab] = createSignal<Tab>("account");

	// Account state
	const [displayName, setDisplayName] = createSignal(authStore.user()?.name ?? "");
	const [email, setEmail] = createSignal(authStore.user()?.email ?? "");
	const [saving, setSaving] = createSignal(false);
	const [saveMessage, setSaveMessage] = createSignal("");

	// API Keys state
	const [apiKey, setApiKey] = createSignal("btf_xxxx...xxxx");
	const [showKey, setShowKey] = createSignal(false);
	const [copied, setCopied] = createSignal(false);
	const [regenerating, setRegenerating] = createSignal(false);

	// Billing state (demo values)
	const [plan] = createSignal<"free" | "pro">("free");
	const [tokensUsed] = createSignal(12_480);
	const [generations] = createSignal(47);

	const tabs: Array<{ id: Tab; label: string }> = [
		{ id: "account", label: "Account" },
		{ id: "billing", label: "Billing" },
		{ id: "api-keys", label: "API Keys" },
	];

	async function handleUpdateName() {
		setSaving(true);
		setSaveMessage("");
		try {
			// In production, call tRPC: trpc.settings.updateProfile.mutate(...)
			await new Promise((r) => setTimeout(r, 500));
			setSaveMessage("Profile updated successfully.");
		} catch {
			setSaveMessage("Failed to update profile.");
		} finally {
			setSaving(false);
		}
	}

	async function handleRegenerateKey() {
		setRegenerating(true);
		try {
			// In production, call tRPC: trpc.settings.regenerateApiKey.mutate()
			await new Promise((r) => setTimeout(r, 500));
			const newKey = `btf_${crypto.randomUUID().replace(/-/g, "")}`;
			setApiKey(newKey);
			setShowKey(true);
		} catch {
			// handle error
		} finally {
			setRegenerating(false);
		}
	}

	async function handleCopyKey() {
		try {
			await navigator.clipboard.writeText(apiKey());
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// clipboard not available
		}
	}

	return (
		<main class="min-h-screen p-8">
			<div class="mx-auto max-w-3xl">
				<h1 class="text-3xl font-bold text-zinc-50">Settings</h1>
				<p class="mt-1 text-sm text-zinc-400">Manage your account, billing, and API keys</p>

				{/* Tab navigation */}
				<div class="mt-8 flex gap-1 border-b border-zinc-800">
					{tabs.map((tab) => (
						<button
							class={`px-4 py-2.5 text-sm font-medium transition-colors ${
								activeTab() === tab.id
									? "border-b-2 border-blue-500 text-zinc-50"
									: "text-zinc-400 hover:text-zinc-200"
							}`}
							onClick={() => setActiveTab(tab.id)}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Account Tab */}
				<Show when={activeTab() === "account"}>
					<div class="mt-6 flex flex-col gap-6">
						<Card title="Profile" variant="outlined">
							<div class="flex flex-col gap-4">
								<Input
									label="Display Name"
									placeholder="Your name"
									value={displayName()}
									onInput={(v) => setDisplayName(v)}
									fullWidth
								/>
								<Input
									label="Email"
									type="email"
									placeholder="you@example.com"
									value={email()}
									onInput={(v) => setEmail(v)}
									fullWidth
									disabled
								/>
								<div class="flex items-center gap-3">
									<Button
										label={saving() ? "Saving..." : "Update Name"}
										variant="primary"
										onClick={handleUpdateName}
										disabled={saving()}
										loading={saving()}
									/>
									<Show when={saveMessage()}>
										<span class="text-sm text-zinc-400">{saveMessage()}</span>
									</Show>
								</div>
							</div>
						</Card>

						<Card title="Account Info" variant="outlined">
							<div class="flex flex-col gap-2 text-sm">
								<div class="flex justify-between">
									<span class="text-zinc-400">Role</span>
									<Badge
										label={authStore.user()?.role ?? "user"}
										variant="primary"
									/>
								</div>
								<div class="flex justify-between">
									<span class="text-zinc-400">Member since</span>
									<span class="text-zinc-200">
										{authStore.user()?.id ? "2026" : "N/A"}
									</span>
								</div>
							</div>
						</Card>
					</div>
				</Show>

				{/* Billing Tab */}
				<Show when={activeTab() === "billing"}>
					<div class="mt-6 flex flex-col gap-6">
						<Card title="Current Plan" variant="outlined">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<span class="text-zinc-200 text-lg font-semibold capitalize">{plan()}</span>
									<Badge
										label={plan() === "pro" ? "Active" : "Free Tier"}
										variant={plan() === "pro" ? "success" : "default"}
									/>
								</div>
								<Show when={plan() === "free"}>
									<Button
										label="Upgrade to Pro"
										variant="primary"
										onClick={() => {
											// In production, redirect to Stripe checkout
											window.open("/api/billing/checkout", "_blank");
										}}
									/>
								</Show>
								<Show when={plan() === "pro"}>
									<Button
										label="Manage Billing"
										variant="outline"
										onClick={() => {
											// In production, redirect to Stripe portal
											window.open("/api/billing/portal", "_blank");
										}}
									/>
								</Show>
							</div>
						</Card>

						<Card title="Usage This Period" variant="outlined">
							<div class="flex flex-col gap-4">
								<div class="flex justify-between items-center">
									<div>
										<p class="text-sm text-zinc-400">Tokens Used</p>
										<p class="text-2xl font-bold text-zinc-50">
											{tokensUsed().toLocaleString()}
										</p>
									</div>
									<div>
										<p class="text-sm text-zinc-400">AI Generations</p>
										<p class="text-2xl font-bold text-zinc-50">
											{generations().toLocaleString()}
										</p>
									</div>
								</div>
								<div class="h-2 w-full rounded-full bg-zinc-800">
									<div
										class="h-2 rounded-full bg-blue-600 transition-all"
										style={{ width: `${Math.min((tokensUsed() / 100_000) * 100, 100)}%` }}
									/>
								</div>
								<p class="text-xs text-zinc-500">
									{tokensUsed().toLocaleString()} / 100,000 tokens ({plan() === "free" ? "free tier limit" : "pro tier"})
								</p>
							</div>
						</Card>
					</div>
				</Show>

				{/* API Keys Tab */}
				<Show when={activeTab() === "api-keys"}>
					<div class="mt-6 flex flex-col gap-6">
						<Card title="API Key" description="Use this key to authenticate API requests." variant="outlined">
							<div class="flex flex-col gap-4">
								<div class="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3">
									<code class="flex-1 text-sm text-zinc-300 font-mono">
										{showKey() ? apiKey() : apiKey().replace(/./g, (_, i) => (i < 4 ? apiKey()[i] : "*")).slice(0, 20)}
									</code>
									<button
										class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
										onClick={() => setShowKey(!showKey())}
									>
										{showKey() ? "Hide" : "Show"}
									</button>
								</div>
								<div class="flex gap-2">
									<Button
										label={copied() ? "Copied!" : "Copy Key"}
										variant="default"
										onClick={handleCopyKey}
									/>
									<Button
										label={regenerating() ? "Regenerating..." : "Regenerate Key"}
										variant="destructive"
										onClick={handleRegenerateKey}
										loading={regenerating()}
										disabled={regenerating()}
									/>
								</div>
								<p class="text-xs text-zinc-500">
									Regenerating your key will invalidate the current one. Make sure to update your integrations.
								</p>
							</div>
						</Card>
					</div>
				</Show>
			</div>
		</main>
	);
}
