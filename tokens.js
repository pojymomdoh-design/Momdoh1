// status can be "online", "idle", "dnd", or "invisible" or "offline"
export default [
    {
        channelId: "1128013839280111749",
        serverId: "838113441008058388",
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
