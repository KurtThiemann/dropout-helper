import DropoutHelperPlayerExtension from "../src/Player/Extension/DropoutHelperPlayerExtension.js";
import Logger from "../src/Logger.js";
import Storage from "../src/Storage/Storage.js";
import OttApiMessage from "../src/Player/OttApiMessage.js";

(async () => {
    let storage = new Storage('_dropout_helper');
    let logger = new Logger('VHX-Embed');

    // Thanks, Firefox, for making this necessary
    // Inject the script into the main page if we are running in Firefox
    if (typeof window.wrappedJSObject !== 'undefined') {
        logger.debug('Injecting script into main world');
        let script = document.createElement('script');
        script.src = chrome.runtime.getURL('js/vhx-embed.js');
        script.async = false;
        document.head.appendChild(script);
        return;
    }

    logger.debug('Content script running.');
    const referer = document.referrer;
    const origin = referer ? new URL(referer).origin : '*';
    const parent = window.parent;

    let extension = null;
    if (parent) {
        extension = new DropoutHelperPlayerExtension(handleExtensionInit, window, parent, origin);
    } else {
        logger.error('No parent window found');
    }

    // Overwrite the VimeoPlayer constructor to keep track of all instances
    if (typeof self.VimeoPlayer !== 'undefined') {
        self.VimeoPlayer = new Proxy(VimeoPlayer, {
            construct(target, argumentsList, newTarget) {
                let instance = Reflect.construct(target, argumentsList, newTarget);
                extension?.setPlayer(instance);
                return instance;
            }
        });
    }

    /**
     * @param {DropoutHelperPlayerExtension} ext
     */
    function handleExtensionInit(ext) {
        ext.setVideo(document.querySelector('video'));
    }

    // Fix player settings storage
    // Vimeo stores players settings, such as volume and subtitle settings, in a cookie.
    // It does, however, try to save this cookie for the domain '.vimeo.com', which does
    // not work, since the OTT player is hosted on a different domain.
    // It does, however, also set all properties in the original settings object from the API,
    // so we can use a Proxy to intercept changes to the cookie object and save them in the local storage
    let origJson = Response.prototype.json;

    Response.prototype.json = async function () {
        let res = await origJson.apply(this);
        let settings;
        try {
            settings = handleSettingsObject(res);
        } catch (e) {
            logger.error('Failed to handle settings object', e);
        }
        if (!settings) {
            return res;
        }
        return settings;
    };

    let origParse = JSON.parse;
    JSON.parse = function (text) {
        let obj = origParse(text);
        let settings;
        try {
            settings = handleSettingsObject(obj);
        } catch (e) {
            logger.error('Failed to handle settings object', e);
        }
        return settings ?? obj;
    };

    /**
     * Check if a JSON response is the Vimeo settings object, apply saved settings,
     * and add a Proxy object to save changes to the cookie object in the local storage
     *
     * @param {Object} settings
     * @returns {?Object}
     */
    function handleSettingsObject(settings) {
        if (typeof settings !== "object" || !settings.vimeo_api_url || typeof settings.request !== "object") {
            return null;
        }

        if (typeof settings.request.cookie !== "object") {
            settings.request.cookie = {};
        }

        let playerSettings = getSettings();

        let cookieObject = settings.request.cookie;
        if (playerSettings) {
            Object.assign(cookieObject, playerSettings);
        }

        settings.request.cookie = new Proxy(cookieObject, {
            set(target, prop, value) {
                target[prop] = value;

                let settings = storage.get('playerSettings') ?? {};
                settings[prop] = value;
                storage.set('playerSettings', settings);
                logger.log('Updated player settings', settings);
                return true;
            }
        });

        logger.debug('Patched initial player settings', playerSettings);

        return settings;
    }

    /**
     * Get saved player settings from the local storage
     *
     * @returns {?Object}
     */
    function getSettings() {
        let settings = storage.get('playerSettings');
        if (!settings) {
            try {
                return getLegacySettings();
            } catch (e) {
                return null;
            }
        }
        return convertSavedSettings(settings);
    }

    /**
     * Get saved player settings from a previous version of the extension
     *
     * @returns {?Object}
     */
    function getLegacySettings() {
        let options;
        try {
            let playerCookie = storage.get('player');
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

        return convertSavedSettings(entries);
    }

    /**
     * Convert saved settings to the format used in Vimeo settings responses
     *
     * @param {Object} cookie
     * @returns {Object}
     */
    function convertSavedSettings(cookie) {
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
})();





