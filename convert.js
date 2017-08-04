var os = require('os')
var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var unpack = require('browser-unpack')
var keys = Object.keys

var impo = 'import {mod} from "{file}";'
var acce = 'var {name} = {mod}{call};'
var head = 'var module = { exports: {} }\nvar exports = module.exports;'
var foot = 'export default module.exports;'

var req = /(?:\s*(?:var|const)\s*(.*?)\s*=\s*)?require\(['"]?([^'"\)]+)['"]?(?:, ['"]([^'"]+)['"])?\)([^\n\r;$]*);?/gm
var mex = /\b(?:module\.)?exports\b/

module.exports = function (src) {
  var dir = path.join(os.tmpdir(), 'rollify_modules')
  mkdirp.sync(dir)

  var rows = unpack(src).sort(function (a, b) {
    return a.entry ? -1 : b.entry ? 1 : 0
  })

  var entry = rows[0]
  if (!entry.entry) throw new Error('No entry file found')

  var deps = {}
  rows.forEach(function (row) {
    var id = './' + row.id
    deps[id] = deps[id] || {}
    deps[id].source = row.source

    keys(row.deps).forEach(function (name) {
      var id = './' + row.deps[name]
      deps[id] = deps[id] || {}
      deps[id].name = (deps[id].name || []).concat(name)
    })
  })

  keys(deps).forEach(function (id) {
    var dep = deps[id]
    var source = rewrite(dep.source)
    var file = path.join(dir, id)
    fs.writeFileSync(file, source || 'export default ""')
  })

  return path.join(dir, './' + entry.id)

  function rewrite (source) {
    var src = source, rep = ''
    var s, name, mod, file, call

    // Convert import syntax from CJS to ES2015
    var i = 0, ls = 0, matches = source.match(req)
    while (s = req.exec(source)) {
      name = s[1] || ('$' + i), file = s[2], call = s[4]
      mod = call ? name + '$0' : name

      src = (src.slice(0, ls)) +
        (rep = (impo
          .replace('{mod}', mod)
          .replace('{file}', id(file))) +
        (call ? '\n' + acce
          .replace('{name}', name)
          .replace('{mod}', mod)
          .replace('{call}', call) : '') +
        (++i !== matches.length ? '\n' : '')) +
        (source.slice(s.index + s[0].length))

      ls += rep.length
    }

    return mex.test(src) ?
      [head, src, foot].join('\n') :
      src
  }

  function id (name) {
    return keys(deps).filter(function (id) {
      return deps[id].name && !!~deps[id].name.indexOf(name)
    })[0]
  }
}
