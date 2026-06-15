import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// A demo user that owns one sample project with two pages. The `shapes` objects
// below are opaque CAD documents — the backend stores them verbatim and never
// validates them. Note the wall already carries `height`, which the (currently
// disabled) 3D view reads.
//
// Demo login:  demo@construct.dev / password123
async function main() {
  const now = Date.now();

  const user = await prisma.user.upsert({
    where: { email: 'demo@construct.dev' },
    update: {},
    create: {
      email: 'demo@construct.dev',
      password: await bcrypt.hash('password123', 10),
    },
  });

  await prisma.project.upsert({
    where: { id: 'project-seed-1' },
    update: {},
    create: {
      id: 'project-seed-1',
      name: 'Sample Floor Plan',
      activePageId: 'page-1',
      userId: user.id,
      createdAt: now,
      updatedAt: now,
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
              x2: 400,
              y2: 0,
              thickness: 12,
              height: 270,
            },
            'wall-2': {
              type: 'wall',
              x1: 400,
              y1: 0,
              x2: 400,
              y2: 300,
              thickness: 12,
              height: 270,
            },
            'door-1': {
              type: 'door',
              x: 120,
              y: 0,
              width: 90,
              angle: 0,
            },
            'text-1': {
              type: 'text',
              x: 180,
              y: 140,
              value: 'Living Room',
              fontSize: 16,
            },
          },
        },
        {
          id: 'page-2',
          name: 'First Floor',
          viewport: { x: 0, y: 0, scale: 1 },
          shapes: {
            'wall-3': {
              type: 'wall',
              x1: 0,
              y1: 0,
              x2: 400,
              y2: 0,
              thickness: 12,
              height: 270,
            },
            'window-1': {
              type: 'window',
              x: 150,
              y: 0,
              width: 100,
              angle: 0,
            },
          },
        },
      ],
    },
  });

  console.log('Seeded user demo@construct.dev (password123) + project-seed-1');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
