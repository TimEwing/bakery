const express = require('express');
const path = require('path');
const http = require('http');
const { ExpressPeerServer } = require('peer');

const app = express();
const server = http.createServer(app);

const PORT = 3000;

// PeerJS server setup for WebRTC signaling
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/mesh-signaling'
});
app.use('/peerjs', peerServer);

app.use(express.json());
// Serve static files from the www directory
app.use(express.static(path.join(__dirname, 'www')));

// In-memory store for active peer IDs
let activePeers = new Set();

// Endpoint for clients to register their ID and get the current list
app.post('/announce', (req, res) => {
    // const { peerId } = req.body;
    
    // if (peerId) {
    //     if (!activePeers[peerId]) {
    //         console.log(`New peer announced: ${peerId}. Total: ${Object.keys(activePeers).length + 1}`);
    //     }
    //     activePeers[peerId] = Date.now();
    // }

    // // Send back all peers
    // const list = Object.keys(activePeers);
    // res.json({ peers: list });
    res.json({});
});

app.get('/peers', (req, res) => {
    console.log(`Peer list requested. Total: ${activePeers.size}`);
    res.json({ type: 'PEER_LIST', data: Array.from(activePeers) });
});

// // Cleanup old peers periodically
// setInterval(() => {
//     const now = Date.now();
//     for (const [peerId, timestamp] of Object.entries(activePeers)) {
//         if (now - timestamp > MAX_PEER_AGE) {
//             delete activePeers[peerId];
//             console.log(`Peer removed due to inactivity: ${peerId}. Total: ${Object.keys(activePeers).length}`);
//         }
//     }
// }, MAX_PEER_AGE);

peerServer.on('connection', (client) => {
    const id = client.getId();
    activePeers.add(id);
    console.log(`Peer connected to signaling server: ${id}. Total: ${activePeers.size}`);
});

peerServer.on('disconnect', (client) => {
    const id = client.getId();
    activePeers.delete(id);
    console.log(`Peer disconnected from signaling server: ${id}`);
});

// app.listen(PORT, () => {
//     console.log(`WebMidi Server running at http://localhost:${PORT}`);
// });

server.listen(PORT, () => {
    console.log(`WebMidi Server running at http://localhost:${PORT}`);
});