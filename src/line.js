const log4js = require('log4js');
log4js.configure('log4js.config.json');
const logger = log4js.getLogger("line.js");

const jsonfile = require('jsonfile');
const line = require('@line/bot-sdk');


///////////////////////

const LINE_CONFIG = jsonfile.readFileSync('line.config.json');
exports.LINE_CONFIG = LINE_CONFIG;     // server.jsから呼び出すために export

const lineClient = new line.Client(LINE_CONFIG);
const LINE_MAX_TEXT_MESSAGE_SIZE = 2000; // 


const formatMessage = (aMsg) => {

  // 文字列のまま渡された値は、
  // LINE返信用のフォーマットに変更
    if(typeof aMsg == 'string') {
      return {
        type: 'text',
        text: aMsg
      };
    } else {
      return aMsg;
    }
}


exports.replyMessageToLine = async (token, msg) => {

  let replyMsg = [];
  if(Array.isArray(msg)) {
    for(const value of msg)
      replyMsg.push(formatMessage(value)); 
  } else {
    replyMsg.push(formatMessage(msg));
  }
  
  // １回にリプライできるメッセージは最大5。6メッセージ以上ある場合。
  // これを行わないと HTTP Error 400が返される
  if(replyMsg.length > 5) {
    logger.warn(`replyMsg.lenght is ${replyMsg.lenght}. Truncate messages to 4`);
    const strTruncated = `（送信メッセージ数が制限を超えたため、以下、メッセージを省略しました）`;
    
    // ５メッセージ目の文字数が制限を超える場合、４メッセージ目までにして、メッセージを切り捨てる旨のメッセージを５番目として追加。
    if((replyMsg[4].text.length + strTruncated + 2) > LINE_MAX_TEXT_MESSAGE_SIZE) {
      replyMsg = replyMsg.slice(0, 4);
      replyMsg.push(strTruncated);
    } else {
    // ５メッセージ目の文字数が制限を超えない場合、５メッセージ目のテキストにメッセージを切り捨てる旨のメッセージを追加。
      replyMsg = replyMsg.slice(0, 5);
      replyMsg[4].text = replyMsg[4].text + `\n\n${strTruncated}`;
    }
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
