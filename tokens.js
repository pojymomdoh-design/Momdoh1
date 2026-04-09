// status can be "online", "idle", "dnd", or "invisible" or "offline"
export default [
    {
        channelId: "1448817318246355075",
        serverId: "1138774964254822420",
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
