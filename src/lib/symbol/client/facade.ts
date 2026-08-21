import { SymbolFacade } from "symbol-sdk/symbol";

/**
 * client action (client component) から symbol-sdk を利用するための
 * クライアント専用モジュール。
 *
 * `@/lib/symbol/config` の `facade` は `process.loadEnvFile` / `process.env`
 * を モジュール読み込み時に参照するサーバー専用の実装であるため、
 * ブラウザ実行コンテキスト (client action) からは利用できない。
 * このモジュールは環境変数や Node.js 専用 API に一切依存せず、
 * 呼び出し時に SymbolFacade を生成する。
 */
export type SymbolNetworkName = "mainnet" | "testnet";

export function createClientSymbolFacade(
	networkName: SymbolNetworkName = "testnet",
): SymbolFacade {
	return new SymbolFacade(networkName);
}
