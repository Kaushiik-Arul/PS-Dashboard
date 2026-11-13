import type { PoolClient } from 'pg';
export declare function reconcilePendingAttrition(client: PoolClient, actor: string): Promise<number>;
