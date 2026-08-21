import type { NextConfig } from "next";
import {
	excludeNativeWasmModulesFromClientBundle,
	type WebpackResolvableConfig,
} from "./src/lib/webpackConfig/excludeNativeWasmModulesFromClientBundle";

const nextConfig: NextConfig = {
	/* config options here */
	reactCompiler: true,
	serverExternalPackages: ["symbol-sdk", "symbol-crypto-wasm-node"],
	// client action (client component) から symbol-sdk を利用できるように、
	// クライアントバンドルからは Node.js 専用の symbol-crypto-wasm-node を除外する。
	// NOTE: `next dev`/`next build` を Turbopack で実行する場合は
	// `turbopack.resolveAlias` 側にも同様の除外設定が別途必要になる可能性がある。
	webpack: (config, { isServer }) => {
		excludeNativeWasmModulesFromClientBundle(
			config as unknown as WebpackResolvableConfig,
			{ isServer },
		);
		return config;
	},
};

export default nextConfig;
