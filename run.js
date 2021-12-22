let webpack = require('./lgPack')
let options = require('./webpack.config')

let compiler = webpack(options)

compiler.run((err, stats)=> {
	console.log(err);
	console.log(stats.toJson({
		entries: true, // 入口信息
		chunks: false, // chunk信息
		modules: false, // 模块信息
		assets: false // 最终生成的资源
	}));
})