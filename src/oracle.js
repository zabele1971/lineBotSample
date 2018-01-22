const log4js = require('log4js');
log4js.configure('log4js.config.json');
const logger = log4js.getLogger("oracle.js");

const oracledb = require('oracledb');
// oracledb.autoCommit = true;

const connectionProperties = {
  user: process.env.DBAAS_USER_NAME || "c##bot",
  password: process.env.DBAAS_USER_PASSWORD || "c##bot",
  connectString: process.env.DBAAS_DEFAULT_CONNECT_DESCRIPTOR || "",
  stmtCacheSize: process.env.DBAAS_STATEMENT_CACHE_SIZE || 10,
  poolMin: 2,
  poolMax: 10
};

const doRelease = (conn) => {
  conn.release((err) => {
    if (err) {
      logger.warn(`doRelease: ${err}`);
    }
  });
}

// 戻り値をとるSQLの場合、outFormatの指定でOracle DBの型指定が必要となる
exports.OBJECT = oracledb.OBJECT;

// SQL実行用共通ファンクション
exports.executeSQL = async (sqltext, bind, option) => {
  logger.debug(`executeSQL: ${sqltext}, ${bind}, ${option}`);

  let conn = null;
  try {
    // コネクションをプールから取得
    conn = await oracledb.getConnection(connectionProperties);

    // SQLを実行
    const result = (option == null) ? await conn.execute(sqltext, bind) : await conn.execute(sqltext, bind, option);

    // SELECT文でなければ commit
     if(sqltext.trim().toUpperCase().indexOf("SELECT") != 0)
       await conn.commit();

    // コネクションをリリース(これは完了をまたない）
    doRelease(conn);
    return result;

  } catch(err) {
      logger.error(`executeSQL: ${err.message}`);
      if(conn != null){
        // コネクションがあるので、SQL実行 or COMMIT時のエラー。
        // コネクションをリリースする
        doRelease(conn);
      }
      throw err;
  }
}

////////////////////////////////////////////////////////////////////////////////////////
