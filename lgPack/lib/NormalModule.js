class NormalModule {
	constructor(data) {
		this.name = data.name
		this.entry = data.entry
		this.rawRequest = data.rawRequest
		this.parser = data.parser
		this.resource = data.resource
		this._source
		this._ast 
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