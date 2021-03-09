const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const rollup = require('rollup')
const uglify = require('uglify-js')
const babel = require('rollup-plugin-babel');
const typescript = require('rollup-plugin-typescript');
const resolve = require('rollup-plugin-node-resolve');

var version = process.argv[2];
if (!version) version = 'new';
if (!fs.existsSync('dist')) {
	fs.mkdirSync('dist')
}

var config = {
	input: `./src/index.ts`,
	output: {
		file: `./dist/v3.js`,
		format: 'umd',
		amd: {
			define: 'def'
		},
		banner: `
		/*
		  v3.js version ${version}
		  Build Time: ${new Date().toLocaleString()}
		*/
		      `,
		sourcemap: 'inline'
	},
	treeshake: false,
	plugins: [
		typescript({
			typescript: require('typescript')
		}),
		babel(),
		resolve()
	]
}

buildEntry(config);

function buildEntry (config) {
	const output = config.output;
	const { file, banner } = output;
	const isProd = true;
	return rollup.rollup(config)
		.then(bundle => bundle.generate(output))
		.then((res) => {
			let code = res.output[0].code;
			if (isProd) {
				var minified = (banner ? banner + '\n' : '') + uglify.minify(code, {
					parse: {},
					compress: {
						drop_console: false,
						hoist_funs: true,
						pure_getters: true,
						negate_iife: true,
						passes: 5,
						unsafe_math: true,
						unused: true
					},
					output: {
						beautify: false
					},
					ie8: true
				}).code
				return write(file, code, true)
			} else {
				return write(file, code)
			}
		})
}

function write (dest, code, zip) {
	return new Promise((resolve, reject) => {
		function report (extra) {
			console.log(blue(path.relative(process.cwd(), dest)) + ' ' + getSize(code) + (extra || ''))
			resolve()
		}

		fs.writeFile(dest, code, err => {
			if (err) return reject(err)
			if (zip) {
				zlib.gzip(code, (err, zipped) => {
					if (err) return reject(err)
					report(' (gzipped: ' + getSize(zipped) + ')')
				})
			} else {
				report()
			}
		})
	})
}

function getSize (code) {
	return (code.length / 1024).toFixed(2) + 'kb'
}

function blue (str) {
	return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
}