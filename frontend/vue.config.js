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
  chainWebpack: (config) => {
    config.plugin('define').tap((definitions) => {
      Object.assign(definitions[0], {
        __VUE_OPTIONS_API__: 'true',
        __VUE_PROD_DEVTOOLS__: 'false',
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
      });
      return definitions;
    });
  },
};
