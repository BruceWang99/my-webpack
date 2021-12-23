const { Tapable, SyncHook } = require('tapable')
const Parser = require('./Parser.js')
const NormalModuleFactory = require('./NormalModuleFactory')
const async = require('neo-async')
const path = require('path')
const ejs = require('ejs')
const Chunk = require('./Chunk')
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
		this.chunks = [] // 打包过程中所产出的chunk
		this.assets = []
		this.files = []
		this.hooks = {
			succeedModule: new SyncHook(['module']),
			seal: new SyncHook(),
			beforeChunks: new SyncHook(),
			afterChunks: new SyncHook(),
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
	/**
	 *
	 *
	 * @param {*} data 创建模块所需的属性值
	 * @param {*} doAddEntry 可选 加载入口模块时, 将入口模块的id写入this.entries
	 * @param {*} callback
	 * @memberof Compilation
	 */
	createModule(data, doAddEntry, callback) {
		let module = normalModuleFactory.create(data)
		doAddEntry && doAddEntry(module)
		const afterBuild =  (err, module) => {
			// 判断当前module加载完成之后是否需要加载依赖
			if(module.dependencies.length > 0) {
				// 当前逻辑表示module 有需要依赖加载的模块, 定义一个方法实现
				this.processDependencies(module, (err) => {
					callback(err, module)
				})			
			} else {
				callback(err, module)
			}
		}
		this.buildModule(module, afterBuild)

		// build完, 将module保存
		this.modules.push(module)
	}
	_addModuleChain(context, entry, name, callback) {
		this.createModule({
			parser,
			name,
			context,
			rawRequest: entry,
			resource: path.posix.join(context, entry), // 返回entry入口的绝对路径
			moduleId: './' + path.relative(context, path.posix.join(context, entry))
		}, (entryModule)=>{
			this.entries.push(entryModule)
		}, callback)
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
			callback(err, module)
		})
	}
	processDependencies(module, callback) {
		// 实现一个被依赖模块的递归加载
		let dependencies = module.dependencies
		async.forEach(dependencies, (dependency, done)=>{
			this.createModule({
				name:dependency.name,
				context:dependency.context,
				rawRequest:dependency.rawRequest,
				moduleId:dependency.moduleId,
				parser:dependency.parser,
				resource:dependency.resource,
			}, null, done)
		}, callback)
	}
	seal(callback) {
		this.hooks.seal.call()
		this.hooks.beforeChunks.call()

		// 当前所有的入口模块都被存放在compilation对象的 entries数组中
		// chunk 指的是 依赖某个入口, 找到它的所有依赖, 把它们的源代码放在一起,再做合并

		for(const entryModule of this.entries) {
			// 核心: 创建模块
			const chunk = new Chunk(entryModule)

			// 保存chunk信息
			this.chunks.push(chunk)

			// 给chunk 属性赋值
			chunk.modules = this.modules.filter(module => module.name === chunk.name)
		}
		// chunk代码处理 模版文件+模块源代码 = chunk,js
		this.hooks.afterChunks.call(this.chunks)

		// 生成代码内容
		this.createChunkAssets() 


		callback()
	}
	createChunkAssets() {
		for(let i = 0; i < this.chunks.length; i++) {
			const chunk = this.chunks[i]
			const fileName = chunk.name + '.js'
			chunk.files.push(fileName)

			// 获取模版文件的路径
			let tempPath = path.posix.join(__dirname, 'temp/main.ejs')
			// 读取模版文件的内容
			let tempCode = this.inputFileSystem.readFileSync(tempPath, 'utf8')
			// 获取渲染函数
			let tempRender = ejs.compile(tempCode)
			// ejs语法渲染数据
			let source = tempRender({
				entryModuleId: chunk.entryModule.moduleId,
				modules: chunk.modules
			})
			// 输出文件
			this.emitAssets(fileName, source)
		}
		
	}
	emitAssets(fileName, source) {
		this.assets[fileName] = source
		this.files.push(fileName)
	}
	
}
module.exports = Compilation