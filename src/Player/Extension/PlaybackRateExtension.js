import OttApiExtension from "./OttApiExtension.js";
import OttApiMessage from "../OttApiMessage.js";

export default class PlaybackRateExtension extends OttApiExtension {
    /** @type {HTMLVideoElement} */ video;
    /** @type {?number} */ previousRate = null;

    /**
     * @param {Window} inboundTarget
     * @param {Window} outboundTarget
     * @param {string} outboundOrigin
     */
    constructor(inboundTarget, outboundTarget, outboundOrigin = '*') {
        super('playback-rate', inboundTarget, outboundTarget, outboundOrigin);

        this.registerHandler('setPlaybackRate', this.handleSetPlaybackRate.bind(this));
        this.registerHandler('getPlaybackRate', this.handleGetPlaybackRate.bind(this));
    }

    /**
     * @inheritDoc
     */
    async init(message) {
        this.video = document.querySelector('video');
        if (!this.video) {
            throw new Error('No video element found');
        }

        this.video.addEventListener('ratechange', this.handleRateChange.bind(this));
        return await super.init(message);
    }

    handleRateChange() {
        let rate = this.video.playbackRate;
        if (this.previousRate !== null && rate === this.previousRate) {
            return;
        }
        this.previousRate = rate;
        this.sendMessage(new OttApiMessage('ratechange', rate));
    }

    /**
     * @param {OttApiMessage} message
     * @returns {Promise<?OttApiMessage>}
     */
    async handleSetPlaybackRate(message) {
        let rate = message.getParameters()[0];
        if (typeof rate !== 'number') {
            return message.respond(null, new Error('Invalid playback rate'));
        }
        this.previousRate = rate;
        this.video.playbackRate = rate;
        return message.respond(rate);
    }

    /**
     * @param {OttApiMessage} message
     * @returns {Promise<?OttApiMessage>}
     */
    async handleGetPlaybackRate(message) {
        return message.respond(this.video.playbackRate);
    }
}
