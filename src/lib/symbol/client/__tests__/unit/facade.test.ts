import { describe, expect, test } from "vitest";

describe("createClientSymbolFacade", () => {
	test("引数を省略すると testnet の SymbolFacade を生成する", async () => {
		const { createClientSymbolFacade } = await import("../../facade");
		const { SymbolFacade } = await import("symbol-sdk/symbol");

		const facade = createClientSymbolFacade();

		expect(facade).toBeInstanceOf(SymbolFacade);
		expect(facade.network.name).toBe("testnet");
	});

	test("networkName に mainnet を指定すると mainnet の SymbolFacade を生成する", async () => {
		const { createClientSymbolFacade } = await import("../../facade");

		const facade = createClientSymbolFacade("mainnet");

		expect(facade.network.name).toBe("mainnet");
	});

	test("同じ networkName で呼び出しても独立した SymbolFacade インスタンスを都度生成する", async () => {
		const { createClientSymbolFacade } = await import("../../facade");

		const first = createClientSymbolFacade("testnet");
		const second = createClientSymbolFacade("testnet");

		expect(first).not.toBe(second);
	});
});
