declare const _default: (() => {
    nodeEnv: string | undefined;
    port: number;
    encryptionKey: string | undefined;
    jwtSecret: string | undefined;
    jwtExpiresIn: string | undefined;
    jwtRefreshExpiresIn: string | undefined;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    nodeEnv: string | undefined;
    port: number;
    encryptionKey: string | undefined;
    jwtSecret: string | undefined;
    jwtExpiresIn: string | undefined;
    jwtRefreshExpiresIn: string | undefined;
}>;
export default _default;
