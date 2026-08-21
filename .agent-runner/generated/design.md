# Symbol SDK Client Action Wasm Loading Design

**Date:** 2026-08-22
**Status:** Draft

## Goal
wasmローダーが原因でclient action内からsymbol-sdkを利用できなかった問題を解消し、client actionからsymbol-sdkの機能を安定して呼び出せるようにする。

## Success Criteria
- client action内でsymbol-sdkの関数(トランザクション生成・署名)を呼び出しても例外なく完了する
- 既存のUI(フォーム送信からレスポンス表示までの流れ)の見た目・文言が変わらない
- ビルド成果物でsymbol-sdkのwasmファイルが404やMIMEタイプ不一致なしに取得できる
- server側(loader/action)で発生していたwasm関連の副作用が発生しない(clientバンドルにのみwasmが含まれる)

## Global Constraints
- wasmファイルはクライアントバンドルにのみ含め、サーバーバンドル・SSR実行パスには含めない
- symbol-sdkのバージョンは変更しない(現行の package.json に固定された範囲を維持する)
- 「client action」は Remix (React Router v7) の `clientAction` エクスポート関数を指すものとして解釈する(要件文中の用語がRemix/React Routerの公式用語と一致するため)
- バンドラーは Vite を前提とする(Remix v2以降の標準構成であるため)。異なるバンドラーの場合は Open Questions を参照
- symbol-sdkの呼び出しはブラウザ環境(client action実行コンテキスト)でのみ行い、サーバー環境からは呼び出さない

## Architecture
検討した案は以下の3つ。

1. **wasmローダー設定の修正のみ**: Viteの wasm 関連プラグイン設定(`vite-plugin-wasm` 等)を追加・修正し、既存の import 構造は変えない。
   - 却下理由: SSRビルド時にもsymbol-sdkの静的importがサーバーバンドルに巻き込まれ、wasmのトップレベルawaitがSSRビルドで解決できない根本原因が残る。
2. **symbol-sdk呼び出しをWeb Workerに分離**: wasmインスタンス化をWorker内で行い、clientActionはpostMessageで結果を受け取る。
   - 却下理由: 今回の要件(client actionからの単純な利用可否)に対して構成変更のコストが過大であり、YAGNIに反する。
3. **動的import + クライアント専用モジュールへの分離(採用)**: symbol-sdkに依存する処理を独立したクライアント専用モジュールに切り出し、clientAction内で `import()` により動的にロードする。wasm本体はViteの `?url` 形式でアセットとして扱い、fetch + `WebAssembly.instantiate` で明示的にインスタンス化する。
   - 選定理由: 静的importを排除することでSSRビルド時にsymbol-sdk/wasmがサーバーバンドルへ混入する経路を断てる。かつWorkerのような大きな構成変更を伴わず、既存のclientAction呼び出しインターフェースを維持できる。

採用案(3)に基づき、全体構成を「サーバー非依存のクライアント専用サービス層」を新設する形に変更する。

## Components
### WasmAssetLoader
- Responsibility: symbol-sdkが要求するwasmバイナリをブラウザ環境でのみfetchし、WebAssemblyインスタンスとして返す
- Interface: `loadSymbolWasm(): Promise<WebAssembly.Instance>`
- Depends on: Vite の `?url` インポートで得られるアセットURL、ブラウザの `fetch` / `WebAssembly` API

### SymbolClientService
- Responsibility: symbol-sdkを用いたトランザクション生成・署名処理をクライアント側でのみ実行する
- Interface: `createTransaction(params: TransactionParams): Promise<SignedTransaction>`
- Depends on: WasmAssetLoader, symbol-sdk

### ClientAction (route module)
- Responsibility: フォーム送信を受け取り、SymbolClientServiceを動的importで呼び出し、結果をResponseとして返す
- Interface: `clientAction({ request }: ClientActionFunctionArgs): Promise<Response>`
- Depends on: SymbolClientService (動的import経由)

## Data Flow
フォーム送信 -> `clientAction` が起動 -> `import('./symbol-client-service')` で SymbolClientService を動的ロード -> SymbolClientService が WasmAssetLoader を呼び出し wasm を fetch してインスタンス化 -> symbol-sdk の関数(トランザクション生成・署名)を実行 -> 結果を `Response` として `clientAction` から返却 -> UIコンポーネントが `useActionData` 相当の仕組みで結果を表示

## Error Handling
- wasmのfetch失敗(ネットワークエラー・404): `WasmAssetLoader` 内でtry/catchし `WasmLoadError` をthrowする。`SymbolClientService` はこれをそのまま伝播し、`clientAction` はcatchしてstatus 502のResponseを返す。UIはこのstatusを検知して「ネットワーク環境を確認してください」というエラーメッセージを表示する
- `WebAssembly.instantiate` の失敗(不正なバイナリ・ブラウザ非対応): `WasmInstantiationError` をthrowし、`console.error` でスタックトレースを出力したうえで `clientAction` はstatus 500のResponseを返す。UIは「ブラウザの互換性を確認してください」というメッセージを表示する
- symbol-sdkの署名処理失敗(不正な秘密鍵形式・不正なトランザクションパラメータ): symbol-sdkがthrowする例外を `SymbolClientService.createTransaction` でcatchし、フィールド名とメッセージを含む `ValidationError` に変換して再throwする。`clientAction` はこれをcatchしstatus 400のResponseにフィールド単位のエラー情報を含めて返し、フォームの該当フィールド下にエラーメッセージを表示する
- 動的import自体の失敗(チャンク読み込みエラー): `clientAction` でcatchし、status 503のResponseを返し「ページを再読み込みしてください」というメッセージを表示する

## Testing Strategy
TDDに基づき、各コンポーネントの観測可能な振る舞いを個別のテストで検証する(Red-Green-Refactorの順序を前提とし、1テストにつき1振る舞いのみを検証する)。

- WasmAssetLoader: fetchが成功した場合、`loadSymbolWasm()` が `WebAssembly.Instance` を返すことを検証する(fetchとWebAssembly.instantiateをモック)
- WasmAssetLoader: fetchが404を返した場合、`loadSymbolWasm()` が `WasmLoadError` をthrowすることを検証する
- WasmAssetLoader: `WebAssembly.instantiate` が失敗した場合、`loadSymbolWasm()` が `WasmInstantiationError` をthrowすることを検証する
- SymbolClientService: `WasmAssetLoader.loadSymbolWasm` の成功をモックした場合、`createTransaction` が期待した型の `SignedTransaction` を返すことを検証する
- SymbolClientService: symbol-sdkが不正な秘密鍵に対して例外をthrowした場合、`createTransaction` が `ValidationError` をthrowすることを検証する
- ClientAction: `SymbolClientService.createTransaction` の成功をモックした場合、`clientAction` が返す `Response` のstatusが200であることを検証する
- ClientAction: `WasmLoadError` がthrowされた場合、`clientAction` が返す `Response` のstatusが502であることを検証する
- ClientAction: `ValidationError` がthrowされた場合、`clientAction` が返す `Response` のbodyにフィールド名を含むエラー情報が含まれることを検証する
- 各テストの `beforeEach` でモックの呼び出し履歴と戻り値設定をリセットする

## Out of Scope (YAGNI)
- server側の `loader`/`action` からsymbol-sdkを呼び出せるようにする対応
- wasmバイナリのプリコンパイル・キャッシュ最適化
- symbol-sdk以外のwasm依存ライブラリへの対応
- Web Workerへの処理分離(今回は動的importでの分離のみ行う)

## Open Questions
- 実際に使用しているバンドラー(Vite以外の可能性、およびバージョン)が要件文からは確認できないため、`WasmAssetLoader` の `?url` インポート方式が使えない場合は別途調査が必要
- 「client action」がRemix (React Router v7) の `clientAction` を指すという解釈で設計したが、異なるフレームワーク・独自実装のアクション機構である場合はComponents構成の見直しが必要