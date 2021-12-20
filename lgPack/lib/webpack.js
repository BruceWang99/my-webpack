const Compiler = require('./Compiler.js')
const NodeEnvironmentPlugin = require('./NodeEnvironmentPlugin.js')

const webpack = function (options) {

	// 01 实例化 compiler 对象
	let compiler = new Compiler(options.context)
	compiler.options = options
	// 02 初始化 NodeEnvironmentPlugin(让compiler具体文件读写能力)
	new NodeEnvironmentPlugin().apply(compiler)
	// 03 挂载所有plugins 插件到compiler对象身上
	if(options.plugins && Array.isArray(options.plugins)) {
		if(const plugin of options.plugins) {
			plugin.apply(compiler)
		}
	}
	// 04 挂载所有 webpack 内置的插件 (入口)

	// TODO:
	// 05 返回compiler
	return compiler
}