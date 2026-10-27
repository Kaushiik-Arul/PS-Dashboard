import { validateEnvironment } from './environment';

const validEnvironment = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgresql://user:password@127.0.0.1:5432/ps_dashboard',
};

describe('validateEnvironment', () => {
  it('requires NODE_ENV to be explicitly configured', () => {
    const { NODE_ENV: _nodeEnvironment, ...missingNodeEnvironment } =
      validEnvironment;

    expect(() => validateEnvironment(missingNodeEnvironment)).toThrow(
      'NODE_ENV is required',
    );
  });

  it.each(['development', 'test', 'production'])(
    'accepts the %s environment',
    (nodeEnvironment) => {
      expect(
        validateEnvironment({
          ...validEnvironment,
          NODE_ENV: nodeEnvironment,
        }).NODE_ENV,
      ).toBe(nodeEnvironment);
    },
  );
});