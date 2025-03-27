const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  mode: 'development',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.json',
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })],
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
  externals: {
    jose: 'jose',
  },
};
