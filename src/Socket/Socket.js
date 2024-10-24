import {SERVER} from "../constants.js";
import Message from "./Message.js";
import PendingRequest from "../PendingRequest.js";
import EventTarget from "../Events/EventTarget.js";
import SocketMessageEvent from "../Events/SocketMessageEvent.js";
import SocketStatusEvent from "../Events/SocketStatusEvent.js";
import WatchPartyStatus from "../WatchParty/WatchPartyStatus.js";
import Event from "../Events/Event.js";

export default class Socket extends EventTarget {
    /** @type {WebSocket} */ ws;
    /** @type {Map<string, PendingRequest>} */ pendingRequests = new Map();
    /** @type {boolean} */ reconnect = true;
    /** @type {?number} */ ping = null;
    /** @type {number} */ pingInterval = 0;

    /**
     * @returns {Promise<this>}
     */
    async connect(reconnect = false) {
        console.log('Connecting to DropoutHelper server', SERVER);
        this.reconnect = true;
        while (this.reconnect) {
            try {
                this.ws = await this.createConnection();
                break;
            } catch (e) {
                console.error('Failed to connect to DropoutHelper server, retrying in 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        if (!this.reconnect) {
            this.ws.close();
            return this;
        }
        console.log('Connected to DropoutHelper server');

        this.ws.addEventListener('error', () => {
            this.ws.close();
        });
        this.ws.addEventListener('close', () => {
            this.stopPinging();
            for (let pending of this.pendingRequests.values()) {
                pending.reject(new Error('Connection closed'));
            }
            this.pendingRequests.clear();

            if (this.reconnect) {
                console.error('Lost connection to DropoutHelper server, reconnecting in 2 seconds...');
                setTimeout(() => this.connect(true), 2000);
            }
        });
        this.ws.addEventListener('message', this.handleMessage.bind(this));

        this.dispatchEvent(new Event('connect'));
        if (reconnect) {
            this.dispatchEvent(new Event('reconnect'));
        }

        this.startPinging();
        return this;
    }

    /**
     * @returns {Promise<unknown>}
     */
    createConnection() {
        return new Promise((resolve, reject) => {
            let ws = new WebSocket(SERVER);
            let open = () => {
                ws.removeEventListener('error', error);
                ws.removeEventListener('open', open);
                resolve(ws);
            };
            let error = () => reject();
            ws.addEventListener('open', open);
            ws.addEventListener('error', error);
        });
    }

    /**
     * @returns {this}
     */
    close() {
        this.reconnect = false;
        try {
            this.ws.close();
        } catch (e) {
        }
        return this;
    }

    /**
     * @param {MessageEvent} event
     * @returns {Promise<void>}
     */
    async handleMessage(event) {
        let message = Message.parse(event.data);
        this.dispatchEvent(new SocketMessageEvent(message, this));

        if (message.getType() === 'status') {
            this.dispatchEvent(new SocketStatusEvent(Object.assign(new WatchPartyStatus(), message.getData()), this));
            return;
        }

        if (message.getType() !== 'response') {
            return;
        }

        let id = message.getId();
        let pending = this.pendingRequests.get(id);
        if (!pending) {
            console.error('Received response for unknown request', id);
            return;
        }

        this.pendingRequests.delete(id);

        let data = message.getData();
        if (data.error) {
            pending.reject(new Error(data.error));
            return;
        }

        pending.resolve(data.response);
    }

    /**
     * @returns {number}
     */
    getPing() {
        return this.ping ?? 0;
    }

    /**
     * @returns {this}
     */
    startPinging() {
        clearInterval(this.pingInterval);
        this.updatePing().catch(() => {
        });
        this.pingInterval = setInterval(() => this.updatePing(), 10000);
        return this;
    }

    /**
     * @returns {this}
     */
    stopPinging() {
        clearInterval(this.pingInterval);
        return this;
    }

    send(message) {
        this.ws.send(JSON.stringify(message));
    }

    /**
     * @param {Message} message
     * @returns {Promise<Object>}
     */
    request(message) {
        let waiting;
        let promise = new Promise((resolve, reject) => {
            waiting = new PendingRequest(resolve, reject);
        });

        try {
            this.send(message);
            this.pendingRequests.set(message.getId(), waiting);
        } catch (e) {
            waiting.reject(e);
        }

        return promise;
    }

    /**
     * @param {string} id
     * @param {?string} secret - Optional: if provided, the request will fail if the secret is invalid
     * @returns {Promise<WatchPartyStatus>}
     */
    async info(id, secret = null) {
        let res = await this.request(new Message('info', {id, secret}));
        return Object.assign(new WatchPartyStatus(), res);
    }

    /**
     * @param {string} id
     * @returns {Promise<void>}
     */
    async subscribe(id) {
        await this.request(new Message('subscribe', {id}));
    }

    /**
     * @param {string} id
     * @returns {Promise<void>}
     */
    async unsubscribe(id) {
        await this.request(new Message('unsubscribe', {id}));
    }

    /**
     * @param {WatchPartyStatus} status
     * @returns {Promise<WatchPartyStatus>}
     */
    async create(status) {
        let res = await this.request(new Message('create', status));
        return Object.assign(status, res);
    }

    /**
     * @param {WatchPartyStatus} status
     * @returns {Promise<void>}
     */
    async update(status) {
        await this.request(new Message('update', status));
    }

    /**
     * @returns {Promise<void>}
     */
    async updatePing() {
        let start = Date.now();
        await this.request(new Message('ping'));
        let time = Date.now() - start;
        if (this.ping === null) {
            this.ping = time;
        } else {
            this.ping = (this.ping * 4 + time) / 5;
        }
    }
}
