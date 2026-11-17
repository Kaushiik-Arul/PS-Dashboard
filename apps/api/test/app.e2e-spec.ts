import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('API authentication (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  it('rejects an anonymous session request', () => {
    return request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Authentication required');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
