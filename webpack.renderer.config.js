const rules = require('./webpack.rules');
const webpack = require('webpack');
const path = require('path');
const WebpackObfuscator = require('webpack-obfuscator');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const webplugins=[
  new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^fs$|^path$|^os$/,
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/locales'),
          to: 'locales',  
        },
        {
          from: path.resolve(__dirname, 'src/vendors'),
          to: 'vendors', 
        },{
          from: path.resolve(__dirname,'src/css'),
          to: 'css',  
        }
      ]
    })
  
];


rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
},
{
				test: /\.ttf$/,
				type: 'asset/resource'
			},
);

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  stats: {
   warningsFilter: [/Critical dependency: require function is used in a way/]
  },
  plugins: webplugins,
};
