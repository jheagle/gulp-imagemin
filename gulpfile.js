const {cpSync, readdirSync, readFileSync, writeFileSync} = require('node:fs');
const {makeCommon} = require('common-exports');

// Everything under cjs/ is meant to be pure CommonJS - that's the entire point of this fork. common-exports
// individually converts ESM siblings it discovers to proper CJS *content*, but when one of those siblings sits
// in the same private node_modules folder as an already-CommonJS package (e.g. cross-spawn, next to execa and
// its own dependency tree), that package's wholesale copy also carries along the ESM sibling's original,
// unconverted package.json (common-exports' conversion never touches package.json itself, only .js content) -
// leaving a mismatch where Node refuses to require() a file whose content is valid CJS because the nearest
// package.json still declares "type": "module". Sweep the whole output afterward and fix any that slipped
// through, rather than trying to enumerate every affected sibling by hand.
const stripEsmType = directory => {
	for (const entry of readdirSync(directory, {withFileTypes: true})) {
		const entryPath = `${directory}/${entry.name}`;
		if (entry.isDirectory()) {
			stripEsmType(entryPath);
			continue;
		}

		if (entry.name !== 'package.json') {
			continue;
		}

		const content = readFileSync(entryPath).toString();
		// Match the "type": "module" line with any indentation/trailing comma (some vendored packages use
		// spaces instead of tabs, or have it as the final property with no trailing comma) rather than relying
		// on one exact literal format.
		const updated = content.replace(/[ \t]*"type"\s*:\s*"module",?\r?\n/, '');
		if (updated !== content) {
			writeFileSync(entryPath, updated);
		}
	}
};

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
	));
	stripEsmType('cjs');
};

exports.convertCommon = convertCommon;

// Imagemin-pngquant's own index.js is already plain CommonJS (no import/export at all) - running it through
// makeCommon finds nothing to convert, so its own require('is-stream')/require('pngquant-bin') calls are left
// completely untouched instead of being resolved to a private, self-contained copy. That's fine as long as the
// real top-level node_modules happens to have compatible CJS versions of those packages, but fragile - it broke
// once is-stream itself went ESM-only. Copy it wholesale instead (matching how common-exports treats any
// already-CommonJS package) so it carries its own complete, private dependency tree (including its own nested
// is-stream) rather than depending on what the real environment happens to have installed.
const convertPngquant = async () => {
	cpSync('./node_modules/imagemin-pngquant', 'cjs/node_modules/imagemin-pngquant', {recursive: true});
	// Pngquant-bin isn't nested inside imagemin-pngquant's own node_modules, so it doesn't come along with the
	// copy above - and it's ESM ("type": "module"), so it needs the same package.json patch mozjpeg gets in
	// convertCommon.
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
						updateContent: content => content.replace('\n\t"type": "module",', ''),
					},
					{
						src: 'node_modules/cwebp-bin/vendor',
						dest: 'cjs/node_modules/imagemin-webp/node_modules/cwebp-bin/vendor',
					},
				],
			},
		},
	));
	stripEsmType('cjs/node_modules/imagemin-webp');
};

exports.convertWebp = convertWebp;

const convertPlugins = () => {
	convertPngquant();
	convertWebp();
};

exports.convertPlugins = convertPlugins;
