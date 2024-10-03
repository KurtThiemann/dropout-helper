export default class PlayerConfigPatcher {
    /** @type {Storage} */ storage;
    /** @type {OTTData} */ ottData;
    /** @type {Logger} */ logger;

    /**
     * @param {Storage} storage
     * @param {OTTData} ottData
     * @param {Logger} logger
     */
    constructor(storage, ottData, logger) {
        this.storage = storage;
        this.ottData = ottData;
        this.logger = logger;
    }

    /**
     * @param {OTTData} ottData
     * @returns {PlayerConfigPatcher}
     */
    setOttData(ottData) {
        this.ottData = ottData;
        return this;
    }

    patchPlayerConfig(config) {
        if (typeof config !== "object" || !config.vimeo_api_url || typeof config.request !== "object") {
            return null;
        }

        if (typeof config.request.cookie !== "object") {
            config.request.cookie = {};
        }

        let playerSettings = this.getSettings();

        let cookieObject = config.request.cookie;
        if (playerSettings) {
            Object.assign(cookieObject, playerSettings);
        }

        let logger = this.logger;
        let storage = this.storage;
        config.request.cookie = new Proxy(cookieObject, {
            set(target, prop, value) {
                target[prop] = value;

                let settings = storage.get('playerSettings') ?? {};
                settings[prop] = value;
                storage.set('playerSettings', settings);
                logger.log('Updated player settings', settings);
                return true;
            }
        });

        config.ott = this.ottData.getOTTAnalytics();
        config.ottCastOptions = this.ottData.getCastOptions();
        if (config.embed) {
            config.embed.dnt = 0;
        }
        if (config.request && config.request.flags) {
            config.request.flags.dnt = 0;
        }
        config.embed = this.ottData.getEmbedPresets(config.embed);

        if (config.video?.live_event?.settings) {
            config.video.live_event.settings.hide_live_label = false;
        }

        this.logger.debug('Patched player config', config);

        return config;
    }

    /**
     * Get saved player settings from the local storage
     *
     * @returns {?Object}
     */
    getSettings() {
        let settings = this.storage.get('playerSettings');
        if (!settings) {
            try {
                return this.getLegacySettings();
            } catch (e) {
                return null;
            }
        }
        return this.convertSavedSettings(settings);
    }

    /**
     * Get saved player settings from a previous version of the extension
     *
     * @returns {?Object}
     */
    getLegacySettings() {
        let options;
        try {
            let playerCookie = this.storage.get('player');
            if (playerCookie) {
                options = new URLSearchParams(playerCookie);
            }
        } catch (e) {
            return null;
        }

        if (!options) {
            return null;
        }

        let entries = {};
        for (let [key, value] of options.entries()) {
            entries[key] = value;
        }

        return this.convertSavedSettings(entries);
    }

    /**
     * Convert saved settings to the format used in Vimeo settings responses
     *
     * @param {Object} cookie
     * @returns {Object}
     */
    convertSavedSettings(cookie) {
        return {
            volume: cookie.volume ?? 1,
            captions: cookie.captions ? cookie.captions.split('.')[0] : null,
            captions_styles: {
                color: cookie.captions_color ?? null,
                fontSize: cookie.captions_font_size ?? null,
                fontFamily: cookie.captions_font_family ?? null,
                fontOpacity: cookie.captions_font_opacity ?? null,
                bgOpacity: cookie.captions_bg_opacity ?? null,
                windowColor: cookie.captions_window_color ?? null,
                windowOpacity: cookie.captions_window_opacity ?? null,
                bgColor: cookie.captions_bg_color ?? null,
                edgeStyle: cookie.captions_edge ?? null
            }
        };
    }
}
