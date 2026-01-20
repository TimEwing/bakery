/**
 * CONFIG & STATE
 */
const CONFIG = {
    FPS: 30,
    // CELL_SIZE: 40,
    BG_COLOR: "#0a0a0c",
    ACCENT_RGB: "0, 255, 157" // Matches CSS --accent
};

let midiState = {};
let peer = null;
let connections = {};

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const logEl = document.getElementById("log-output");

/**
 * INITIALIZATION
 */
function init() {
    // Responsive Canvas sizing
    const size = Math.min(window.innerWidth - 350, window.innerHeight - 100, 800);
    canvas.width = canvas.height = size;

    setupPeer();
    setupMidi();
    animate();
}

/**
 * LOGGING & UTILS
 */
const systemLog = (msg) => {
    logEl.textContent += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
    logEl.scrollTop = logEl.scrollHeight;
};

let copyPeerId = () => null === peer ? null : navigator.clipboard.writeText(peer.id);

/**
 * BACKEND PEER_ANNOUNCE LOGIC
 */
async function announceToServer() {
    if (!peer || !peer.id) return;
    
    try {
        const response = await fetch('/announce', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ peerId: peer.id })
        });
        const data = await response.json();
        
        // Connect to returned peers
        data.peers.forEach(id => {
            if (id !== peer.id && !connections[id]) {
                systemLog(`Discovered peer from server: ${id}, connecting...`);
                connectToPeer(id);
            }
        });
    } catch (error) {
        systemLog(`Error announcing to server: ${error}`);
    }
}

/**
 * WEBRTC MESH LOGIC
 */
function setupPeer() {
    peer = new Peer();

    peer.on('open', id => {
        document.getElementById("my-id").textContent = id;
        systemLog(`My Peer ID: ${id}`);
        
        // Announce to server every 10 seconds
        announceToServer();
        setInterval(announceToServer, 10000);
    });

    peer.on('connection', (incomingConn) => {
        registerConnection(incomingConn);
    });
}

function connectToPeer(targetId = null) {
    const remoteId = targetId || document.getElementById("peer-id-input").value;
    if (!remoteId || connections[remoteId] || remoteId === peer.id) return;
    
    const newConn = peer.connect(remoteId);
    registerConnection(newConn);
}

function registerConnection(conn) {
    systemLog(`Connecting to: ${conn.peer}...`);

    conn.on('open', () => {
        systemLog(`Connected to: ${conn.peer}`);
        connections[conn.peer] = conn;
        connections[conn.peer].reconnects = 0;
        
        // Send current full state
        conn.send({ type: 'FULL_STATE', data: midiState });
        
        // Share peer connections (mesh)
        const peerList = Object.keys(connections).concat([peer.id]);
        conn.send({ type: 'PEER_LIST', data: peerList });
    });

    conn.on('data', (payload) => {
        handleIncomingData(payload, conn.peer);
    });
    
    conn.on('close', () => {
        systemLog(`Connection closed: ${conn.peer}`);
        delete connections[conn.peer];
    });
    
    conn.on('error', (err) => {
        systemLog(`Connection error with ${conn.peer}: ${err}`);
        delete connections[conn.peer];
    });
}

function handleIncomingData(payload, senderId) {
    switch (payload.type) {
        case 'UPDATE':
            midiState[payload.note] = payload.velocity;
            break;
        case 'FULL_STATE':
            Object.assign(midiState, payload.data);
            break;
        case 'PEER_LIST':
            systemLog(`Received peer list from ${senderId}: ${payload.data.join(", ")}`);
            payload.data.forEach(id => {
                if (id !== peer.id && !connections[id]) {
                    systemLog(`Discovered peer: ${id}, connecting...`);
                    connectToPeer(id);
                }
            });
            break;
        default:
            systemLog(`Unknown payload type: ${payload.type} from ${senderId}`);
    }
}

/**
 * BROADCAST LOGIC
 */
function broadcast(payload) {
    Object.values(connections).forEach(conn => {
        if (conn.open) {
            conn.send(payload);
        }
    });
}

/**
 * MIDI LOGIC
 */
function setupMidi() {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(
            access => {
                systemLog("MIDI Access Granted.");
                access.inputs.forEach(input => {
                    input.onmidimessage = handleMidiMessage;
                });
            },
            () => systemLog("MIDI Access Denied.")
        );
    }
}

function handleMidiMessage(msg) {
    const [command, note, velocity] = msg.data;

    // We specifically look for Control Change (176)
    if (command === 176) {
        midiState[note] = velocity;

        // Sync to peers
        broadcast({ type: 'UPDATE', note, velocity });
    }
}

/**
 * RENDERING
 */
function draw() {
    // Clear
    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sortedNotes = Object.keys(midiState).sort((a, b) => a - b);
    // const cols = Math.floor(canvas.width / CONFIG.CELL_SIZE);
    const cols = 8;
    const cell_size = canvas.width / cols;

    sortedNotes.forEach((note, index) => {
        const x = (index % cols) * cell_size;
        const y = Math.floor(index / cols) * cell_size;
        const val = midiState[note] / 127; // Normalized 0-1

        ctx.fillStyle = `rgba(${CONFIG.ACCENT_RGB}, ${val})`;
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        
        ctx.fillRect(x + 2, y + 2, cell_size - 4, cell_size - 4);
        ctx.strokeRect(x + 2, y + 2, cell_size - 4, cell_size - 4);
        
        // Note Label inside cell
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = `${cell_size / 5}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(note, x + cell_size / 2, y + cell_size / 2 + cell_size / 10);
    });
}

function animate() {
    draw();
    requestAnimationFrame(animate);
}

window.addEventListener('load', init);

// API Gererator curry function
// const Message = (myId, 

// class Mesh {
//     constructor(dataCallback, logFunc, maxAgeMs = 30000) {
//         this.dataCallback = dataCallback;   // Function to handle incoming data
//         this.logFunc = logFunc;             // Logging function
//         this.maxAgeMs = maxAgeMs;           // Max age for peer connections
//         this.peer = null;                   // PeerJS Peer instance
//         this.connections = {};              // Active connections (peerId -> {conn, peers, lastHeartbeat})
        
//         this.announceInterval = null;      // Interval ID for announcing to server
//     }
    
//     ready() {
//         return this.peer && this.peer.id;
//     }
    
//     peerId() {
//         return this.peer ? this.peer.id : null;
//     }
    
//     numConnections() {
//         return Object.keys(this.connections).length;
//     }
    
//     // Initialize PeerJS and setup event handlers
//     init() {
//         this.close();
//         this.peer = new Peer();

//         // New remote peer connection
//         this.peer.on('open', id => {
//             this.logFunc(`My Peer ID: ${id}`);
            
//             // Announce to server every 10 seconds
//             if (this.announceInterval) clearInterval(this.announceInterval);
//             this.announceToServer();
//             this.announceInterval = setInterval(() => this.announceToServer(), 10000);
//         });

//         this.peer.on('close', () => {
//             this.logFunc(`Peer connection closed (Self).`);
//             this.close();
//             this.init();
//         });
        
//         this.peer.on('disconnected', () => {
//             this.logFunc(`Peer disconnected (Self).`);
//             this.reconnect();
//         });
        
//         this.peer.on('error', (err) => {
//             this.logFunc(`Peer error: ${err}`);
//             // switch (err.type) {
//             //     case 'network':
//             //     case 'disconnected':
//             //     cose 'socket-closed'
//             this.close();
//             this.init();
//             //         break;
//             //     default:
//             //         break;
//             // }
//         });

//         // Incoming remote peer connection
//         this.peer.on('connection',
//             incomingConn => this.registerConnection(incomingConn)
//         );
//     }
    
//     close() {
//         // Close all connections
//         Object.keys(this.connections).forEach(
//             peerId => this.closePeerConnection(peerId)
//         );
//         if (this.peer) {
//             this.peer.destroy();
//             this.peer = null;
//         }
//         if (this.announceInterval) {
//             clearInterval(this.announceInterval);
//             this.announceInterval = null;
//         }
//     }
    
//     // peerValid(peerId) {
//     //     return peerId && this.connections[peerId] !== undefined;
//     // }
    
//     // peerConnected(peerId) {
//     //     return this.peerValid(peerId) && this.connections[peerId].
    
//     connectToPeer(targetId) {
//         if (!targetId || this.connections[targetId] || targetId === this.peer.id) return;
//         this.logFunc(`Connecting to peer: ${targetId}...`);
//         const newConn = this.peer.connect(targetId);
//         this.registerConnection(newConn);
//     }
    
//     // reconnectPeerConnection(peerId) {
//     //     this.logFunc(`Reconnecting to peer: ${peerId}...`);
//     //     if (this.connections[peerId]) {
//     //         this.connections[peerId].reconnect();
//     //     } else {
//     //         this.connectToPeer(peerId);
//     //     }
        
//     closePeerConnection(peerId) {
//         if (this.connections[peerId] && this.connections[peerId].conn) {
//             this.connections[peerId].conn.close();
//             this.connections[peerId].conn.destroy();
//             this.connections[peerId].conn = null;
//         }
//     }
    
//     deletePeerConnection(peerId) {
//         this.closePeerConnection(peerId);
//         delete this.connections[peerId];
//     }
    
//     registerConnection(conn) {
//         conn.on('open', () => {
//             this.logFunc(`Connected to: ${conn.peer}`);
//             this.connections[conn.peer] = {
//                 conn: conn,
//                 peers: [],
//                 lastHeartbeat: Date.now(),
//             };
//         });
        
//         conn.on('data', (payload) => {
//             this.connections[conn.peer].lastHeartbeat = Date.now();
//             this.dataCallback(conn.peer, payload);
//         });
        
//         conn.on('disconnected', () => {
//             this.logFunc(`Connection disconnected: ${conn.peer}`);
//             // Attempt to reconnect
//             conn.reconnect();
//         });
        
//         conn.on('close', () => {
//             this.logFunc(`Connection closed: ${conn.peer}`);
//             this.deletePeerConnection(conn.peer);
//         });
        
//         conn.on('error', (err) => {
//             this.logFunc(`Connection error with ${conn.peer}: ${err}`);
//             this.deletePeerConnection(conn.peer);
//         });
//     }
    
//     // handleIncomingData(senderId, payload) {
//     //     this.connections[senderId].lastHeartbeat = Date.now();
//     //     this.dataCallback(senderId, payload);
//     // }
// }



// const _MeshAPI = (dataCallback) => {


//     // Message factory and parser
//     return ({
//         create: (id) => ({
//             data: (payload) => ({
//                 src: id,
//                 type: "DATA",
//                 data: payload,
//             }),
//             heartbeat: () => ({
//                 src: id,
//                 type: "HEARTBEAT",
//                 data: null,
//             }),
//             peerList: (peers) => ({
//                 src: id,
//                 type: "PEER_LIST",
//                 data: peers,
//             }),
//         }),
//         parse: ({ src, type, data }) => {
//             switch (type) {
//                 case "DATA":
//                     return dataCallback(src, data);
//                 case "HEARTBEAT":
//                     return;
//                 case "PEER_LIST":
//                     return;
//                 default:
//                     console.warn(`Unknown message type: ${type} from ${src}`);
//             }
//         },
//     });
// };

// const Message = ({
//     create: (id) => ({
//         data: (payload) => ({
//             src: id,
//             type: "DATA",
//             data: payload,
//         }),
//         heartbeat: () => ({
//             src: id,
//             type: "HEARTBEAT",
//             data: null,
//         }),
//         peerList: (peers) => ({
//             src: id,
//             type: "PEER_LIST",
//             data: peers,
//         }),
//     }),
//     parse: ({ src, type, data }) => {
//         switch (type) {
//             case "DATA":
//                 return handleIncomingData(src, data);
//             case "HEARTBEAT":
//                 return;
//             case "PEER_LIST":
//                 return;
//             default:
//                 console.warn(`Unknown message type: ${type} from ${src}`);
//         }
//     },
// });

// Message.create(peer.id).data({ note: 60, velocity: 127 });
// Message.create(peer.id).heartbeat();
// Message.create(peer.id).peerList(['peer1', 'peer2']);

// {
//     src: peer.id,
// }