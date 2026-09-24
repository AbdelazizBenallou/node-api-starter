declare global {
    namespace Express {
        interface Request {
            requestId?: string;
            refreshToken?: string;
            user?: {
                userId: number;
                email: string;
                role: string;
            };
            refreshPayload?: {
                userId: number;
            };
        }
    }
}

export { };