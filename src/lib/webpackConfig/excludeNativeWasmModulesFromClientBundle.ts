/**
 * symbol-sdk はオプショナル依存として symbol-crypto-wasm-node (Node.js 専用の
 * wasm/ネイティブ実装) を利用し、利用できない環境では純粋な JS 実装にフォール
 * バックする。
 *
 * Next.js のクライアントバンドル (ブラウザ向け webpack ビルド) が
 * symbol-crypto-wasm-node を解決しようとすると、その wasm ファイルは
 * fs 等の Node.js 専用 API を前提にロードされるため、client action から
 * symbol-sdk を import した際にビルド/実行時エラーの原因になっていた。
 *
 * この関数はクライアント向けの webpack config に対してのみ
 * symbol-crypto-wasm-node を `alias: false` (空モジュール) にすることで、
 * バンドラーがこのモジュールを解決しようとしないようにする。
 * サーバー向けビルドでは symbol-crypto-wasm-node をそのまま利用できるよう、
 * config には一切手を加えない。
 *
 * NOTE: webpack の実際の `Configuration` 型を直接扱わず、必要最小限の形状
 * (`resolve.alias`) のみを対象にすることで、webpack の型定義への直接依存を
 * 避けている。呼び出し側 (next.config.ts) で `config` を渡す際は、必要な形状
 * (resolve.alias) のみを満たす値として渡すこと。
 */

export type WebpackAliasValue = string | false;

export type WebpackResolvableConfig = {
	resolve?: {
		alias?: Record<string, WebpackAliasValue>;
	};
};

export type WebpackConfigContext = {
	isServer: boolean;
};

const CLIENT_EXCLUDED_NATIVE_MODULES = ["symbol-crypto-wasm-node"] as const;

/**
 * 渡された config を破壊的に変更し、そのまま返す。
 * (Next.js の webpack config カスタマイズは「同じ config オブジェクトを
 * 変更して return する」ことが前提の API のため、この関数もそれに倣う)
 *
 * webpack の実際の `Configuration` 型に対する依存を避けるため、あえて
 * generics を使わず最小限の形状 (`WebpackResolvableConfig`) のみを扱う。
 * 呼び出し側 (next.config.ts) では、元の `config` 変数への参照を保持した
 * まま return することで、webpack の実際の型との整合性を保つ。
 */
export function excludeNativeWasmModulesFromClientBundle(
	config: WebpackResolvableConfig,
	context: WebpackConfigContext,
): WebpackResolvableConfig {
	if (context.isServer) {
		return config;
	}

	config.resolve = config.resolve ?? {};
	config.resolve.alias = { ...config.resolve.alias };
	for (const moduleName of CLIENT_EXCLUDED_NATIVE_MODULES) {
		config.resolve.alias[moduleName] = false;
	}

	return config;
}
