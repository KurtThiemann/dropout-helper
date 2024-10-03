import MessageResponse from "./MessageResponse.js";

export default class MessageApi {
    /** @type {chrome} */ chrome;
    /** @type {Map<string, function>} */ handlers = new Map();

    /**
     * @param {chrome} chrome
     */
    constructor(chrome) {
        this.chrome = chrome;
        this.chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    }

    /**
     * @param {string} name
     * @param {function} handler
     * @returns {this}
     */
    register(name, handler) {
        this.handlers.set(name, handler);
        return this;
    }

    /**
     * @param {Object} message
     * @param {MessageSender} sender
     * @param {function} sendResponse
     * @returns {boolean}
     */
    handleMessage(message, sender, sendResponse) {
        let handler = this.handlers.get(message.method);
        let args = message.args || [];
        Promise.resolve(handler(...args))
            .then(res => sendResponse(new MessageResponse(res)))
            .catch(e => sendResponse(new MessageResponse(null, e.message)));
        return true;
    }
}
