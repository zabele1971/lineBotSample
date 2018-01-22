// Application Cache
const Cache = require('accs-cache-handler');
const log4js = require('log4js');
log4js.configure('log4js.config.json');


const cacheName = 'botContext';
const objCache = new Cache(cacheName);
const logger = log4js.getLogger("context.js");

   
class Context {
  constructor(userid) {
    this.userid = userid;
    this.msgType = "";
    this.status = "START";
    this.question = null;
    this.data = {};    // data for application
  }
}
exports.Context = Context;

exports.record = (ctx) => {
  return new Promise((resolve, reject) => {
    logger.debug(`Context.record`);
    logger.debug(JSON.stringify(ctx));
    objCache.put(ctx.userid, ctx, (err) => {
      if(err) {
        logger.error(`record: objCache.put: ${err}`);
        reject(err);
      }
      // チェックのためにget
      objCache.get(ctx.userid, (err, response) => {
        if(err) {
          logger.error(`record: objCache.put: ${err}`);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

exports.remove = (userid) => {
  logger.trace(`Context.remove`);  
  objCache.delete(userid, (err) => {
    if(err) {
      logger.error(`Context.remove: objCache.delete: ${err}`);
    }
  });
}

exports.get = (userid) => {
  logger.trace(`Context.get: ${userid}`); 
  return new Promise((resolve, reject) => {
    objCache.get(userid, (err, response) => {
      if(err) {
        logger.error(`Context.get: ${err}`);
        reject(err);
      }

      else if(response == null)
      // 該当userid無しの場合、Contextオブジェクトを生成
          resolve(new Context(userid));
      else
      // responseは該当useridのContextオブジェクト
        resolve(response);

    });
  });
}