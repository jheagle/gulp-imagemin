const {cpSync, readFileSync, writeFileSync} = require('node:fs');
const {makeCommon} = require('common-exports');

const streamToPromise = stream => new Promise((resolve, reject) => {
	stream.on('finish', resolve);
	stream.on('error', reject);
});

const convertCommon = async () => {
	await streamToPromise(makeCommon(
		'./index.mjs',
		'cjs',
		{
			copyResources: {
				'node_modules/mozjpeg/index.js': [
					{
						src: 'node_modules/mozjpeg/package.json',
						dest: 'cjs/node_modules/mozjpeg/package.json',
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
	));
};

exports.convertCommon = convertCommon;

// Imagemin-pngquant's own index.js is already plain CommonJS (no import/export at all) - common-exports@1.3.12+
// detects this and copies its whole containing directory wholesale (its own private node_modules included, e.g.
// its nested is-stream) automatically, matching how an already-CommonJS sibling is already handled elsewhere.
const convertPngquant = async () => {
	await streamToPromise(makeCommon('./node_modules/imagemin-pngquant/index.js', 'cjs/node_modules/imagemin-pngquant', {}));
	// Pngquant-bin isn't nested inside imagemin-pngquant's own node_modules, so it isn't reachable by that
	// wholesale copy - it still needs to be copied and have its own "type": "module" patched by hand, same as
	// mozjpeg/cwebp-bin's vendor binaries above/below.
	const pngquantBinaryDestination = 'cjs/node_modules/imagemin-pngquant/node_modules/pngquant-bin';
	cpSync('./node_modules/pngquant-bin', pngquantBinaryDestination, {recursive: true});
	const packagePath = `${pngquantBinaryDestination}/package.json`;
	writeFileSync(packagePath, readFileSync(packagePath).toString().replace('\n\t"type": "module",', ''));
};

exports.convertPngquant = convertPngquant;

const convertWebp = async () => {
	await streamToPromise(makeCommon(
		'./node_modules/imagemin-webp/index.js',
		'cjs/node_modules/imagemin-webp',
		{
			// Cwebp-bin (a sibling ESM package discovered and individually converted from imagemin-webp's own
			// import) reads its own package.json at runtime (for its download-URL version) and expects a vendor/
			// directory holding the actual cwebp binary next to it - neither is JS, so common-exports' conversion
			// never copies them on its own. Same pattern as mozjpeg above.
			copyResources: {
				'node_modules/cwebp-bin/index.js': [
					{
						src: 'node_modules/cwebp-bin/package.json',
						dest: 'cjs/node_modules/imagemin-webp/node_modules/cwebp-bin/package.json',
					},
					{
						src: 'node_modules/cwebp-bin/vendor',
						dest: 'cjs/node_modules/imagemin-webp/node_modules/cwebp-bin/vendor',
					},
				],
			},
		},
	));
};

exports.convertWebp = convertWebp;

const convertPlugins = () => Promise.all([convertPngquant(), convertWebp()]);

exports.convertPlugins = convertPlugins;
