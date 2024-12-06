import * as LiveKit from 'livekit-server-sdk';

let token: string;
let tokenCreatedAt: number;

export async function getLiveKitToken(): Promise<string> {
    if (token && tokenCreatedAt && (Date.now() - tokenCreatedAt) < 60 * 60 * 6 * 1000) {
        return token;
    }

    // Generate a new token
    const accessToken: LiveKit.AccessToken = new LiveKit.AccessToken(
        process.env['LIVEKIT_KEY'],
        process.env['LIVEKIT_SECRET'],
        {
            identity: "Car",
            ttl: 60 * 60 * 7,
        },
    );

    // Set permissions
    accessToken.addGrant({
        roomCreate: false,
        roomJoin: true,
        roomList: false,
        roomRecord: false,
        roomAdmin: false,
        room: process.env['LIVEKIT_ROOM'],
        ingressAdmin: false,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
        hidden: false,
        recorder: false,
        agent: false
    });

    token = await accessToken.toJwt();
    tokenCreatedAt = Date.now();

    return token;
}
