const {readFileSync} = require('node:fs');
const path = require('node:path');
const imageminPngquant = require('./cjs/node_modules/imagemin-pngquant/index.js').default;
const imageminWebp = require('./cjs/node_modules/imagemin-webp/index.js').default;
const Vinyl = require('vinyl');
const test = require('ava');
const gulpImagemin = require('./cjs/index.js').default;
let {mozjpeg, svgo} = require('./cjs/index.js');

const createFixture = async (plugins = null, file = 'fixture.png') => {
	const buffer = readFileSync(path.join(__dirname, file));
	const stream = gulpImagemin(plugins);

	stream.end(new Vinyl({
		path: path.join(__dirname, file),
		contents: buffer,
	}));

	return {buffer, stream};
};

test('minify images', async t => {
	const {buffer, stream} = await createFixture();
	const file = await stream.toArray();

	t.true(file[0].contents.length < buffer.length);
});

test('minify JPEG with custom settings', async t => {
	const mozjpegOptions = {
		quality: 30,
		progressive: false,
		smooth: 45,
	};
	mozjpeg = await mozjpeg;
	const {buffer, stream} = await createFixture([mozjpeg(mozjpegOptions)], 'fixture.jpg');
	const file = await stream.toArray();

	t.true(file[0].contents.length < buffer.length);
});

test('use custom plugins', async t => {
	const {stream} = await createFixture([imageminPngquant()]);
	const {stream: compareStream} = await createFixture();
	const file = await stream.toArray();
	const compareFile = await compareStream.toArray();

	t.true(file[0].contents.length < compareFile[0].contents.length);
});

test('use webp plugin', async t => {
	const {stream} = await createFixture([imageminWebp({quality: 50})], 'fixture.webp');
	const {stream: compareStream} = await createFixture(null, 'fixture.webp');
	const file = await stream.toArray();
	const compareFile = await compareStream.toArray();

	t.true(file[0].contents.length < compareFile[0].contents.length);
});

test('use custom svgo settings', async t => {
	const svgoOptions = {
		js2svg: {
			indent: 2,
			pretty: true,
		},
	};
	svgo = await svgo;
	const {stream} = await createFixture([svgo(svgoOptions)], 'fixture-svg-logo.svg');
	const {stream: compareStream} = await createFixture(null, 'fixture-svg-logo.svg');
	const file = await stream.toArray();
	const compareFile = await compareStream.toArray();

	t.true(file[0].contents.length > compareFile[0].contents.length);
});

test('skip unsupported images', async t => {
	const stream = gulpImagemin();
	stream.end(new Vinyl({path: path.join(__dirname, 'fixture.bmp')}));
	const file = await stream.toArray();

	t.is(file[0].contents, null);
});
