const swarm = require('discovery-swarm')
const port = 3444;
const sw = swarm()

sw.listen(port)

sw.join('trk-123') // can be any id/name/hash

sw.on('connection', function (connection) {
  console.log('found + connected to peer')
})
