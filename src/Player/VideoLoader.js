export default class VideoLoader {
    /** @type {Player} */ player;
    /** @type {WorkerMessageApiClient} */ worker;
    /** @type {Window} */ window;
    /** @type {DOMParser} */ parser = new DOMParser();

    /**
     * @param {Player} player
     * @param {WorkerMessageApiClient} worker
     * @param {Window} window
     */
    constructor(player, worker, window) {
        this.player = player;
        this.worker = worker;
        this.window = window;
    }

    /**
     * @param url
     * @returns {Promise<Document>}
     */
    async loadVideoPage(url) {
        let content = await this.worker.fetch(url);
        return this.parser.parseFromString(content, 'text/html');
    }

    async fetchOTTConfig(embedUrl) {
        let content = await this.worker.fetch(embedUrl, {
            headers: {
                'Referer': 'https://www.dropout.tv/'
            }
        });
        let doc = this.parser.parseFromString(content, 'text/html');

        let scripts = doc.querySelectorAll('script');
        let target = null;
        for (let script of scripts) {
            if (script.textContent.includes('window.OTTData')) {
                target = script;
                break;
            }
        }

        if (target === null) {
            throw new Error('OTTData not found');
        }

        let data = target.textContent.match(/window\.OTTData\s?=\s?(.*)/);
        return JSON.parse(data[1]);
    }

    /**
     * @param {string} url
     * @returns {Promise<void>}
     */
    async loadVideo(url) {
        let doc = await this.loadVideoPage(url);
        let iframe = doc.getElementById('watch-embed');
        let src = iframe.getAttribute('src');
        let config = await this.fetchOTTConfig(src);
        console.log('loadVideo', config.config_url, this.player);
        await this.player.loadVideo(config.config_url);
    }
}
