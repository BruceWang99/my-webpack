class Chunk {
	constructor(entryModule) {
		this.entryModule = entryModule
		this.name = entryModule.name
		this.files = [] // 
		this.modules = [] // 所有模块

	}
}
module.exports = Chunk