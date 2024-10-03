import WatchPartyController from "./WatchPartyController.js";
import Event from "../Events/Event.js";

export default class ScheduledSession extends WatchPartyController {
    /** @type {?number} */ startTime = null;
    /** @type {?number} */ syncInterval = null;
    /** @type {?number} */ startTimeout = null;
    /** @type {boolean} */ isUpdating = false;
    /** @type {number} */ seekScore = 2;
    /** @type {Function} */ _updatePlayer;

    /**
     * @param {string} id
     * @param {Player} player
     * @param {Storage} storage
     */
    constructor(id, player, storage) {
        super(id, player, storage);
        this._updatePlayer = this.updatePlayer.bind(this);

        this.player.addEventListener('seeked', this._updatePlayer);
        this.player.addEventListener('loadeddata', this._updatePlayer);
        this.player.addEventListener('play', this._updatePlayer);
        this.player.addEventListener('pause', this._updatePlayer);
        this.player.addEventListener('dh:ratechange', this._updatePlayer);
    }

    /**
     * @returns {Promise<void>}
     */
    async updatePlayer() {
        if (this.isUpdating || this.startTime === null) {
            return;
        }
        this.isUpdating = true;

        if (this.player.isLoading() || this.player.isSeeking()) {
            this.isUpdating = false;
            return;
        }

        let now = Date.now();
        let duration = await this.player.getDuration();
        let playing = now >= this.startTime && now < this.startTime + duration * 1000;

        if (playing !== await this.player.isPlaying()) {
            if (playing) {
                await this.player.play();
            } else {
                await this.player.pause();
            }
        }

        if (this.player.hasExtension('playback-rate')) {
            await this.player.setPlaybackRate(1);
        }

        let time = await this.player.getCurrentTime();
        let targetTime = (now - this.startTime) / 1000;
        let diff = Math.abs(targetTime - time);
        let threshold = Math.min(0.5 * this.seekScore, 3);
        if (diff > threshold) {
            this.seekScore++;
            targetTime = Math.max(0, Math.min(duration, targetTime + Math.min(this.player.getAverageSeekTime() / 1000, 4)))
            await this.player.seekTime(targetTime);
        } else {
            this.seekScore = Math.max(1, this.seekScore - 1);
        }

        this.dispatchEvent(new Event('update'));
        this.isUpdating = false;
    }

    /**
     * @inheritDoc
     */
    async destroy() {
        await super.destroy();

        clearInterval(this.syncInterval);
        this.player.removeEventListener('seeked', this._updatePlayer);
        this.player.removeEventListener('loadeddata', this._updatePlayer);
        this.player.removeEventListener('play', this._updatePlayer);
        this.player.removeEventListener('pause', this._updatePlayer);
        this.player.removeEventListener('dh:ratechange', this._updatePlayer);
    }

    /**
     * @inheritDoc
     */
    async init() {
        await super.init();
        this.startTime = parseInt(this.id, 16);
        if (isNaN(this.startTime)) {
            this.startTime = null;
            throw new Error('Invalid session ID');
        }

        this.syncInterval = setInterval(this._updatePlayer, 2000);
        if (Date.now() < this.startTime) {
            this.startTimeout = setTimeout(this._updatePlayer, this.startTime - Date.now() + 5);
        }
    }
}
