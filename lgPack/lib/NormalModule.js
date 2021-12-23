const path = require('path')
const types = require('@babel/types')
const generator = require('@babel/generator').default
const traverse = require('@babel/traverse').default
class NormalModule {
	constructor(data) {
		this.context = data.context
		this.moduleId = data.moduleId
		this.name = data.name
		this.rawRequest = data.rawRequest
		this.parser = data.parser
		this.resource = data.resource
		this._source
		this._ast
		this.dependencies = [] // 保存依赖信息
	}
	build(compilation, callback) {
		/*
		*1. 从文件中读取将来需要被加载的module内容
		* 2. 当前不是js模块就需要loader处理成js模块
		* 3. 上述操作完成之后可以将js代码转为ast语法树
		* 4. 
		*/
		this.doBuild(compilation, (err)=> {
			this._ast = this.parser.parse(this._source)
			// _ast 就是当前module的语法树, 我们可以对它进行修改
			traverse(this._ast, {
				CallExpression: (nodePath) => {
					let node = nodePath.node

					// 定位 require 所在节点
					if(node.callee.name === 'require') {
						// 获取原始的请求路径
						let modulePath = node.arguments[0].value // './title'
						// 取出当前被加载的模块名称
						let moduleName = modulePath.split(path.posix.sep).pop() // title
						// 当前我们的打包器只处理 js
						let extName = moduleName.indexOf('.') === -1 ? '.js' : ''
						moduleName += extName // title.js
						// 获取绝对路径地址
						let depResource = path.posix.join(path.posix.dirname(this.resource), moduleName)
						// 当前模块的id定义 ok
						let depModuleId = './' + path.posix.relative(this.context, depResource) // ./src/title.js

						// 记录当前被依赖模块的信息, 递归加载
						this.dependencies.push({
							parser: this.parser,
							name: this.name, // TODO: 
							context: this.context,
							rawRequest: moduleName,
							moduleId: depModuleId,
							resource: depResource
						})

						// 替换内容
						node.callee.name = '__webpack_require__'
						node.arguments = [types.stringLiteral(depModuleId)]
					}
				}
			})
			// 上述的操作是利用 ast 按要求做了代码修改, 下面的内容是利用...将修改后的ast转回成code
			let { code } = generator(this._ast)
			this._source = code
			callback(err)
		})
	}
	doBuild(compilation, callback) {
		this.getSource(compilation, (err, source)=> {
			this._source = source
			callback()
		})
	}
	getSource(compilation, callback) {
		compilation.inputFileSystem.readFile(this.resource, 'utf8', callback)

	}

}
module.exports = NormalModule