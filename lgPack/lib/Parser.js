const { Tapable } = require('tapable')
const babylon = require('babylon')

class Parser extends Tapable {
	parse(source) {
		return babylon.parse(source, {
			sourceType: 'module',
			plugins: ['dynamicImport'], // 支持import()动态导入语法
		})
	}
}

module.exports = Parser