const path = require('path');

module.exports = {
  entry: './src/index.ts',
  mode: 'development',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@managers': path.resolve(__dirname, 'src/managers'),
      '@constants': path.resolve(__dirname, 'src/constants'),
      '@types': path.resolve(__dirname, 'src/types'),
    },
  },
  output: {
    filename: 'yapp-sdk.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'YappSDK',
    libraryTarget: 'umd',
    libraryExport: 'default',
    globalObject: 'this',
  },
};
