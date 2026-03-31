import WebSocket from 'ws';
import { EventEmitter } from 'events';
const blackListedEvents = ["CHANNEL_UNREAD_UPDATE", "CONVERSATION_SUMMARY_UPDATE", "SESSIONS_REPLACE"];
const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';
const statusList = ["online", "idle", "dnd", "invisible", "offline"];
export class voiceClient extends EventEmitter {
    ws = null;
    heartbeatInterval;
    sequenceNumber = null;
    firstLoad = true;
    reconnectAttempts = 0;
    ignoreReconnect = false;
    reconnectTimeout;
    invalidSession = false;
    token;
    guildId;
    channelId;
    selfMute;
    selfDeaf;
    autoReconnect;
    presence;
    user_id = null;
    constructor(config) {
        super();
        if (!config.token) {
            throw new Error('token, guildId, and channelId are required');
        }
        this.token = config.token;
        this.guildId = config?.serverId;
        this.channelId = config?.channelId;
        this.selfMute = config.selfMute ?? true;
        this.selfDeaf = config.selfDeaf ?? true;
        this.autoReconnect = {
            enabled: config.autoReconnect.enabled ?? false,
            delay: (config.autoReconnect.delay ?? 1) * 1000,
            maxRetries: config.autoReconnect?.maxRetries ?? 9999,
        };
        if (config?.presence?.status) {
            this.presence = config.presence;
        }
    }
    connect() {
        if (this.invalidSession) return;
        this.ws = new WebSocket(GATEWAY_URL, { skipUTF8Validation: true });
        this.setMaxListeners(5);
        this.ws.on('open', () => {
            this.emit('connected');
            this.emit('debug', '🌐 Connected to Discord Gateway');
        });
        this.ws.on('message', (data) => {
            const payload = JSON.parse(data.toString());
            const { t: eventType, s: seq, op, d } = payload;
            if (blackListedEvents.includes(eventType)) return;
            if (seq !== null) this.sequenceNumber = seq;
            switch (op) {
                case 10:
                    this.startHeartbeat(d.heartbeat_interval);
                    this.identify();
                    break;
                case 11:
                    break;
                case 9:
                    this.invalidSession = true;
                    if (this.ws) this.ws.terminate();
                    this.cleanup();
                    break;
                case 0:
                    if (eventType === 'READY') {
                        this.emit('ready', { username: d.user.username, discriminator: d.user.discriminator });
                        this.user_id = d.user.id;
                        this.joinVoiceChannel();
                        this.sendStatusUpdate();
                    } else if (eventType === 'VOICE_STATE_UPDATE') {
                        if (d.user_id === this.user_id && d.channel_id === this.channelId && d?.guild_id === this.guildId && this.firstLoad) {
                            this.emit('voiceReady');
                            this.firstLoad = false;
                        } else if (d.user_id === this.user_id && (this.guildId && this.channelId && d?.channel_id !== this.channelId || d?.guild_id !== this.guildId)) {
                            if (this.autoReconnect.enabled) {
                                if (this.ignoreReconnect) return;
                                this.reconnectAttempts++;
                                if (this.reconnectAttempts < this.autoReconnect.maxRetries) {
                                    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
                                    this.ignoreReconnect = true;
                                    this.reconnectTimeout = setTimeout(() => { this.joinVoiceChannel(); }, this.autoReconnect.delay);
                                } else {
                                    this.cleanup();
                                }
                            }
                        }
                    }
                    break;
            }
        });
        this.ws.on('close', () => {
            this.emit('disconnected');
            this.cleanup();
            if (this.firstLoad) { console.log('Bad token or invalid channelId/guildId'); return; }
            setTimeout(() => this.connect(), 5000);
        });
        this.ws.on('error', (err) => { this.emit('error', err); });
    }
    startHeartbeat(interval) {
        this.heartbeatInterval = setInterval(() => {
            this.ws?.send(JSON.stringify({ op: 1, d: this.sequenceNumber }));
        }, interval);
    }
    identify() {
        this.ws?.send(JSON.stringify({ op: 2, d: { token: this.token, intents: 128, properties: { os: 'Windows', browser: 'Chrome', device: '' } } }));
    }
    joinVoiceChannel() {
        if (!this.guildId || !this.channelId) return;
        this.ws?.send(JSON.stringify({ op: 4, d: { guild_id: this.guildId, channel_id: this.channelId, self_mute: this.selfMute, self_deaf: this.selfDeaf } }));
        setTimeout(() => { this.ignoreReconnect = false; }, 1000);
    }
    cleanup() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.ws = null;
        this.sequenceNumber = null;
    }
    sendStatusUpdate() {
        const status = this?.presence?.status?.toLowerCase();
        if (!status || !statusList.includes(status)) return;
        this.ws?.send(JSON.stringify({ op: 3, d: { status: this.presence.status, activities: [], since: Math.floor(Date.now() / 1000) - 10, afk: true } }));
    }
    disconnect() { this.cleanup(); }
                                                  }
