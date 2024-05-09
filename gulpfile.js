const {makeCommon} = require('common-exports');

const convertCommon = () => makeCommon(
	'./index.mjs',
	'cjs',
	{
		copyResources: {
			'node_modules/mozjpeg/index.js': [
				{
					src: 'node_modules/mozjpeg/package.json',
					dest: 'cjs/node_modules/mozjpeg/package.json',
					updateContent: content => content.replace('\n\t"type": "module",', ''),
				},
				{
					src: 'node_modules/mozjpeg/vendor',
					dest: 'cjs/node_modules/mozjpeg/vendor',
				},
			],
		},
		customChanges: {
			'./index.mjs': [
				{
					updateContent: content => content.replace(
						'export const gifsicle = await exposePlugin(\'gifsicle\');\n'
						+ 'export const mozjpeg = await exposePlugin(\'mozjpeg\');\n'
						+ 'export const optipng = await exposePlugin(\'optipng\');\n'
						+ 'export const svgo = await exposePlugin(\'svgo\');',
						'export const gifsicle = exposePlugin(\'gifsicle\');\n'
						+ 'export const mozjpeg = exposePlugin(\'mozjpeg\');\n'
						+ 'export const optipng = exposePlugin(\'optipng\');\n'
						+ 'export const svgo = exposePlugin(\'svgo\');',
					),
				},
			],
		},
	},
);

exports.convertCommon = convertCommon;
