import MessageApi from "../Message/MessageApi.js";

export default class WorkerMessageApi extends MessageApi {

    constructor(chrome) {
        super(chrome);
        this.register('fetch', this.fetch.bind(this));
    }

    /**
     * @param {string} resource
     * @param {Object} options
     * @param {string} returnType
     * @returns {Promise<ArrayBuffer|Blob|any|string>}
     */
    async fetch(resource, options, returnType) {
        let response = await fetch(resource, options);
        if (!response.ok) {
            console.error('Request failed:', response);
            throw new Error(response.statusText);
        }
        switch (returnType) {
            case 'json':
                return await response.json();
            case 'text':
                return await response.text();
            case 'blob':
                return await response.blob();
            case 'arrayBuffer':
                return await response.arrayBuffer();
            default:
                throw new Error('Invalid return type');
        }
    }
}
