const WebpackObfuscator = require('webpack-obfuscator');
const webpack = require('webpack');

const plugins=[
  new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    })
];

if(process.env.NODE_ENV === 'production') {
  plugins.push(new WebpackObfuscator({
      rotateStringArray:true,
      stringArrayEncoding:['base64'],
      stringArrayThreshold:0.75,
      compact:true,
      controlFlowFlattening:true,
      controlFlowFlatteningThreshold:0.75,
      deadCodeInjection:true,
      debugProtection:true,
      debugProtectionInterval:1000,
      disableConsoleOutput:true,
      identifierNamesGenerator:'mangled-shuffled',
      log:false,
      renameGlobals:false,
      selfDefending:true,
      stringArray:true,
      unicodeEscapeSequence:true,
    }, []));
}

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.js',
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
  plugins: plugins,
};
