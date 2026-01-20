const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const MAX_PEER_AGE = 1000 * 30; // 30 seconds

app.use(express.json());
// Serve static files from the www directory
app.use(express.static(path.join(__dirname, 'www')));

// In-memory store for active peer IDs
let activePeers = {};

// Endpoint for clients to register their ID and get the current list
app.post('/announce', (req, res) => {
    const { peerId } = req.body;
    
    if (peerId) {
        if (!activePeers[peerId]) {
            console.log(`New peer announced: ${peerId}. Total: ${Object.keys(activePeers).length + 1}`);
        }
        activePeers[peerId] = Date.now();
    }

    // Send back all peers
    const list = Object.keys(activePeers);
    res.json({ peers: list });
});

// Cleanup old peers periodically
setInterval(() => {
    const now = Date.now();
    for (const [peerId, timestamp] of Object.entries(activePeers)) {
        if (now - timestamp > MAX_PEER_AGE) {
            delete activePeers[peerId];
            console.log(`Peer removed due to inactivity: ${peerId}. Total: ${Object.keys(activePeers).length}`);
        }
    }
}, MAX_PEER_AGE);

app.listen(PORT, () => {
    console.log(`WebMidi Server running at http://localhost:${PORT}`);
});