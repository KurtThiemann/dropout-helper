export default class MessageResponse {
    /** @type {any} */ data;
    /** @type {?string} */ error;

    /**
     * @param {Object} obj
     * @returns {MessageResponse}
     */
    static load(obj) {
        if (typeof obj !== 'object') {
            throw new Error('Invalid response object');
        }
        return new MessageResponse(obj.data, obj.error ?? null);
    }

    /**
     * @param {any} data
     * @param {?string} error
     */
    constructor(data, error = null) {
        this.data = data;
        this.error = error;
    }

    /**
     * @returns {*}
     */
    unwrap() {
        if (this.error) {
            throw new Error(this.error);
        }
        return this.data;
    }
}
