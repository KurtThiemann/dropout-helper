import OttApiExtension from "./OttApiExtension.js";
import OttApiMessage from "../OttApiMessage.js";

export default class DropoutHelperPlayerExtension extends OttApiExtension {
    /** @type {HTMLVideoElement} */ video;
    /** @type {Object} */ player;
    /** @type {?number} */ previousRate = null;
    /** @type {function(DropoutHelperPlayerExtension)} */ handleInit = null;

    /**
     * @param {function(DropoutHelperPlayerExtension)} handleInit
     * @param {Window} inboundTarget
     * @param {Window} outboundTarget
     * @param {string} outboundOrigin
     */
    constructor(handleInit, inboundTarget, outboundTarget, outboundOrigin = '*') {
        super('dh', inboundTarget, outboundTarget, outboundOrigin);

        this.handleInit = handleInit;
        this.registerHandler('setPlaybackRate', this.handleSetPlaybackRate.bind(this));
        this.registerHandler('getPlaybackRate', this.handleGetPlaybackRate.bind(this));
        this.registerHandler('loadVideo', this.handleLoadVideo.bind(this));
    }

    /**
     * @inheritDoc
     */
    async init(message) {
        if (this.handleInit !== null) {
            await Promise.resolve(this.handleInit(this));
        }
        return await super.init(message);
    }

    /**
     * @param {HTMLVideoElement} video
     * @returns {this}
     */
    setVideo(video) {
        this.video = video;
        this.video.addEventListener('ratechange', this.handleRateChange.bind(this));
        return this;
    }

    /**
     * @param {Object} player
     * @returns {this}
     */
    setPlayer(player) {
        this.player = player;
        return this;
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

    /**
     * @param {OttApiMessage} message
     * @returns {Promise<?OttApiMessage>}
     */
    async handleLoadVideo(message) {
        console.log('loadVideo-ext', message.getParameters(), this.player);
        await this.player.loadVideo(message.getParameters()[0]);
        return message.respond(null);
    }
}