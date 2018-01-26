const log4js = require('log4js');
log4js.configure('log4js.config.json');
const logger = log4js.getLogger("question.js");

const lineMessage = require("./line_message.js");
const db = require('./oracle.js');

///////////////////////////////////
const getJpnDate = (dt) => {
  logger.trace("getJpnDate(dt)");
  let weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  let i = dt.getDay();
  let m = ("00" + (dt.getMonth()+1)).slice(-2);
  let d = ("00" + dt.getDate()).slice(-2);
  let result = `${m}月${d}日（${weekdays[i]}）`; 
  return result;
}

const getYYYYMMDD = (dt) => {
  logger.trace("getYYYYMMDD(dt)");
  let y = dt.getFullYear();
  let m = ("00" + (dt.getMonth()+1)).slice(-2);
  let d = ("00" + dt.getDate()).slice(-2);
  let result = `${y}-${m}-${d}`;
  return result;
}



const getDeliveryStatus = async (orderid, reschedule) => { // reschedule は boolean
  let ret;
  
  try {
    logger.trace(`getDeliveryStatus: orderid ${orderid}`);
    const sqltext = "SELECT order_id, status, location, complete_flg "
                   + "FROM delivery_status WHERE order_id = :id";
    
    const result = await db.executeSQL(sqltext, [orderid], { outFormat: db.OBJECT });
    if (result.rows.length == 0)
      ret = "INVALID_ORDER";
    else if(reschedule)
      ret = (result.rows[0].COMPLETE_FLG == 'Y') ? "ALREADY_DELIVERED" : "ORDER_CHECK_OK";
    else
      ret = `伝票番号:${orderid}\n現在の状況:${result.rows[0].STATUS}\n場所:${result.rows[0].LOCATION}`;

  } catch(err) {
      logger.error(`${err.message}`);
      ret = `Error: ${err.message}`;
  }
  return ret;
}

const setDeliverySchedule = async (orderid, dt, tm) => {
  logger.trace(`setDeliverySchedule: orderid ${orderid}`);
  try {
    const sqltext = "UPDATE delivery_status "
             + "SET delivery_dt = :dt, delivery_tm = :tm "
             + "WHERE order_id = :id";
           
    const result = db.executeSQL(sqltext,[dt, tm, orderid]);
    return true;
  } catch(err) {
      logger.error(`setDeliverySchedule: ${err}`);
      return false;
  };
}


/////////////////////////////
class Question {

  constructor(val) {
    logger.trace(`class ${this.constructor.name}: constructor`); ////
    logger.debug(JSON.stringify(val));
    this.status = val.id;
    this.text = val.text;
    this.type = val.type;
    this.next = (typeof val.next == 'undefined') ? null : val.next;
    this.previous = (typeof val.previous == 'undefined') ? null : val.previous;
    this.answerCandidates = (typeof val.answerCandidates == 'undefined') ? null : val.answerCandidates;
   // this.data = null;
    if(typeof val.sticker != "undefined")
      this.sticker = val.sticker;
  }

  // 入力情報をもとに次のステータスをContextにセットする
  async setNewStatusToContext(ctx, text) {
    logger.trace(`${this.constructor.name}: setNewStatusToContext`);
    logger.trace(`${JSON.stringify(ctx)}`);
    
    // 入力値が nullで呼び出されることはない
    if(text == null) {
      throw new Error('class Question: setNewStatusToContext: text is null');
    }

    // this.next.successが指定されているものは、
    // それを次のステータスとしてセットする
    if(this.next != null && this.next.success != null) {
      ctx.status = this.next.success;
      return;
    }

    // textで選択肢によって次のアクションが異なるケース
    // confirmやbuttonsを textに変更しても動くようにしている
    else if(this.type == "text" &&
    　　　　　　　this.answerCandidates != null &&
    　　　　　　　Array.isArray(this.answerCandidates)　&&
    　　　　　　　this.answerCandidates.length > 0) {
        
      // control.js validateSelectedNumber内で範囲内の値かどうかはチェック済み
      
      if(this.answerCandidates[parseInt(text) - 1].next != null && this.answerCandidates[parseInt(text) - 1].next.success != null) {
        // answerCandidates.next.successが指定されている場合は
        // それをセットする
        ctx.status = this.answerCandidates[parseInt(text) - 1].next.success;
        return;
      }
    }

    // ボタンの場合、this.next.successではなく、answerCandidates[i].next.success
    // に次のステータスがセットされている
    else if(this.type == "confirm" || this.type == "buttons") {

      for(const value of this.answerCandidates) {
        if(value.text == text) {
          ctx.status = value.next.success;
          return;
        }
      }
      // forでは入力された値が見つからなかった
      // 入力された値がボタンと異なる値だった
      ctx.status = "QUESTION_INVALID_ANSWER";
    }
  }
  
  async getQuestionMessage(ctx){
    // 子クラスでContext情報が必要なものがあるので、ctxを引数として取っている
    
    logger.trace(`${this.constructor.name}: getQuestionMessage`);
    return await lineMessage.getMessageObject(this);
  }
}


class Question_GET_STATUS extends Question {
  async setNewStatusToContext(ctx, text){
    ctx.data = {orderid: text};
    super.setNewStatusToContext(ctx, text);
  }
  
  async getQuestionMessage(ctx) {
      if(this.status == 'GET_STATUS_01')
        return super.getQuestionMessage();
    
      let msg = await getDeliveryStatus(ctx.data.orderid, false);
      return (msg == "INVALID_ORDER") ? "該当伝票はありませんでした。適切な伝票番号を入力してください。" : msg;
  }
}

class Question_RESCHEDULE_01 extends Question {

  async setNewStatusToContext(ctx, text) {
      let msg = await getDeliveryStatus(text, true); 

      if(msg == `ORDER_CHECK_OK`){
        ctx.data = {orderid: text};
        super.setNewStatusToContext(ctx, text);
      } else {
        logger.debug(`Question_RESCHEDULE_01: setNewStatusToContext: ${msg}`);
        ctx.status = (msg == "INVALID_ORDER") ? "RESCHEDULE_01_INVALID_ORDER" : "RESCHEDULE_01_ALREADY_DELIVERED";
      }
  }
}

class Question_RESCHEDULE_02 extends Question {
  async setNewStatusToContext(ctx, text, resolve, reject) {
　   // RESCHEDULE_02の場合、answerCandidatesには textとvalueの２つの値をもつ
    // 実際の値として扱うのは value
    ctx.data.date = this.answerCandidates[parseInt(text) - 1].value;
    super.setNewStatusToContext(ctx, text);
  }
  
  async getQuestionMessage(ctx) {

    let today = new Date();
    for(let i = 0; i < this.answerCandidates.length; i++) {
      let dt = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
            
      // RESCHEDULE_02の場合、表示用の text と実データの valueの二つの値を持つ
      this.answerCandidates[i].text = (i == 0) ? `本日：${getJpnDate(dt)}` : `${getJpnDate(dt)}`;
      this.answerCandidates[i].value = getYYYYMMDD(dt);
    }
    return super.getQuestionMessage(ctx);
　　}
}

class Question_RESCHEDULE_03 extends Question {

  async setNewStatusToContext(ctx, text) {
    // RESCHEDULE_04の場合、answerCandidatesは textのみ
    // RESCHEDULE_02と異なり、textの値をそのまま利用する
    ctx.data.time = this.answerCandidates[parseInt(text) - 1].text;
    super.setNewStatusToContext(ctx, text);
  }
}

class Question_RESCHEDULE_04 extends Question {
  async getQuestionMessage(ctx) {
    logger.trace('Question_RESCHEDULE_04: setQuestionMessage'); 
    
    this.text = this.text.replace("${orderid}", ctx.data.orderid)
  　　　　                   .replace("${dt}", ctx.data.date)
       　                 .replace("${tm}", ctx.data.time);

    logger.trace(this.text);
    return super.getQuestionMessage(ctx);
  }
}

class Question_RESCHEDULE_END extends Question {
    
  async getQuestionMessage(ctx){
    if(await setDeliverySchedule(ctx.data.orderid, ctx.data.date, ctx.data.time)) {
      ctx.status = this.next.success;
      return await lineMessage.getMessageObject(this);

    } else {
      ctx.status = this.next.failure;
      return `データ登録時にエラーが発生しました`;
    }
  }
}

/////////////////////////////
const questionArray = [
  {
    id:"PROTOTYPE",     // 説明用プロトタイプ(これ自体は使わない）
    text:"",
    type:"prototype",       // buttons, text, confirm, sticker
    sticker: {            // sticker only
      "packageId": "",
      "stickerId": ""
    },
    class: Question,  
    next:{                  // 次のステータス
        success: "",
        failure: ""
    },
    previous: "",           // やり直しを行う場合の前のステータス
    answerCandidates: [     // 質問に対する回答の選択肢
        {
            text: "",
            next: {         // buttonsやconfirmの場合は、選択したボタンに対する次のステータスを指定
                success: "",
                failure: ""
            }
        }
    ]
  },
  {
    id:"START",
    "text":"ご要望の処理を選択してください",
    "type":"buttons",
//    "type":"text",
    "class": Question,  
    "next":{},
    "answerCandidates": [
        {
            text: "配送状況確認",
            next: {success: "GET_STATUS_01"}
        },
        {
            text: "配送日指定",
            next: {success: "RESCHEDULE_01"}
        }
    ]
  },
  {
    "id":"GET_STATUS_01",
    "text":"状況確認をするお客様の伝票番号を入力してください",
    "type":"text",
    "class": Question_GET_STATUS,  
    "next":{
        "success": "GET_STATUS_02",
        "failure": "GET_STATUS_01",
    },
    "answerCandidates": []
  },
  {
    "id":"GET_STATUS_02",
    "text":"",
    "type":"text",
    "class": Question_GET_STATUS,
    "next":{"success": "GET_STATUS_02"},
    "answerCandidates": []
  },
  {
    "id":"RESCHEDULE_01",
    "text":"配達日指定するお客様の伝票番号を入力してください",
    "type":"text", 
    "class": Question_RESCHEDULE_01,  
    "next":{
        "success": "RESCHEDULE_02",
        "failure": "RESCHEDULE_01_FAILURE",
    }
  },
  {
    "id":"RESCHEDULE_01_INVALID_ORDER",
    "text":"該当伝票はありませんでした。適切な伝票番号を入力してください。",
    "type":"text", 
    "class": Question_RESCHEDULE_01,  ///// classは　Question_RESCHEDULE_01
    "next":{
        "success": "RESCHEDULE_02"
    }
  },
  {
    "id":"RESCHEDULE_01_ALREADY_DELIVERED",
    "text":"その伝票番号は配送済みです",
    "type":"text", 
    "class": Question_RESCHEDULE_01,  ///// classは　Question_RESCHEDULE_01
    "next":{
        "success": "RESCHEDULE_02"
    }
  },
  {
    "id":"RESCHEDULE_02",
    "text":"ご希望の日付を選択してください",
    "type":"text",  
    "class": Question_RESCHEDULE_02,   
    "next":{
        "success": "RESCHEDULE_03",
        "failure": "RESCHEDULE_01",
    },
    "previous": "RESCHEDULE_01",
    "answerCandidates": [
      {"id": "TODAY"},
      {"id": "TOMORROW"},
      {"id": "2DAYS_LATER"},
      {"id": "3DAYS_LATER"},
      {"id": "4DAYS_LATER"},
      {"id": "5DAYS_LATER"},
      {"id": "6DAYS_LATER"}
    ]
  },
  {
    "id":"RESCHEDULE_03",
    "text":"ご希望の時間帯を選択してください",
    "type":"text", 
    "class": Question_RESCHEDULE_03,  
    "next":{
        "success": "RESCHEDULE_04",
        "failure": "RESCHEDULE_03",
    },
    "previous": "RESCHEDULE_02",    
    "answerCandidates": [
        {"text": "9時-12時"},
        {"text": "12時-14時"},
        {"text": "14時-16時"},
        {"text": "16時-18時"},
        {"text": "18時-20時"},
        {"text": "20時-22時"}
    ]
  },
  {
    "id":"RESCHEDULE_04",
    "text":"伝票番号:${orderid}\n配達日:${dt}\n時間帯:${tm}でよろしいですか？",
    "type":"confirm",
//    "type":"text",
    "class": Question_RESCHEDULE_04,  
    "next":{},
    "previous": "RESCHEDULE_03",
    "answerCandidates": [
        {
            "text": "はい",
            "next": {"success": "RESCHEDULE_END"}
        },
        {
            "text": "いいえ",
            "next": {"success": "RESCHEDULE_01"}
        }
    ]
  },
  {
    "id":"RESCHEDULE_END",
    "text":"登録が完了しました",
    "type":"text",
    "class": Question_RESCHEDULE_END,  
    "next":{
        "success": "END",
        "failure": "RESCHEDULE_01"
    }
  },
  {
    "id":"INVALID_VALUE",
    "text":"文字を入力をしてください",
    "class": Question,   
    "type":"text",
    "next":{}
  },
  {
    "id":"QUESTION_INVALID_ANSWER",
    "text":"選択肢から選んでください",
    "type":"text",
    "class": Question,  
    "next":{}
  },
  {
    "id":"HELP",
    "text":"[操作方法]\nメニューの表示：「メニュー」\n入力途中で戻る：「もどる」\n終了する:「おわる」",
    "type":"text",
    "class": Question,
    "next":{}
  },
  {
    "id":"END",
    "type":"sticker",
    "class": Question,
    "sticker": {
      "packageId": "2",
      "stickerId": "42"
    }
  }
]

exports.questionArray = questionArray; // Test用


////**********************************************************
exports.get = (status) => {
  logger.trace(`question.get: status: ${status}`);

  return new Promise((resolve, reject) => {

    let val = questionArray.find((element, idx, array) => {
      if(element.id == status) {
        logger.trace(element);
        return element;
      }
    });

    if(typeof val === 'undefined') {
      logger.error(`question.get: ${status} not defined in questionArray`);
      reject(new Error(`question.get: ${status} not defined in questionArray`));
    } else {
      resolve(new val.class(val));
    }
  });
}