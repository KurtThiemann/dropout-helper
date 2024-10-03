import MessageApiClient from "../Message/MessageApiClient.js";

export default class WorkerMessageApiClient extends MessageApiClient {
    constructor(chrome) {
        super(chrome);
    }

    /**
     * @param {string} resource
     * @param {Object} options
     * @param {string} returnType
     * @returns {Promise<ArrayBuffer|Blob|any|string>}
     */
    async fetch(resource, options = {}, returnType = 'text') {
        return await this.request('fetch', [resource, options, returnType]);
    }
}
