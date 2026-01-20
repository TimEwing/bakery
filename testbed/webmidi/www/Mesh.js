class Mesh {
    constructor(dataCallback, onPeerConnection, logFunc) {
        this.dataCallback = dataCallback;
        this.onOpenConnection = onPeerConnection;
        this.logFunc = logFunc;

        this.peer = null;
        this.connections = {}; 
        this._reconnectTimer = null;
        this._isZombie = false; // Track zombie state to avoid duplicate logs
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
        if (this.peer) this.peer.destroy();

        this.peer = new Peer({
            host: window.location.hostname,
            port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
            path: '/peerjs/mesh-signaling',
            secure: window.location.protocol === 'https:',
            debug: 1, // Reduced debug level to avoid console noise
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
            this._isZombie = false; 

            if (this._reconnectTimer) {
                clearTimeout(this._reconnectTimer);
                this._reconnectTimer = null;
            }
            this.requestServerPeerList();
        });

        this.peer.on('connection', (conn) => this.registerConnection(conn));

        this.peer.on('disconnected', () => {
            this.enterZombieMode('disconnected');
        });

        this.peer.on('error', (err) => {
            if (err.type === 'peer-unavailable') return; 
            
            // If the network drops, PeerJS might throw 'network' before 'disconnected'
            if (['network', 'socket-closed', 'server-error'].includes(err.type)) {
                this.enterZombieMode(err.type);
                return;
            }

            this.logFunc(`Peer Error: ${err.type}`);
        });
    }

    enterZombieMode(reason) {
        if (this._isZombie) return;
        
        this._isZombie = true;
        this.logFunc(`Signaling lost (${reason}). Mesh running in 'Zombie' mode.`);
        
        // CRITICAL FIX: Explicitly disconnect to reset PeerJS internal state
        // This allows .reconnect() to work without throwing the 'not disconnected' error
        if (!this.peer.disconnected) {
            this.peer.disconnect();
        }

        this.attemptReconnect();
    }

    attemptReconnect() {
        if (!this.peer || this.peer.destroyed) {
            this.init(); 
            return;
        }

        if (this._reconnectTimer) return;

        // Perform the reconnection
        try {
            this.logFunc("Attempting to reconnect to signaling...");
            this.peer.reconnect();
        } catch (e) {
            console.error("Reconnection call failed:", e);
        }

        // Retry loop
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            if (this.peer.disconnected) {
                this.attemptReconnect();
            }
        }, 5000);
    }

    // --- Connection Management ---

    connectToPeer(targetId) {
        if (!targetId || this.connections[targetId] || targetId === this.peer.id) return;
        
        if (this.peer.disconnected) {
            // We can't connect to NEW people, but we are still alive
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
            this.broadcastPeerList();
            this.onOpenConnection(conn.peer);
        });

        conn.on('data', (msg) => this.handleIncomingData(conn.peer, msg));

        conn.on('close', () => {
            this.logFunc(`Peer Left: ${conn.peer}`);
            delete this.connections[conn.peer];
        });

        conn.on('error', (err) => {
            this.logFunc(`Connection Error (${conn.peer}): ${err}`);
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
            // Server down - silence is golden here as we have Zombie mode logs
        }
    }

    handleIncomingData(senderId, msg) {
        const { type, data } = msg;

        switch (type) {
            case 'PEER_LIST':
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