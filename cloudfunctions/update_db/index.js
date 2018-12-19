const cloud = require('wx-server-sdk')
cloud.init()
// 云函数入口函数
exports.main = async (event, context) => {
  var updatekey = event.updatekey
  var newdata = event.newdata
  const db = cloud.database()
  try {
    return await db.collection(event.addkey).doc(event.userid).update({
      data: {
        [updatekey]: newdata,      
      }
    })
  } catch (e) {
    console.log(e)
  }

}