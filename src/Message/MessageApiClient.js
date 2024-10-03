import MessageResponse from "./MessageResponse.js";

export default class MessageApiClient {
    /** @type {chrome} */ chrome;

    /**
     * @param {chrome} chrome
     */
    constructor(chrome) {
        this.chrome = chrome;
    }

    /**
     * @param {string} method
     * @param {Array} args
     * @returns {Promise<*>}
     */
    async request(method, args) {
        return MessageResponse.load(await chrome.runtime.sendMessage({method, args})).unwrap();
    }
}
