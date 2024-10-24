export default class OttApiMessage {
    /** @type {?string} */ extension = null
    /** @type {string} */ method;
    /** @type {Object|Array|null} */ params;

    /**
     * @param {MessageEvent} event
     * @returns {?OttApiMessage}
     */
    static fromMessage(event) {
        let data = event.data;
        let message;
        if (typeof data === 'string') {
            try {
                message = OttApiMessage.fromJson(data);
            } catch (e) {
                return null;
            }
        } else if (typeof data === 'object') {
            message = OttApiMessage.fromObject(data);
        } else {
            return null;
        }

        if (!message || !message.getMethod()) {
            return null;
        }

        return message;
    }

    /**
     * @param {string} json
     * @returns {OttApiMessage}
     */
    static fromJson(json) {
        let parsed = JSON.parse(json);
        return this.fromObject(parsed);
    }

    /**
     * @param {Object} obj
     * @returns {OttApiMessage}
     */
    static fromObject(obj) {
        if (typeof obj.method !== 'string') {
            return null;
        }
        return new this(obj.method, obj.params ?? null);
    }

    constructor(method, params) {
        let parts = method.split(':');
        if (parts.length === 2) {
            this.extension = parts.shift();
            method = parts.join(':');
        }

        this.method = method;
        this.params = params;
    }

    /**
     * @returns {Object|Array|null}
     */
    getParameters() {
        return this.params;
    }

    /**
     * @returns {string}
     */
    getMethod() {
        return this.method;
    }

    /**
     * @returns {string}
     */
    getExtension() {
        return this.extension;
    }

    /**
     * @param {?string} extension
     * @returns {this}
     */
    setExtension(extension) {
        this.extension = extension;
        return this;
    }

    /**
     * @returns {string}
     */
    getNamespacedMethod() {
        return this.extension ? `${this.extension}:${this.method}` : this.method;
    }

    /**
     * @param {*} response
     * @param {?Error} error
     * @returns {OttApiMessage}
     */
    respond(response, error = null) {
        return new this.constructor('response', {
            method: this.getNamespacedMethod(),
            response,
            error: error ? error.message : null
        });
    }

    toJSON() {
        return {
            method: this.getNamespacedMethod(),
            params: this.getParameters()
        };
    }
}
