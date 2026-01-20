const express = require('express');
const path = require('path');
const http = require('http');
const { ExpressPeerServer } = require('peer');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// --- PeerJS Signaling ---
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/mesh-signaling'
});

app.use('/peerjs', peerServer);

// --- Static Files ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'www')));

// --- Peer Tracking ---
// We use the PeerServer events to keep track of who is online
const activePeers = new Set();

peerServer.on('connection', (client) => {
    const id = client.getId();
    activePeers.add(id);
    console.log(`+ Peer connected: ${id}. Total: ${activePeers.size}`);
});

peerServer.on('disconnect', (client) => {
    const id = client.getId();
    activePeers.delete(id);
    console.log(`- Peer disconnected: ${id}. Total: ${activePeers.size}`);
});

// --- API ---
app.get('/peers', (req, res) => {
    // Return list in the same format as a P2P "PEER_LIST" message
    res.json({ 
        type: 'PEER_LIST', 
        data: Array.from(activePeers) 
    });
});

server.listen(PORT, () => {
    console.log(`WebMidi Server running at http://localhost:${PORT}`);
});