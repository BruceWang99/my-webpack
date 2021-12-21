const { AsyncSeriesHook } = require("tapable")
class Compiler {
	constructor(context) {
		// super()
		this.context = context
		this.hooks = {
			done: new AsyncSeriesHook(["stats"])
		}
	}
	run(callback) {
		callback(null, {
			toJson() {
				return {
					entries: [], // 入口信息
					chunks: [], // chunk信息
					modules: [], // 模块信息
					assets: [] // 最终生成的资源
				}
			}
		})
	}
}

module.exports = Compiler