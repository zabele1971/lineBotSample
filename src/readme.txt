(1)以下はプラットフォーム共通で実行します。

npm init
npm install --save restify
npm install --save restify-errors
npm install --save log4js
npm install --save jsonfile
npm install --save @line/bot-sdk
npm install --save accs-cache-handler


(2)oracledbパッケージは実行環境によって異なります。

ローカルで実行する場合、Oracle Instant Client等を
別にインストールしておきます。また、OSによって前提
となる設定が異なります。

npm install –-save oracledb

Oracle Application Container Cloud上で実行する場合、。
oracledbパッケージはインストールしないでください。
インストール済みの場合は以下のコマンドで削除します。
npm uninstall –-save oracledb

