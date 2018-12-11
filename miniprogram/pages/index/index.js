//index.js
const app = getApp()

Page({
  data: {
    avatarUrl: './user-unlogin.png',
    userInfo: {},
    logged: false,
    takeSession: false,
    requestResult: '',
    img_l: '',
    loadingHidden: true, // 等待状态

    //关于swiper
    imgUrls: ['photo1.png'],
    lastImgUrls: [],
    indicatorDots: true,
    vertical: false,
    autoplay: false,
    interval: 10000,
    duration: 1000,
    lastIndex: 6
  },

  onLoad: function() {
    if (!wx.cloud) {
      wx.redirectTo({
        url: '../chooseLib/chooseLib',
      })
      return
    }

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              this.setData({
                avatarUrl: res.userInfo.avatarUrl,
                userInfo: res.userInfo
              })
            }
          })
        }
      }
    })
    this.onQueryPic_db();
  },

  onGetUserInfo: function(e) {
    if (!this.logged && e.detail.userInfo) {
      this.setData({
        logged: true,
        avatarUrl: e.detail.userInfo.avatarUrl,
        userInfo: e.detail.userInfo
      })
    }
  },

  onGetOpenid: function() {
    // 调用云函数
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[云函数] [login] user openid: ', res.result.openid)
        app.globalData.openid = res.result.openid
        wx.navigateTo({
          url: '../userConsole/userConsole',
        })
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
        wx.navigateTo({
          url: '../deployFunctions/deployFunctions',
        })
      }
    })
  },


  onSearchUserInfo_db_cloud: function(callback) {
    wx.cloud.callFunction({
      // 云函数名称
      name: 'searchUserInfo_db',
      // 传给云函数的参数
      data: {
        addkey: "user",
        openid: app.globalData.openid,
      },
      success: function(res) {
        callback(res.result.data.length == 0 ? false : true);
      },
      fail: console.error
    })
  },

  onAddUserInfo_db_cloud: function() {
    wx.cloud.callFunction({
      // 云函数名称
      name: 'addUserInfo_db',
      // 传给云函数的参数
      data: {
        addkey: "user",
        nickName: this.data.userInfo.nickName,
        avatarUrl: this.data.userInfo.avatarUrl,
        gender: this.data.userInfo.gender,
        city: this.data.userInfo.city,
      },
      success: function(res) {
        console.log(res.result) // 3
      },
      fail: console.error
    })
  },

  UpdateUserInfo: function() {
    this.onSearchUserInfo_db_cloud(function(hasInfo) {
      if (!hasInfo) {
        onAddUserInfo_db_cloud()
      }
    })
  },

  GetInvitecode: function () {

  },

  // 上传图片
  doUpload: function() {
    this.chooseUploadImg(function(callback) {
      that.doUploadImg(callback)
    })
  },


  doUploadImg: function(res) {
    wx.showLoading({
      title: '上传中',
    })
    var that = this
    const filePath = res.tempFilePaths[0]
    var timestamp = Date.parse(new Date());
    timestamp = timestamp / 1000;
    // 上传图片
    var cloudPath = 'img_' + timestamp + filePath.match(/\.[^.]+?$/)[0]

    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: res => {

        console.log('[上传文件] 成功：', res)
        var picFileId = res.fileID
        app.globalData.fileID = picFileId
        app.globalData.cloudPath = cloudPath
        app.globalData.imagePath = filePath
        that.setData({
          picFileId,
          cloudPath
        })
        that.onAddPic_db(cloudPath, picFileId)
        that.onQueryPic_db()
        wx.hideLoading()
        wx.navigateTo({
          url: '../storageConsole/storageConsole'
        })

      },
      fail: e => {
        console.error('[上传文件] 失败：', e)
        wx.showToast({
          icon: 'none',
          title: '上传失败',
        })
      },
      complete: e => {
        wx.hideLoading()
      }
    })
  },

  chooseUploadImg: function(callback) {
    // 选择图片
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        callback(res)
      },
      fail: e => {
        console.error(e)
      }
    })
  },


  // 下载图片
  dodownload: function() {
    this.setData({
      loadingHidden: false
    })
    wx.cloud.downloadFile({
      fileID: 'cloud://xiaomao-test.7869-xiaomao-test/my-image.JPG', // 文件 ID
      success: res => {
        this.setData({
          loadingHidden: true
        })
        // 返回临时文件路径
        console.log(res.tempFilePath)
        this.setData({
          img_l: res.tempFilePath //将下载的图片临时路径赋值给img_l,用于预览图片
        })
        //用onLoad周期方法重新加载，实现当前页面的刷新
        this.onLoad()
      },
      fail: e => {
        this.setData({
          loadingHidden: true
        })
        console.error(e)
      }
    })
  },

  //预览照片
  preview_img: function(e) { //图片预览函数
    var current = e.target.dataset.src;
    wx.previewImage({
      current: current, // 当前显示图片的http链接
      urls: this.data.imgUrls // 需要预览的图片http链接列表
    })
  },


  //添加照片到数据库
  onAddPic_db: function(picId, fileId) {
    const db = wx.cloud.database()
    db.collection('pictures').add({
      data: {
        id: picId,
        path: fileId,
        date: 1,
      },
      success: res => {
        // 在返回结果中会包含新创建的记录的 _id
        this.setData({
          counterId: res._id,
        })
        wx.showToast({
          title: '新增记录成功',
        })
        //console.log('[数据库] [新增记录] 成功，记录 _id: ', res._id)
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '新增记录失败'
        })
        console.error('[数据库] [新增记录] 失败：', err)
      }
    })
  },

  //数据库查询照片
  onQueryPic_db: function() {
    var that = this
    const db = wx.cloud.database()
    // 查询当前用户所有的 counters
    db.collection('pictures').where({
      //_openid: this.data.openid
      date: 1
    }).get({
      success: res => {
        //console.log(res);
        this.setData({
          queryResult: JSON.stringify(res.data, null, 2)
        })
        //console.log('[数据库] [查询记录] 成功: ', res)

        var arr = res.data;
        var patharr = [];
        var lastPatharr = [];
        for (var i = 0, len = arr.length; i < len; i++) {
          patharr.push(arr[i].path)
          if (i > (len - that.data.lastIndex)) {
            lastPatharr.push(arr[i].path)
          }
        }
        that.setData({
          imgUrls: patharr
        })
        that.setData({
          lastImgUrls: lastPatharr
        })

        //console.log(that.data.imgUrls)
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '查询记录失败'
        })
        console.error('[数据库] [查询记录] 失败：', err)
      }
    })
  },

})