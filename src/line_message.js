const log4js = require('log4js');
log4js.configure('log4js.config.json');
const logger = log4js.getLogger("line_message.js");

const LINE_MAX_BUTTONS = 4; // LINEのbuttonsは最大4まで


const buttons = (question) => {
  let buttons = {
    type: "template",
    altText: question.text,
    template: {
      type: "buttons",
      text: question.text,
      actions: []
    }
  };

  // ボタンの最大数以上が指定されているとエラーとなるため、
  // 最大値で切る
  if(question.answerCandidates.length > LINE_MAX_BUTTONS)
	logger.error('question.answerCandidates.length > LINE_MAX_BUTTONS');
  
  let max = (question.answerCandidates.length > LINE_MAX_BUTTONS) ? LINE_MAX_BUTTONS : question.answerCandidates.length;
  
  for(let i = 0; i < max; i++) {
    buttons.template.actions[i] = {
      type: "message",
      label: question.answerCandidates[i].text,
      text: question.answerCandidates[i].text
    }
  }
  
  if(question.answerCandidates.length > 4)
    logger.error(`Maximum buttons are 4: ${question}`);

  return buttons;
}


const confirm = (question) => {
  return {
    type: "template",
    altText: question.text,
    template: {
      type: "confirm",
      text: question.text,
      actions: [
        {
          type: "message",
          label: question.answerCandidates[0].text,
          text: question.answerCandidates[0].text
        },
        {
          type: "message",
          label: question.answerCandidates[1].text,
          text: question.answerCandidates[1].text
        }
      ]
    }
  }
}


const text = (question) => {
  let msg = {
    type: "text",
    text: question.text
  }
  
  if(Array.isArray(question.answerCandidates) == false ||
     question.answerCandidates.length == 0)
    return msg;

  msg.text += "\n\n";

  for(let i = 0; i < question.answerCandidates.length; i++) {
    msg.text += `（${i+1}）${question.answerCandidates[i].text}\n`;
  }

  msg.text += "----\n上の選択肢から選び、数字を入力してください";
  return msg;
}


const sticker = (question) => {
  return {
    type: "sticker",
    packageId: question.sticker.packageId,
    stickerId: question.sticker.stickerId
  }
}


exports.getMessageObject = (question) => {
logger.debug(question);
  switch(question.type) {
    case "text":
      return text(question);
    case "buttons":
      return buttons(question);
    case "confirm":
      return confirm(question);
    case "sticker" :
      return sticker(question);
  }  
}
