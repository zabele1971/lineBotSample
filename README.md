# lineBotSample

Oracle Database CloudとOracle Application Container Cloudの利用方法を学習するための、
Oracle DBからのデータ取得と更新を行う LINE Botのサンプルです。
- Oracle Database CloudへのNode.jsへのアクセス方法
- Oracle Application Container Cacheの使い方
- LINEとのやりとり

## 環境
- Node.js
  - Node.jsはV8以上
  - Oracle Application Container Cloud Node.js V8.1.4で確認
  - 開発はnpm V8.9.4(Windows)を利用した
- Oracle Database
  - Oracle Database 12c以上（PDBを利用）
    - 開発はOracle Database 12c 12.2.0.1 Standard Edtion (Windows)を利用
    - テストはOracle Database 12c 12.2.0.1 Standard Edtion (Oracle Database Cloud Service)を利用

- LINE
  - フリーの範囲で利用可能な機能を使用（ReplyMessage）
  
(*) Oracle Cloudにアップロードする場合、accsディレクトリにある botSample.zipとmanifest.jsonを使ってください。

## セットアップ方法
以下の資料を参照してください。
[Oracle PaaSでLINE Botを開発してみよう](https://github.com/zabele1971/lineBotSample/blob/master/doc/LINEBotSeminar.pdf)

## サンプルアプリの動き

### 機能

#### メニュー表示を行う
「メニュー」「始める」「はじめる」などと入力

#### 終わらせる場合
「おわり」「おわる」「終わる」などと入力




