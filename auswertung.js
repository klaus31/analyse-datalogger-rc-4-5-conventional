var fs = require('fs')

function usageAndExit() {
  console.info('node auswertung.js directory');
  process.exit(1);
}

if(process.argv.length != 3) usageAndExit();

var BASEDIR = process.argv[2] + '/';

var result = {
  datum: false,
  temperatur: false
}

var createMessung = function (dataline) {
  var messwerte = dataline.trim().split(/[\t ]+/)
  if(!messwerte) {
    return {};
  }
  var messung = {
    id: messwerte[0] - 0,
    datum: {
      value: new Date(Date.parse(messwerte[1] + ' ' + messwerte[2])),
      day: messwerte[1],
      time: messwerte[2]
    },
    temperatur: messwerte[3] - 0
  }
  return messung
}

var ausgabe = function (result) {
  var handlebars = require('handlebars')
  fs.readFile(__dirname + '/auswertung.tpl', 'utf8', function (err, source) {
    var template = handlebars.compile(source)
    console.info(template(result))
  })
}

var auswertung = function (err, data) {
  var datalines = data.split('\r\n')
  var i = datalines.length
  var temperaturen = []
  var messungen = []
  while(i--) {
    var messung = createMessung(datalines[i])
    if (!messung.id) {
      continue
    }
    // array sammeln
    messungen.push(messung)
    temperaturen.push(messung.temperatur)
    // messraum
    if (result.datum) {
      if (result.datum.von.value > messung.datum.value) {
        result.datum.von = messung.datum
      }
      if (result.datum.bis.value < messung.datum.value) {
        result.datum.bis = messung.datum
      }
    } else {
      result.datum = {
        von: messung.datum,
        bis: messung.datum
      }
    }
    // temperatur von bis
    if (result.temperatur) {
      if (result.temperatur.min.temperatur > messung.temperatur) {
        result.temperatur.min = messung
      }
      if (result.temperatur.max.temperatur < messung.temperatur) {
        result.temperatur.max = messung
      }
    } else {
      result.temperatur = {
        max: messung,
        min: messung
      }
    }
  }
  // ermittle lueftungen
  messungen.sort(function (m1, m2) {
    return m1.datum.value < m2.datum.value ? -1 : 1
  })
  result.tageBetrachtet = (result.datum.bis.value - result.datum.von.value) / (1000 * 60 * 60 * 24)
  // ergebnis aufbereiten
  // ø
  result.temperatur.avg = temperaturen.reduce(function (a, b) { return a + b; }) / temperaturen.length
  result.messungen = messungen
  ausgabe(result)
}

fs.readdir(BASEDIR, function (err, filenames) {
  if (err) throw err
  var i = 0
  while(i++ < filenames.length) {
    var filename = filenames[i];
    if (filename && filename.match(/^.+\.txt$/)) {
      fs.readFile(BASEDIR + filename, 'utf8', auswertung)
    }
  }
})
