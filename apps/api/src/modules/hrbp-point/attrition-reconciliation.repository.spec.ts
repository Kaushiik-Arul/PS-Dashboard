import type { PoolClient } from 'pg';
import { reconcilePendingAttrition } from './attrition-reconciliation.repository';

describe('reconcilePendingAttrition', () => {
  it('pairs RBIN and PS Exit candidates by employee and detected month', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ event_id: 'event-1' }],
      rowCount: 1,
    });

    const count = await reconcilePendingAttrition({ query } as unknown as PoolClient, 'account-id');

    expect(count).toBe(1);
    const [sql, parameters] = query.mock.calls[0];
    expect(sql).toContain('ps_exit.pers_no = rbin.pers_no');
    expect(sql).toContain('ps_exit.detected_month = rbin.detected_month');
    expect(sql).toContain("ps_exit.source = 'ps_exit'");
    expect(sql).toContain("rbin.source = 'rbin'");
    expect(sql).toContain('DATE_TRUNC(\'month\', pair.exit_lwd)');
    expect(parameters).toEqual(['account-id']);
  });
});