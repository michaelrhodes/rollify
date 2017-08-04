#!/usr/bin/env node

var rollup = require('rollup')
var concat = require('simple-concat')
var convert = require('./convert')

var name = process.argv[2]

concat(process.stdin, function (err, src) {
  if (err) console.error(err), process.exit(1)

  rollup.rollup({
    entry: convert(src, name),
    onwarn: function () {}
  })
  .then(function (bundle) {
    var result = bundle.generate({
      moduleName: name,
      format: 'iife',
      useStrict: false
    })

    process.stdout.write(result.code)
  }, console.error)
})
