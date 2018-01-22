const restify = require('restify');
const errs = require('restify-errors');
const log4js = require('log4js');
const control = require('./control.js');
const line = require('./line.js');
const middleware = require('@line/bot-sdk').middleware;

log4js.configure('log4js.config.json');
const logger = log4js.getLogger("server.js");

const server = restify.createServer();

// Webhook URLへの POSTを受け取る
server.post('/webhook',
  middleware(line.LINE_CONFIG),   // LINEからの署名の検証
  ((req, res, next)=> {
    res.send(200);

    logger.trace(`+ START OF A RESQUEST +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++`);
    logger.trace(`# of events in a POST request: ${req.body.events.length}`);

    // イベントオブジェクトは配列で渡される。mapを使ってひとつづつ処理
    req.body.events.map((event) => {
      control.doAction(event);
    });
    next();
  })
);

server.on('restifyError', ((req, res, err, cb) => {
  // middleware(line.LINE_CONFIG)のチェックによるエラーがある場合、メッセージを生成
  let msg = line.handleLineError(err);
  
  if(msg != null) {
    err.toJSON = function toJSON() {
      return msg;
    };
  }
  return cb();
}));

server.listen(process.env.PORT || 3000, () => {
    logger.info("Node is running...");
});

