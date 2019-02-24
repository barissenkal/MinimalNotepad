// @ts-check

const fs = require('fs');
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const TXT_CHANGE = "txt_change";

let offlineCache = null;

const port = parseInt(process.argv[2]) || 2999;

// Dirty/hack/quick way.
if (!fs.existsSync(__dirname + '/temp')) {
  fs.mkdirSync(__dirname + '/temp');
}

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
  loadOffline().then((offlineCache) => {
    socket.emit(TXT_CHANGE, offlineCache[TXT_CHANGE]);
    socket.on(TXT_CHANGE, function(msg) {
      saveToOffline(TXT_CHANGE, msg);
      socket.broadcast.emit(TXT_CHANGE, msg);
    });
  });
});

function saveToOffline(key, msg) {
  console.log('saveToOffline: ', msg);
  
  offlineCache[key] = msg;
  let date = new Date(msg.at);
  let rotatingMin = Math.floor((date.valueOf() % (10*60000)) / 60000); // rotates on 10
  let rotatingHour = date.getHours();
  let rotatingDay = date.getDate();

  let data = JSON.stringify(offlineCache);
  fs.writeFile(__dirname + '/temp/latest.json', data, ()=>{});
  fs.writeFile(__dirname + '/temp/rotating_min_' + rotatingMin + '.json', data, ()=>{});
  fs.writeFile(__dirname + '/temp/rotating_hour_' + rotatingHour + '.json', data, ()=>{});
  fs.writeFile(__dirname + '/temp/rotating_day_' + rotatingDay + '.json', data, ()=>{});
  
}
function loadOffline() {
  if (offlineCache == null) {
    return new Promise((resolve, reject) => {
      fs.readFile(__dirname + '/temp/latest.json', 'utf-8', (err, data) => {
        if (err && err.code !== 'ENOENT') { // Ignoring no file case.
          reject(err);
          return;
        }
        if (data == null) {
          offlineCache = {};
        } else {
          try {
            offlineCache = JSON.parse(data);
          } catch (error) {
            reject(error);
            return;
          } 
        }
        resolve(offlineCache);
      })
    });
  } else {
    return Promise.resolve(offlineCache);
  }
}

loadOffline().then(() => {
  http.listen(port, function() {
    console.log('listening on *:' + port);
  });
})
