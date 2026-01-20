class Mesh {
    constructor(dataCallback, onPeerConnection, logFunc) {
        this.dataCallback = dataCallback;
        this.onOpenConnection = onPeerConnection;
        this.logFunc = logFunc;

        this.peer = null;
        this.connections = {}; 
        this._reconnectTimer = null;
    }

    ready() {
        return this.peer && !this.peer.destroyed;
    }

    peerId() {
        return this.peer ? this.peer.id : null;
    }

    numConnections() {
        return Object.keys(this.connections).length;
    }

    // --- Initialization ---

    init() {
        // Only destroy if we are truly starting fresh (e.g. page load)
        if (this.peer) this.peer.destroy();

        this.peer = new Peer({
            host: window.location.hostname,
            port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
            path: '/peerjs/mesh-signaling',
            secure: window.location.protocol === 'https:',
            debug: 1,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        this.setupPeerEvents();
    }

    setupPeerEvents() {
        this.peer.on('open', (id) => {
            this.logFunc(`My Peer ID: ${id}`);
            // If we were retrying, stop the loop
            if (this._reconnectTimer) {
                clearTimeout(this._reconnectTimer);
                this._reconnectTimer = null;
            }
            this.requestServerPeerList();
        });

        this.peer.on('connection', (conn) => this.registerConnection(conn));

        this.peer.on('disconnected', () => {
            this.logFunc("Signaling lost. Mesh running in 'Zombie' mode.");
            this.attemptReconnect();
        });

        this.peer.on('error', (err) => {
            if (err.type === 'peer-unavailable') return; // Benign
            
            this.logFunc(`Peer error: ${err.type}`);

            // Only fatal errors should trigger a full destruction
            if (err.type === 'browser-incompatible') {
                this.logFunc("Fatal: Browser incompatible.");
            } else if (err.type === 'network' || err.type === 'socket-closed') {
                // These are usually temporary
                this.attemptReconnect();
            }
        });
    }

    attemptReconnect() {
        // If already destroyed, we can't reconnect. We must init.
        if (this.peer.destroyed) {
            this.init();
            return;
        }

        // Avoid multiple timers
        if (this._reconnectTimer) return;

        this.logFunc("Attempting to reconnect to signaling...");
        this.peer.reconnect();

        // If reconnect fails immediately or times out, try again in 5s
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            if (this.peer.disconnected && !this.peer.destroyed) {
                this.attemptReconnect();
            }
        }, 5000);
    }

    // --- Connection Management ---

    connectToPeer(targetId) {
        if (!targetId || this.connections[targetId] || targetId === this.peer.id) return;
        
        // We can only initiate NEW connections if we have signaling
        if (this.peer.disconnected) {
            this.logFunc(`Cannot connect to ${targetId}: Signaling down.`);
            return;
        }

        const conn = this.peer.connect(targetId);
        if (conn) {
            this.registerConnection(conn);
        }
    }

    registerConnection(conn) {
        conn.on('open', () => {
            this.connections[conn.peer] = { conn };
            this.logFunc(`Connected to: ${conn.peer}`);

            // Gossip: Share known peers to help build mesh without server
            this.broadcastPeerList();
            this.onOpenConnection(conn.peer);
        });

        conn.on('data', (msg) => this.handleIncomingData(conn.peer, msg));

        conn.on('close', () => {
            this.logFunc(`Connection closed: ${conn.peer}`);
            delete this.connections[conn.peer];
        });

        conn.on('error', (err) => {
            this.logFunc(`Conn error ${conn.peer}: ${err}`);
            delete this.connections[conn.peer];
        });
    }

    // --- Data Handling ---

    async requestServerPeerList() {
        if (!this.ready()) return;
        try {
            const response = await fetch('/peers');
            const msg = await response.json(); 
            if (msg.type === 'PEER_LIST') {
                this.handleIncomingData('SERVER', msg);
            }
        } catch (error) {
            // Server might be down, but that's okay for the Mesh
            // this.logFunc("Could not fetch peer list from server.");
        }
    }

    handleIncomingData(senderId, msg) {
        const { type, data } = msg;

        switch (type) {
            case 'PEER_LIST':
                // Auto-connect to new peers
                if (Array.isArray(data)) {
                    data.forEach(id => {
                        if (id !== this.peer.id && !this.connections[id]) {
                            this.connectToPeer(id);
                        }
                    });
                }
                break;
            case 'DATA':
                this.dataCallback(senderId, data);
                break;
        }
    }

    // --- Sending ---

    sendToPeer(peerId, payload) {
        const peer = this.connections[peerId];
        if (peer && peer.conn && peer.conn.open) {
            peer.conn.send({ type: 'DATA', data: payload });
        }
    }

    broadcast(payload) {
        const msg = { type: 'DATA', data: payload };
        Object.values(this.connections).forEach(({ conn }) => {
            if (conn && conn.open) conn.send(msg);
        });
    }

    broadcastPeerList() {
        const peerList = Object.keys(this.connections).concat([this.peer.id]);
        const msg = { type: 'PEER_LIST', data: peerList };
        Object.values(this.connections).forEach(({ conn }) => {
            if (conn && conn.open) conn.send(msg);
        });
    }
}