const { override, addWebpackPlugin } = require('customize-cra');
const webpack = require('webpack');
const path = require('path');

module.exports = override(
  // Node.js 폴리필 추가
  addWebpackPlugin(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    })
  ),
  // webpack 설정 직접 수정
  (config) => {
    // 폴백 설정 추가
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "buffer": require.resolve("buffer/"),
      "stream": require.resolve("stream-browserify"),
      "assert": require.resolve("assert/"),
      "util": require.resolve("util/"),
      "process": require.resolve("process/browser"),
      "fs": false,
      "path": require.resolve("path-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "crypto": require.resolve("crypto-browserify"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "zlib": require.resolve("browserify-zlib"),
    };

    // 추가 플러그인 설정
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /node:/, 
        (resource) => {
          const mod = resource.request.replace(/^node:/, '');
          switch (mod) {
            case 'stream':
              resource.request = 'stream-browserify';
              break;
            case 'buffer':
              resource.request = 'buffer';
              break;
            default:
              break;
          }
        }
      )
    );

    // 모듈 별칭 설정
    config.resolve.alias = {
      ...config.resolve.alias,
      'stream': path.resolve(__dirname, 'node_modules/stream-browserify'),
      'buffer': path.resolve(__dirname, 'node_modules/buffer'),
    };

    return config;
  }
); 