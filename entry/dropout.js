import Storage from "../src/Storage/Storage.js";
import Player from "../src/Player/Player.js";
import WatchPartySection from "../src/UI/WatchPartySection.js";
import Logger from "../src/Logger.js";

let seriesLink = document.querySelector('a.custom-nav-series');
if (seriesLink) {
    seriesLink.removeAttribute('target');
}

let logger = new Logger('Dropout');
logger.debug('Content script running.');

(async () => {
    let storage = new Storage('_dropout_helper');
    let iframe = document.getElementById('watch-embed');
    if (iframe === null) {
        return;
    }

    let seriesTitleElement = document.querySelector('.series-title');
    let videoTitleElement = document.querySelector('.video-title');
    let title = null;
    if (seriesTitleElement && videoTitleElement) {
        title = `${seriesTitleElement.textContent.trim()}: ${videoTitleElement.textContent.trim()}`;
    } else {
        title = seriesTitleElement?.textContent.trim() ?? videoTitleElement?.textContent.trim() ?? null;
    }

    let player = Player.get(iframe);

    let shareTools = document.querySelector('div.share-tools');
    let column = shareTools.parentElement;
    let watchPartySection = new WatchPartySection(player, storage, title);
    column.insertBefore(watchPartySection.getHtml(), shareTools);

    player.addEventListener('playback-rate:ratechange', async e => {
        let rate = e.getData();
        if (rate === storage.get('playbackRate')) {
            return;
        }

        storage.set('playbackRate', rate);
    });

    player.addEventListener('loadstart', async e => {
        // Set the playback rate as soon as the extension is initialized
        player.addEventListener('playback-rate:init', () => {
            if (storage.has('playbackRate')) {
                player.setPlaybackRate(storage.get('playbackRate'));
            }
        });
        player.initExtension('playback-rate').catch(e => logger.error('Failed to init playback rate extension', e));

        if (storage.has('volume')) {
            logger.debug('Setting volume', storage.get('volume'));
            player.setVolume(storage.get('volume'));
            storage.delete('volume');
        }

        if (storage.has('muted')) {
            logger.debug('Setting muted', storage.get('muted'));
            await player.setMuted(storage.get('muted'));
            storage.delete('muted');
        }

        if (storage.has('subtitles')) {
            logger.debug('Setting subtitles', storage.get('subtitles'));
            await player.setSubtitle(storage.get('subtitles'));
            storage.delete('subtitles');
        }

        if (self.location.hash.startsWith('#dhparty-')) {
            let id = self.location.hash.slice(9);
            await watchPartySection.join(id);
        } else if (self.location.hash.startsWith('#dhscheduled-')) {
            let id = self.location.hash.slice(13);
            await watchPartySection.joinScheduledSession(id);
        }
    });
})();

