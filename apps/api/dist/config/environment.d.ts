type NodeEnvironment = 'development' | 'test' | 'production';
export type Environment = {
    NODE_ENV: NodeEnvironment;
    PORT: number;
    DATABASE_URL: string;
};
export declare function validateEnvironment(values: Record<string, unknown>): Record<string, unknown> & Environment;
export {};
