// status can be "online", "idle", "dnd", or "invisible" or "offline"
export default [
    {
        channelId: "1485581256245645497",
        serverId: "689801654937190508",
        token: process.env.token1,
        selfDeaf: false,
        autoReconnect: {
            enabled: true,
            delay: 5,
            maxRetries: 5,
        },
        presence: {
            status: "idle",
        },
        selfMute: true,
    },
];
