module.exports = {
  publicPath: './',
  lintOnSave: false,
  pages: {
    index: {
      entry: 'src/main.js',
      title: 'Double Take',
    },
  },
  devServer: {
    historyApiFallback: {
      index: '/index.html',
    },
  },
};
