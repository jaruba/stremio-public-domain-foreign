const fs = require('fs')
const path = require('path')
const async = require('async')
const needle = require('needle')
const addonSDK = require('stremio-addon-sdk')

const manifest = {
    id: 'org.publicdomainforeign',
    version: '1.0.1',
    name: 'Public Domain Foreign Movies',
    description: 'Free Foreign Movies that are either in the Public Domain or have been made Free to Watch by their authors.',
    resources: ['stream', 'meta', 'catalog'],
    types: ['movie'],
    idPrefixes: ['pdfm_'],
    icon: 'https://law.duke.edu/sites/default/files/images/centers/cspd/pdd2019/1923_montage.jpg'
}

const movies = {}

const metas = {}

const tried = []

function clone(el) {
	return JSON.parse(JSON.stringify(el))
}

function getMeta(el, cb) {
	if (tried.indexOf(el.imdb) > -1) {
		cb(el)
		return
	}
	tried.push(el.imdb)
	needle.get('https://v3-cinemeta.strem.io/meta/movie/' + el.imdb + '.json', (err, resp, body) => {
		if (body && body.meta && body.meta.name) {

			const meta = body.meta

			meta.name = el.name

			if (el.trailers && el.trailers.length)
				meta.trailers = el.trailers

			meta.id = el.id

			if (meta.imdb_id)
				delete meta.imdb_id

			metas[el.imdb] = meta

			if (!meta.poster && el.poster)
				meta.poster = el.poster

			cb(meta)

		} else
			cb(el)
	})
}

function mergeWithMeta(el, cb) {
	if (el && el.imdb) {
		if (metas && metas[el.imdb])
			cb(metas[el.imdb])
		else
			getMeta(el, cb)
	} else
		cb(el)
}

function mergeWithMetas(els, cb) {
	const results = []
	const qu = async.queue((task, cb) => {
		mergeWithMeta(task, (el) => {
			results.push(el)
			cb()
		})
	}, 1)
	qu.drain = () => { cb(results) }
	els.forEach((el) => { qu.push(el) })
}

function sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase().replace('the ','')
}

function toTitleCase(str) {
	return str.replace(/\w\S*/g, (txt) => {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
	})
}

function init(dir) {
	const files = fs.readdirSync(dir)
	const catalogs = []
	files.forEach((file) => {
		if (!fs.statSync(path.join(dir, file)).isDirectory() && file.endsWith('.js')) {
			const tag = file.replace('.js', '')
			movies[tag] = require('./movies/' + file).map((el, ij) => {

				el.id = 'pdfm_' + tag + '_' + ij

				el.type = 'movie'

				if (el.streams && el.streams.length)
					el.streams.map(elm => { elm.name = 'PDFM'; return elm })

				if (!el.poster && el.imdb && process.env.OMDB_KEY)
					el.poster = 'http://img.omdbapi.com/?i=' + el.imdb + '&h=300&apikey=' + process.env.OMDB_KEY

				return el
			})
			catalogs.push({
				id: tag,
				name: toTitleCase(tag.split('-').join(' ')),
				type: 'movie',
				extraSupported: ['search']
			})
		}
	})
	manifest.catalogs = catalogs
	const addon = new addonSDK(manifest)

	addon.defineCatalogHandler((args, cb) => {
		if (args.type == 'movie' && args.id) {
			if (movies[args.id]) {
				if (args.extra && args.extra.search) {
					const results = []
					movies[args.id].forEach((el) => {
						if (sanitizeName(el.name).includes(sanitizeName(args.extra.search)))
							results.push(el)
					})
					cb(null, results.length ? { metas: results } : null)
				} else {
					mergeWithMetas(movies[args.id], merged => {
						cb(null, { metas: clone(merged).map(el => { if (el.releaseInfo) el.name = el.name + ' (' + el.releaseInfo + ')'; return el }) })
					})
				}
			} else
				cb(null, null)
		} else
			cb(null, null)
	})

	addon.defineMetaHandler((args, cb) => {
		if (args.id) {
			const tags = args.id.replace('pdfm_', '').split('_')
			if (movies[tags[0]] && movies[tags[0]][tags[1]]) {
				mergeWithMeta(movies[tags[0]][tags[1]], merged => {
					cb(null, { meta: merged })
				})
			} else
				cb(null, null)
		} else
			cb(null, null)
	})

	addon.defineStreamHandler((args, cb) => {
		if (args.id) {
			const tags = args.id.replace('pdfm_', '').split('_')
			if (movies[tags[0]] && movies[tags[0]][tags[1]] && movies[tags[0]][tags[1]].streams) {
				cb(null, { streams: movies[tags[0]][tags[1]].streams })
			} else
				cb(null, null)
		} else
			cb(null, null)
	})

	addon.runHTTPWithOptions({ port: 7000 })

	addon.publishToCentral("https://stremio-public-domain-foreign.now.sh/manifest.json")
}

init('./movies')
