import DropoutHelperPlayerExtension from "../src/Player/Extension/DropoutHelperPlayerExtension.js";
import Logger from "../src/Logger.js";
import Storage from "../src/Storage/Storage.js";
import PlayerConfigPatcher from "../src/Player/PlayerConfigPatcher.js";
import OTTData from "../src/Player/OTTData.js";

(async () => {
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
    const storage = new Storage('_dropout_helper');
    const playerConfigPatcher = new PlayerConfigPatcher(storage, new OTTData(self.OTTData), logger);

    logger.debug('Content script running.');
    const referer = document.referrer;
    const origin = referer ? new URL(referer).origin : '*';
    const parent = window.parent;

    let extension = null;
    if (parent) {
        extension = new DropoutHelperPlayerExtension(handleExtensionInit, playerConfigPatcher, window, parent, origin);
    } else {
        logger.error('No parent window found');
    }

    // Overwrite the VimeoPlayer constructor to keep track of all instances
    if (typeof self.VimeoPlayer !== 'undefined') {
        self.VimeoPlayer = new Proxy(VimeoPlayer, {
            construct(target, argumentsList, newTarget) {
                logger.debug('Create player', argumentsList);
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
            settings = playerConfigPatcher.patchPlayerConfig(res);
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
            settings = playerConfigPatcher.patchPlayerConfig(obj);
        } catch (e) {
            logger.error('Failed to handle settings object', e);
        }
        return settings ?? obj;
    };
})();





