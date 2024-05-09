import Socket from "../Socket/Socket.js";
import WatchPartyStatus from "./WatchPartyStatus.js";
import EventTarget from "../Events/EventTarget.js";
import Event from "../Events/Event.js";

export default class WatchPartyHost extends EventTarget {
    /** @type {string} */ id;
    /** @type {string} */ secret;
    /** @type {import("../Socket/Socket.js").default} */ socket;
    /** @type {Player} */ player;
    /** @type {number} */ updateInterval;
    /** @type {?WatchPartyStatus} */ lastStatus = null;
    /** @type {Function} */ _publishUpdate;

    /**
     * @param {Player} player
     * @param {?string} id
     * @param {?string} secret
     */
    constructor(player, id = null, secret = null) {
        super();
        this.id = id;
        this.secret = secret;
        this.player = player;
        this.socket = new Socket();

        this.socket.addEventListener('status', this.handleSocketStatus.bind(this));
        this.socket.addEventListener('reconnect', this.handleReconnect.bind(this));

        this._publishUpdate = this.publishUpdate.bind(this);
        this.player.addEventListener('seeked', this._publishUpdate);
        this.player.addEventListener('play', this._publishUpdate);
        this.player.addEventListener('pause', this._publishUpdate);
        this.player.addEventListener('playback-rate:ratechange', this._publishUpdate);
    }

    /**
     * @returns {Promise<void>}
     */
    async init() {
        let status = await this.collectStatusInfo();
        await this.socket.connect();
        try {
            if (this.id === null || this.secret === null) {
                let result = await this.socket.create(status);
                this.id = result.id;
                this.secret = result.secret;
            } else {
                await this.socket.update(status);
            }
            await this.socket.subscribe(this.id);
        } catch (e) {
            this.socket.close();
            throw e;
        }
        this.updateInterval = setInterval(this._publishUpdate, 5000);
    }

    /**
     * @param {SocketStatusEvent} event
     * @returns {Promise<void>}
     */
    async handleSocketStatus(event) {
        this.lastStatus = event.getStatus();
        this.dispatchEvent(new Event('update'));
    }

    /**
     * @returns {Promise<void>}
     */
    async handleReconnect() {
        await this.socket.subscribe(this.id);
    }

    /**
     * @returns {Promise<void>}
     */
    async destroy() {
        clearInterval(this.updateInterval);
        this.socket.close();

        this.player.removeEventListener('seeked', this._publishUpdate);
        this.player.removeEventListener('play', this._publishUpdate);
        this.player.removeEventListener('pause', this._publishUpdate);
        this.player.removeEventListener('playback-rate:ratechange', this._publishUpdate);
    }

    /**
     * @returns {Promise<void>}
     */
    async publishUpdate() {
        try {
            await this.socket.update(await this.collectStatusInfo());
        } catch (e) {
            console.error('Failed to publish update', e);
        }
    }

    /**
     * @returns {Promise<WatchPartyStatus>}
     */
    async collectStatusInfo() {
        let status = new WatchPartyStatus();
        status.id = this.id;
        status.secret = this.secret;
        status.url = window.location.href.split('#')[0].split('?')[0];
        status.time = await this.player.getCurrentTime();
        status.playing = await this.player.isPlaying();
        status.speed = this.player.hasExtension('playback-rate') ? await this.player.getPlaybackRate() : 1;
        return status;
    }
}
