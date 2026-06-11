export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/records/index',
    'pages/mine/index',
    'pages/game/index',
    'pages/difficulty/index',
    'pages/result/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#121212',
    navigationBarTitleText: '中式黑八台球',
    navigationBarTextStyle: 'white',
    backgroundColor: '#121212'
  },
  tabBar: {
    color: '#808080',
    selectedColor: '#D4AF37',
    backgroundColor: '#1E1E1E',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/records/index',
        text: '战绩'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
