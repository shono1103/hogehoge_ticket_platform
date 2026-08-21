import { describe, expect, test } from "vitest";

describe("excludeNativeWasmModulesFromClientBundle", () => {
	test("client バンドル (isServer: false) では symbol-crypto-wasm-node を alias: false で無効化する", async () => {
		const { excludeNativeWasmModulesFromClientBundle } = await import(
			"../../excludeNativeWasmModulesFromClientBundle"
		);

		const config = { resolve: { alias: { foo: "bar" } } };
		const result = excludeNativeWasmModulesFromClientBundle(config, {
			isServer: false,
		});

		expect(result.resolve?.alias).toEqual({
			foo: "bar",
			"symbol-crypto-wasm-node": false,
		});
	});

	test("resolve.alias が未設定の config でも symbol-crypto-wasm-node を無効化できる", async () => {
		const { excludeNativeWasmModulesFromClientBundle } = await import(
			"../../excludeNativeWasmModulesFromClientBundle"
		);

		const config = {};
		const result = excludeNativeWasmModulesFromClientBundle(config, {
			isServer: false,
		});

		expect(result.resolve?.alias).toEqual({
			"symbol-crypto-wasm-node": false,
		});
	});

	test("server バンドル (isServer: true) では config を変更せずそのまま返す", async () => {
		const { excludeNativeWasmModulesFromClientBundle } = await import(
			"../../excludeNativeWasmModulesFromClientBundle"
		);

		const config = { resolve: { alias: { foo: "bar" } } };
		const result = excludeNativeWasmModulesFromClientBundle(config, {
			isServer: true,
		});

		expect(result).toBe(config);
	});
});
