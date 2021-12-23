const { Tapable, AsyncSeriesHook, SyncBailHook, SyncHook, AsyncParallelHook } = require("tapable")
const mkdirp = require('mkdirp')
const path = require('path')
const NormalModuleFactory = require('./NormalModuleFactory.js')
const Compilation = require('./Compilation.js')
const Stats = require('./Stats.js')
class Compiler extends Tapable {
	constructor(context) {
		super()
		this.context = context
		this.hooks = {
			done: new AsyncSeriesHook(["stats"]),
			entryOption: new SyncBailHook(["context", "entry"]),
			beforeRun: new AsyncSeriesHook(["compiler"]),
			run: new AsyncSeriesHook(["compiler"]),
			thisCompilation: new SyncHook(["compilation", "params"]),
			compilation: new SyncHook(["compilation", "params"]),
			beforeCompile: new AsyncSeriesHook(["params"]),
			compile: new SyncHook(["params"]),
			make: new AsyncParallelHook(["compilation"]),
			afterCompile: new AsyncSeriesHook(["compilation"]),
			emit: new AsyncSeriesHook(["compilation"])
		}
	}
	emitAssets(compilation, callback) {
		// 1. 创建dist 2. 在目录创建完成之后执行文件的写操作
		// 定义一个工具方法用于执行文件的生成操作
		const emitFiles = (err) => {
			const assets = compilation.assets
			let outputPath = this.options.output.path

			for(let file in assets) {
				let source = assets[file]
				let targetPath = path.posix.join(outputPath, file)
				this.outputFileSystem.writeFileSync(targetPath, source, 'utf8')
			}
			callback(err)
		}
		// 创建目录之后启动文件写入
		this.hooks.emit.callAsync(compilation, (err)=> {
			mkdirp.sync(this.options.output.path)
			emitFiles()
		})
	}
	run(callback) {
		console.log('run runing');
		const finalCallback = function (err, stats) {
			callback(err, stats)
		}
		const onCompiled =  (err, compilation) => {

			// 把chunk输出到dist
			this.emitAssets(compilation, (err)=>{
				let stats = new Stats(compilation)
				finalCallback(err, stats)
			})
		}
		
		this.hooks.beforeRun.callAsync(this, (err)=>{
			this.hooks.run.callAsync(this, (err) => {
				this.compile(onCompiled)
			})
		})
	}
	compile(callback) {
		const params = this.newCompilationParams()
		this.hooks.beforeRun.callAsync(params, (err) => {
			this.hooks.compile.call(params)
			const compilation = this.newCompilation(params)

			this.hooks.make.callAsync(compilation, (err)=> {
				// console.log('make 钩子监听触发了')
				// callback(err, compilation)

				// 在这里我们处理chunks
				compilation.seal((err)=>{
					this.hooks.afterCompile.callAsync(compilation, (err)=>{
						callback(err, compilation)
					})
				})
			})
		})
	}
	newCompilationParams() {
		const params = {
			normalModuleFactory: new NormalModuleFactory()
		}
		return params
	}
	newCompilation(params) {
		const compilation = this.createCompilation()
		this.hooks.thisCompilation.call(compilation, params)
		this.hooks.compilation.call(compilation, params)
		return compilation
	}
	createCompilation () {
		return new Compilation(this)
	}
}

module.exports = Compiler