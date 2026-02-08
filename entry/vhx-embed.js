import PlaybackRateExtension from "../src/Player/Extension/PlaybackRateExtension.js";
import Logger from "../src/Logger.js";
import Storage from "../src/Storage/Storage.js";

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

    if (parent) {
        new PlaybackRateExtension(window, parent, origin);
    } else {
        logger.error('No parent window found');
    }
})();





