import { describe, expect, test, vi } from "vitest";

describe("createSymbolAccountOnClient", () => {
	test("networkName を省略すると testnet のアカウント (address/publicKey/privateKey) を生成する", async () => {
		const { createSymbolAccountOnClient } = await import("../../createAccount");

		const account = createSymbolAccountOnClient();

		expect(account.address).toMatch(/^T[A-Z2-7]+$/);
		expect(account.publicKey).toMatch(/^[0-9A-F]{64}$/);
		expect(account.privateKey).toMatch(/^[0-9A-F]{64}$/);
	});

	test("networkName に mainnet を指定すると mainnet のアカウントを生成する", async () => {
		const { createSymbolAccountOnClient } = await import("../../createAccount");

		const account = createSymbolAccountOnClient("mainnet");

		expect(account.address).toMatch(/^N[A-Z2-7]+$/);
	});

	test("呼び出すたびに異なる秘密鍵のアカウントを生成する", async () => {
		const { createSymbolAccountOnClient } = await import("../../createAccount");

		const first = createSymbolAccountOnClient();
		const second = createSymbolAccountOnClient();

		expect(first.privateKey).not.toBe(second.privateKey);
	});
});

describe("createSymbolAccountOnClient (ブラウザの client action 実行環境を模擬)", () => {
	test("Node.js 専用の symbol-crypto-wasm-node が読み込めない環境でも例外を投げずアカウントを生成できる", async () => {
		vi.resetModules();
		vi.doMock("symbol-crypto-wasm-node", () => {
			throw new Error(
				"symbol-crypto-wasm-node cannot be resolved in a browser bundle",
			);
		});

		try {
			const { createSymbolAccountOnClient } = await import("../../createAccount");

			expect(() => createSymbolAccountOnClient("testnet")).not.toThrow();

			const account = createSymbolAccountOnClient("testnet");
			expect(account.publicKey).toMatch(/^[0-9A-F]{64}$/);
		} finally {
			vi.doUnmock("symbol-crypto-wasm-node");
			vi.resetModules();
		}
	});
});
