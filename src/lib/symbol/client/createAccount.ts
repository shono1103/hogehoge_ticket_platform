import { PrivateKey } from "symbol-sdk";
import { createClientSymbolFacade, type SymbolNetworkName } from "./facade";

/**
 * client action (client component) から symbol-sdk を使ってアカウントを
 * 生成するためのクライアント専用サービス。
 *
 * symbol-sdk はトランザクションの生成・署名に暗号処理を必要とするが、
 * Node.js 専用の symbol-crypto-wasm-node (optionalDependency) が
 * 利用できない場合でも純粋な JS 実装にフォールバックして動作するため、
 * ブラウザ (client action 実行コンテキスト) でも安全に呼び出せる。
 */
export type ClientSymbolAccount = Readonly<{
	address: string;
	publicKey: string;
	privateKey: string;
}>;

export function createSymbolAccountOnClient(
	networkName: SymbolNetworkName = "testnet",
): ClientSymbolAccount {
	const facade = createClientSymbolFacade(networkName);
	const privateKey = PrivateKey.random();
	const account = facade.createAccount(privateKey);

	return {
		address: account.address.toString(),
		publicKey: account.publicKey.toString(),
		privateKey: privateKey.toString(),
	};
}
