const line = require('./line.js');
const Context = require('./context.js');
const Question = require('./question.js');
const log4js = require('log4js');

log4js.configure('log4js.config.json');
const logger = log4js.getLogger("control.js");

////////////////////////////////////////////////

const exitArray = [
  ["終", "indexOf"],
  ["止", "indexOf"],
  ["おわ", "indexOf"],
  ["やめ", "indexOf"],
  ["キャンセル", "indexOf"],
  ["CANCEL", "equal"],
  ["EXIT", "equal"],
  ["STOP", "equal"],
  ["COMPLETE", "equal"]
];

const startArray = [
  ["始め", "indexOf"],
  ["はじめ", "indexOf"],
  ["開始", "indexOf"],
  ["スタート", "indexOf"],
  ["こんにちは", "indexOf"],
  ["こんにちわ", "indexOf"],
  ["今日", "indexOf"],
  ["メニュ", "indexOf"],
  ["HELLO", "indexOf"],
  ["START", "equal"],
  ["MENU", "equal"]
];

const retryArray = [
  ["戻", "indexOf"],
  ["もど", "indexOf"],
  ["やり直", "indexOf"],
  ["やりなお", "indexOf"],
  ["直", "indexOf"],
  ["なお", "indexOf"],
  ["訂正", "indexOf"],
  ["修正", "indexOf"],
  ["リトライ", "indexOf"]
];

const helpArray = [
  ["HELP", "equal"],
  ["ヘルプ", "equal"],
  ["?", "equal"],
  ["？", "equal"]
];


const isCommand = (array, txt) => {
  txt = txt.trim().toUpperCase();

  for(let i = 0; i < array.length; i++) {
    switch(array[i][1]) {
      case "indexOf":
        if(txt.indexOf(array[i][0]) == 0)
          return true;
        break;
      case "equal" :
        if(array[i][0] == txt)
          return true;
    }
  }
  return false;
}

const IsExit = (txt) => {
  return isCommand(exitArray, txt);
}

const DoesStart = (txt) => {
  return isCommand(startArray, txt);
}

const DoesRetry = (txt) => {
  return isCommand(retryArray, txt);
}

const DoesHelp = (txt) => {
  return isCommand(helpArray, txt);
}

////////////////////////////////////////////////

const getContext = async (event) => {
    logger.trace(`getContext: token: ${event.replyToken}`);
    logger.trace(`LINE UserID: ${event.source.userId}`);
    
    // userIdをもとにキャッシュに既存ステートを確認
    const ctx = await Context.get(event.source.userId);
      
    // msgTypeをセット
      // event.type == "message"のみを扱うので、その場合は個々のメッセ―ジタイプevent.message.typeをセット
      // それ以外は　event.typeの値をセット
    ctx.msgType = (event.type == "message") ? event.message.type : event.type;

    return ctx;
}

const validateSelectedNumber = (ctx, text) => {

  if(ctx.question.type == "text" &&
    typeof ctx.question.answerCandidates != 'undefined' &&
    Array.isArray(ctx.question.answerCandidates) &&
    ctx.question.answerCandidates.length > 0) {
    // 数字である必要があるかどうか
    // [チェックする条件]
    // ・question.typeがtext
    // ・配列としてanswerCandidatesを持つ
    // ・answerCandidatesは空の配列ではない

    if(isNaN(text)) {
    // 入力された値が数値かどうか
    // textで選択肢からの選択する場合は数値入力なので、
    // 数値ではない場合は不適切な値とみなす

      logger.debug(`validateSelectedNumber: isNaN`);
      return false;
    }

    else if(parseInt(text) < 1 ||
      parseInt(text) > ctx.question.answerCandidates.length) {
    // 入力値の範囲が、選択肢の範囲外かどうか
    // 範囲は 1 から answerCandidates.length までが OK
    // それ以外は不適切な値
    　　return false;
    
    } else {
      // 選択肢の範囲内
      return true;
    }
  }
  // それ以外のケースは
  // 数字である必要がないので、trueを返す
  return true;
}

const interpretUserAnswer = async (ctx, event) => {
  let ret;
  
    if (ctx.msgType != "text") {
      ctx.status = "INVALID_VALUE";
      return ctx;
    }
    
    const text = event.message.text.trim();
    
    
    if(IsExit(text)) {
    // 入力テキストが「終了」を意味する語かどうかをチェック
      logger.trace(`IsExit: ${JSON.stringify(ctx)}`);
      ctx.status = "END";
      return ctx;
    }
    
    else if(DoesHelp(text)) {
    // 入力テキストが「ヘルプ」を意味する語かどうかをチェック
    logger.trace(`DoesHelp: ${JSON.stringify(ctx)}`);
      ctx.status = "HELP";
      return ctx;
    }

    else if(DoesStart(text) || ctx.question == null) {
    // ctx.questionがない場合は STARTから開始、もしくは、
    // 入力テキストが「開始」を意味する語かどうかをチェック
      logger.trace(`DoesStart: ${JSON.stringify(ctx)}`);
      ctx.status = "START";
      return ctx;
    }

    else if(DoesRetry(text) &&
              ctx.question != null &&
              ctx.question.previous != null) {

    // 入力テキストが「やり直す」「戻る」を意味する語かどうかをチェック
    // その場合、戻り先が指定されている必要がある
    // 戻り先があれば、それを次のステータスとしてセットする
      ctx.status = ctx.question.previous;
      return ctx;
    }
    
    else if(validateSelectedNumber(ctx, text)) {
    // 選択肢からの選択の場合、適切な数値かをチェックする
    // validateSelectedNumberがtrueなのは
    // ・選択肢からの選択ではない場合
    // ・選択肢の範囲内の場合
    
      // ctx.questionはQuestionオブジェクト（もしくはその子オブジェクト）のメンバ関数
      // setNewStatusToContextを呼び出すために、Question.getのの形にする
	  
      // ret = await (await Question.get(ctx.status)).setNewStatusToContext(ctx, text);
	  ret = await (await Question.get(ctx.question.status)).setNewStatusToContext(ctx, text); // ctx.statusではなく、ctx.question.statusで Questionを呼び出すこと
      return ctx;　
    }
    
    else {
    // それ以外は不適切な値
      logger.info(`interpretUserAnswer: QUESTION_INVALID_ANSWER`);
      ctx.status = "QUESTION_INVALID_ANSWER";

      return ctx;
    }
}

const postAction = async (ctx) => {
  logger.debug(JSON.stringify(ctx));
  if(ctx.status == "END")
    Context.remove(ctx.userid);　

  else
    await Context.record(ctx);

}


exports.doAction = async (event) => {
  logger.trace(`doAction: event: ${JSON.stringify(event)}`);
  try {
    if(event.replyToken == '00000000000000000000000000000000' ||
       event.replyToken == 'ffffffffffffffffffffffffffffffff')
      // LINEからの接続確認なので何もしない
      return;
      

    logger.trace(`getContext`);
    let ctx = await getContext(event);
    logger.debug(JSON.stringify(ctx));

    logger.trace(`interpretUserAnswer`);
    ctx = await interpretUserAnswer(ctx, event);
    
    logger.trace(`Question.get`);
    const question = await Question.get(ctx.status);

    if (ctx.status != "QUESTION_INVALID_ANSWER" &&
      ctx.status != "INVALID_VALUE" &&
      ctx.status != "HELP") {
      ctx.question = question; 
    }

    logger.trace(`question.getQuestionMessage`);
    const replyMsg = await question.getQuestionMessage(ctx);
    
    logger.trace(`line.replyMessageToLine`);
    ret = await line.replyMessageToLine(event.replyToken, replyMsg);

    await postAction(ctx); 
    
  } catch (err) {
      logger.error(`doAction: catch(err): ${err}`);
  }
}
