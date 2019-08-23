const crypto = require("crypto")
const swarm = require('discovery-swarm')
const defaults = require('dat-swarm-defaults')
const getPort = require('get-port');

const myId = crypto.randomBytes(32);
console.log('myId: ', myId.toString('hex'));

const peers = {};
let connSeq = 0;
let registeredPeers = [];

const MessageType = {
  REQUEST_ALL_REGISTER_PEERS: 'REQUEST_ALL_REGISTER_PEERS',
  REGISTER_PEER: 'REQUEST_ALL_REGISTER_PEERS'
};

const sendMessage = (id, type, data) => {
  peers[id].conn.write(JSON.stringify(
    {
      to: id,
      from: myId,
      type: type,
      data: data
    }
  ));
};

const writeMessageToAllPeers = (type, data) => {
  for (let id in peers) {
    sendMessage(id, type, data);
  }
};

const registerMe = () => {
  setTimeout(() => {
    let me = myId.toString('hex');
    registeredPeers.push(me);
    writeMessageToAllPeers(MessageType.REGISTER_PEER, registeredPeers)
  }, 5000)
}

(async () => {
  const config = defaults({ id: myId });
  const swrm = swarm();
  const channel = "trk-123";
  const port = process.env.PORT || await getPort();
  console.log('Listening port: ' + port);

  swrm.listen(port);
  swrm.join(channel);

  // ME ADICIONO

  registerMe()

  swrm.on('connection', (conn, info) => {
    const seq = connSeq;
    const peerId = info.id.toString('hex');
    console.log(`Connected #${seq} to peer: ${peerId}`);

    if (info.initiator) {
      try {
        conn.setKeepAlive(true, 600);
      } catch (exception) {
        console.log('exception', exception);
      }
    }

    conn.on('close', () => {
      console.log(`Connection ${seq} closed, peerId: ${peerId}`);
      if (peers[peerId].seq === seq) {
        delete peers[peerId];
        console.log('--- registeredPeers: ' + JSON.stringify(registeredPeers));
        let index = registeredPeers.indexOf(peerId);
        if (index > -1) {
          registeredPeers.splice(index, 1);
        }
        console.log('--- registeredPeers end: ' + JSON.stringify(registeredPeers));
      }
    });

    conn.on('data', data => {
      let message = JSON.parse(data);
      console.log('\n----------- Received Message start -------------');
      console.log(
        'from: ' + peerId.toString('hex'),
        '\nto:   ' + peerId.toString(message.to),
        '\nmy:   ' + myId.toString('hex'),
        '\ntype: ' + JSON.stringify(message.type)
      );
      console.log('----------- Received Message end -------------\n');

      switch (message.type) {
        case MessageType.REGISTER_PEER:
          console.log('\nRegister Peer start');
          console.table({
            'Peer ID': message.to,
            'Message': JSON.stringify(message.data)
          })
          break;

        case MessageType.REQUEST_ALL_REGISTER_PEERS:
          console.log('\nRequest all registered peers ' + message.to);
          console.table({
            'Type': MessageType.REQUEST_ALL_REGISTER_PEERS,
            'Message': JSON.stringify(message.data)
          })

          writeMessageToAllPeers(MessageType.REGISTER_PEER, registeredPeers);
          registeredPeers = JSON.parse(JSON.stringify(message.data));
          break;
      }
    })

    if (!peers[peerId]) {
      peers[peerId] = {}
    }

    peers[peerId].conn = conn;
    peers[peerId].seq = seq;
    connSeq++
  })
})()


setTimeout(function () {
  writeMessageToAllPeers(MessageType.REQUEST_ALL_REGISTER_PEERS, { message: "========== PING ==========" });
}, 5000);

setTimeout(() => {
  console.log('Registered peers total', registeredPeers.length)
  console.log('Peers list: ', registeredPeers.length)
}, 1000)