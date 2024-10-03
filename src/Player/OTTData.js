export default class OTTData {
    /** {Object} */ data;

    /**
     * @param {Object} data
     */
    constructor(data) {
        this.data = data;
    }

    /**
     * @returns {string}
     */
    getConfigUrl() {
        return this.data.config_url;
    }

    /**
     * @returns {Object}
     */
    getOTTAnalytics() {
        let isTrailer;
        if (typeof this.data.video.is_trailer === 'string') {
            isTrailer = this.data.video.is_trailer.toLowerCase() === 'true';
        } else {
            isTrailer = this.data.video.is_trailer;
        }

        return {
            analytics_url: this.data.analytics_url,
            collection_id: this.data.collection?.id ?? null,
            duration: this.data.video.duration,
            is_trailer: isTrailer,
            platform: 'web',
            platform_version: null,
            product_id: this.data.product?.id ?? null,
            site_id: this.data.site.id,
            video_content_type: isTrailer ? 'trailer' : 'video',
            video_duration: this.data.video.duration,
            video_id: this.data.video.id,
            video_producer: this.data.site.subdomain,
            video_series: this.data.site.subdomain,
            video_title: `${this.data.site.subdomain} - ${this.data.video.title} [${this.data.video.id}]`,
            viewer_user_email: this.data.user?.email ?? '',
            viewer_user_id: this.data.user?.id ?? null,
        }
    }

    /**
     * @returns {Object}
     */
    getCredentials() {
        return {
            credentials: new URLSearchParams(this.data.api_data.user_auth_token).toString(),
            credentialsType: 'query',
        };
    }

    /**
     * @returns {Object}
     */
    getCastConfig() {
        return {
            appId: this.data.google_cast_app_id,
            contentId: this.data.video.id,
            customData: {
                apiHost: this.data.api_data.api_host,
                authApiHost: this.data.api_data.auth_api_host,
                siteId: this.data.site.id,
                userId: this.data.user?.id ?? null,
            },
        };
    }

    /**
     * @returns {Object}
     */
    getCastOptions() {
        return {
            ...this.getCastConfig(),
            ...this.getCredentials()
        }
    }

    /**
     * @param {Object} embed
     * @returns {Object}
     */
    getEmbedPresets(embed) {
        embed = Object.assign({}, embed, {
            color_one: '000000',
            color_three: 'ffffff',
            color_four: '000000',
        });

        if (embed.settings) {
            embed.settings = Object.assign({}, embed.settings, {
                custom_logo: undefined,
                play_button_position: 0,
                airplay: 1,
                cc: 1,
                chapters: 1,
                chromecast: 1,
                embed: 1,
                fullscreen: 1,
                pip: 1,
                playbar: 1,
                quality: 1,
                transcript: 1,
                volume: 1,
            });
        }

        return embed;
    }
}
