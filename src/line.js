const log4js = require('log4js');
log4js.configure('log4js.config.json');
const logger = log4js.getLogger("line.js");
const jsonfile = require('jsonfile');
const line = require('@line/bot-sdk');


///////////////////////

const LINE_CONFIG = jsonfile.readFileSync('line.config.json');
exports.LINE_CONFIG = LINE_CONFIG;     // server.jsから呼び出すために export

const lineClient = new line.Client(LINE_CONFIG);

exports.replyMessageToLine = async (token, msg) => {   // 本当にAsyncにする？
  // 文字列のまま渡された値は、
  // LINE返信用のフォーマットに変更
    if(typeof msg == 'string') {
      replyMsg = {
        type: 'text',
        text: msg
      };
    } else {
      replyMsg = msg;
    }

    logger.trace(`replyMessageToLine :token: ${token} :replyMsg: ${JSON.stringify(replyMsg)}`);
    return await lineClient.replyMessage(token, replyMsg);
}

exports.handleLineError = (err) => {
  if (err instanceof line.HTTPError) {
    var msg = { code: 'HTTPError', message: `${err.statusCode}: ${err.statusMessage}` };
    logger.error(errMsg);
    return msg;
        // HTTP Errorが起きたケース
        // 400:  送信データフォーマットを間違えていた場合や、同一のトークンに２回メッセージを送信する場合に起きた
        // 401:  コードに設定していたトークンを間違えていた場合

  } else if (err instanceof line.JSONParseError) {
    var msg = { code: 'JSONParseError', message: `JSON Parse Error in LINE Bot SDK: ${err.raw}` };
    logger.error(errMsg);
    return msg;

  } else if (err instanceof line.ReadError) {
    var errMsg =  { code: 'ReadError' }
    logger.error(errMsg);
    return msg;

  } else if (err instanceof line.RequestError) {
    var errMsg = { code: '.RequestError', message: `${err.code}` };
    logger.error(errMsg);
    return msg;

  } else if (err instanceof line.SignatureValidationFailed) {
    var errMsg = { code: 'SignatureValidationFailed', message: `signature ${err.signature}` };
    logger.error(errMsg);
    return msg;

  } else 
    return null;
}
//exports.handleLineError = handleLineError;
