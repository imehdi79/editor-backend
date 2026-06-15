import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * In-memory stand-in for PrismaService so this e2e exercises the full HTTP
 * stack (auth, routing, guards, ValidationPipe, exception filter, controller,
 * service) without needing a live Postgres. It mirrors the Prisma calls used by
 * AuthService and ProjectsService.
 */
class FakePrisma {
  private users = new Map<string, any>(); // by id
  private projects = new Map<string, any>(); // by id
  private seq = 0;

  user = {
    findUnique: async ({ where }: any) => {
      if (where.id) return this.users.get(where.id) ?? null;
      if (where.email) {
        return (
          [...this.users.values()].find((u) => u.email === where.email) ?? null
        );
      }
      return null;
    },
    upsert: async ({ where, create }: any) => {
      const existing = [...this.users.values()].find(
        (u) => u.email === where.email,
      );
      if (existing) return existing;
      const user = { id: `user-${++this.seq}`, ...create };
      this.users.set(user.id, user);
      return user;
    },
    create: async ({ data }: any) => {
      const user = { id: `user-${++this.seq}`, createdAt: new Date(), ...data };
      this.users.set(user.id, user);
      return user;
    },
  };

  project = {
    findMany: async ({ where, orderBy, take }: any = {}) => {
      let rows = [...this.projects.values()].map((r) => ({ ...r }));
      if (where?.userId) rows = rows.filter((r) => r.userId === where.userId);
      if (orderBy?.updatedAt === 'desc') {
        rows.sort((a, b) => b.updatedAt - a.updatedAt);
      }
      return typeof take === 'number' ? rows.slice(0, take) : rows;
    },
    findUnique: async ({ where: { id } }: any) =>
      this.projects.has(id) ? { ...this.projects.get(id) } : null,
    findFirst: async ({ where }: any) => {
      const row = this.projects.get(where.id);
      if (!row) return null;
      if (where.userId && row.userId !== where.userId) return null;
      return { ...row };
    },
    upsert: async ({ where: { id }, create, update }: any) => {
      const existing = this.projects.get(id);
      const row = existing ? { ...existing, ...update } : { ...create };
      this.projects.set(id, row);
      return { ...row };
    },
    deleteMany: async ({ where }: any) => {
      const row = this.projects.get(where.id);
      if (row && (!where.userId || row.userId === where.userId)) {
        this.projects.delete(where.id);
        return { count: 1 };
      }
      return { count: 0 };
    },
  };
}

function makeProject(id: string, name: string) {
  return {
    id,
    name,
    activePageId: 'page-1',
    createdAt: 111,
    updatedAt: 222,
    pages: [
      {
        id: 'page-1',
        name: 'Ground Floor',
        viewport: { x: 0, y: 0, scale: 1 },
        shapes: {
          'wall-1': {
            type: 'wall',
            x1: 0,
            y1: 0,
            x2: 100,
            y2: 0,
            thickness: 12,
            height: 270,
          },
        },
      },
    ],
  };
}

describe('Construct Editor API (e2e)', () => {
  let app: NestFastifyApplication;
  let clock: number;
  let token: string;
  const auth = () => `Bearer ${token}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useClass(FakePrisma)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => {
    // Deterministic, monotonic server clock so updatedAt ordering is stable.
    clock = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('GET /health → { ok: true }', async () => {
    const res = await request(server()).get('/health').expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('auth: register issues a token; project routes require it', async () => {
    const res = await request(server())
      .post('/auth/register')
      .send({ email: 'a@test.dev', password: 'password123' })
      .expect(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('a@test.dev');
    token = res.body.token;

    // No token → 401.
    await request(server()).get('/projects').expect(401);
    // With token → 200.
    await request(server()).get('/projects').set('Authorization', auth()).expect(200);
  });

  it('round-trip: upsert → list/recent ordering → get → delete', async () => {
    clock = 1000;
    const a = await request(server())
      .put('/projects/project-a')
      .set('Authorization', auth())
      .send(makeProject('project-a', 'Alpha'))
      .expect(200);
    expect(a.body.updatedAt).toBe(1000); // server overwrote client's 222
    expect(a.body.createdAt).toBe(111); // client createdAt preserved
    expect(a.body.pages[0].shapes['wall-1'].height).toBe(270); // opaque blob intact

    clock = 2000;
    await request(server())
      .put('/projects/project-b')
      .set('Authorization', auth())
      .send(makeProject('project-b', 'Beta'))
      .expect(200);

    // List sorted updatedAt desc, summaries only (no pages).
    const list = await request(server())
      .get('/projects')
      .set('Authorization', auth())
      .expect(200);
    expect(list.body.map((p: any) => p.id)).toEqual(['project-b', 'project-a']);
    expect(list.body[0]).toEqual({
      id: 'project-b',
      name: 'Beta',
      pageCount: 1,
      updatedAt: 2000,
    });
    expect(list.body[0].pages).toBeUndefined();

    // Recent with limit=1 returns just the most recent.
    const recent = await request(server())
      .get('/projects/recent?limit=1')
      .set('Authorization', auth())
      .expect(200);
    expect(recent.body.map((p: any) => p.id)).toEqual(['project-b']);

    // Get by id returns the full document.
    const got = await request(server())
      .get('/projects/project-a')
      .set('Authorization', auth())
      .expect(200);
    expect(got.body.id).toBe('project-a');
    expect(got.body.pages).toHaveLength(1);

    // Delete → 204, gone, second delete still 204.
    await request(server()).delete('/projects/project-a').set('Authorization', auth()).expect(204);
    await request(server()).delete('/projects/project-a').set('Authorization', auth()).expect(204);
    await request(server()).get('/projects/project-a').set('Authorization', auth()).expect(404);
  });

  it('ownership: a second user cannot see/read the first user\'s projects', async () => {
    const reg = await request(server())
      .post('/auth/register')
      .send({ email: 'b@test.dev', password: 'password123' })
      .expect(201);
    const bToken = `Bearer ${reg.body.token}`;

    // User B's list is empty even though user A has project-b.
    const list = await request(server()).get('/projects').set('Authorization', bToken).expect(200);
    expect(list.body).toEqual([]);
    // And B gets 404 (not 403) for A's project — no existence leak.
    await request(server()).get('/projects/project-b').set('Authorization', bToken).expect(404);
  });

  it('login: wrong password → 401, correct → token', async () => {
    await request(server())
      .post('/auth/login')
      .send({ email: 'a@test.dev', password: 'wrong-password' })
      .expect(401);
    const ok = await request(server())
      .post('/auth/login')
      .send({ email: 'a@test.dev', password: 'password123' })
      .expect(200);
    expect(typeof ok.body.token).toBe('string');
  });

  it('PUT with body id ≠ path id → 400', async () => {
    const res = await request(server())
      .put('/projects/project-x')
      .set('Authorization', auth())
      .send(makeProject('project-y', 'Mismatch'))
      .expect(400);
    expect(res.body.error.message).toContain('does not match');
  });

  it('PUT with activePageId not referencing a page → 400 validation', async () => {
    const bad = makeProject('project-z', 'Bad');
    bad.activePageId = 'page-does-not-exist';
    const res = await request(server())
      .put('/projects/project-z')
      .set('Authorization', auth())
      .send(bad)
      .expect(400);
    expect(res.body.error.issues.join(' ')).toContain('activePageId');
  });
});
