const { Tapable, SyncHook } = require('tapable')
const Parser = require('./Parser.js')
const NormalModuleFactory = require('./NormalModuleFactory')
const path = require('path')
const normalModuleFactory = new NormalModuleFactory()
const parser = new Parser()

class Compilation extends Tapable{
	constructor(compiler) {
		super()
		this.compiler = compiler
		this.context = compiler.context
		this.options = compiler.options
		// 文件读写
		this.inputFileSystem = compiler.inputFileSystem
		this.outputFileSystem = compiler.outputFileSystem
		this.entries = [] // 入口模块
		this.modules = [] // 所有模块
		this.hooks = {
			succeedModule: new SyncHook(['module'])
		}
	}
	/**
	 * 完成模块编译操作
	 * @param {*} context 当前项目的根
	 * @param {*} entry 入口相对路径
	 * @param {*} name chunkName main 
	 * @param {*} callback 回调
	 * @memberof Compilation
	 */
	addEntry(context, entry, name, callback) {
		this._addModuleChain(context, entry, name, (err, module) => {
			callback(err, module)
		})
	}
	_addModuleChain(context, entry, name, callback) {
		let entryModule = normalModuleFactory.create({
			name,
			context,
			entry: entry,
			rawRequest: entry,
			resource: path.posix.join(context, entry), // 返回entry入口的绝对路径
			parser
		})
		const afterBuild = function (err) {
			callback(err, entryModule)
		}
		this.buildModule(entryModule, afterBuild)

		// build完, 将module保存
		this.entries.push(entryModule)
		this.modules.push(entryModule)
	}
	/**
	 *
	 * 完成具体的build
	 * @param {*} module 需要编译的模块
	 * @param {*} callback
	 * @memberof Compilation
	 */
	buildModule(module, callback) {
		module.build(this, (err)=> {
			this.hooks.succeedModule.call(module)
			callback(err)
		})
	}
}
module.exports = Compilation