import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Activity, Team, User, Workout } from '../src/models/index.js';

let mongo: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([Activity.deleteMany({}), Team.deleteMany({}), User.deleteMany({}), Workout.deleteMany({})]);
});

async function createUserAndTeam() {
  const team = await Team.create({ name: 'Octocats', mascot: 'Mona', members: [] });
  const user = await User.create({ name: 'Mona', email: 'mona@example.com', team: team._id, fitnessGoal: 'endurance' });
  await Team.updateOne({ _id: team._id }, { $addToSet: { members: user._id } });
  return { user, team };
}

describe('Cenários adicionais da API', () => {
  it('rejeita minutos inválidos sem criar atividades', async () => {
    const { user, team } = await createUserAndTeam();
    for (const minutes of [0, -1, '30']) {
      const response = await request(app).post('/api/activities').send({ userId: user._id.toString(), teamId: team._id.toString(), type: 'run', minutes });
      expect(response.status).toBe(400);
    }
    expect(await Activity.countDocuments()).toBe(0);
  });

  it('valida integrantes e atualiza a associação anterior ao criar uma equipe', async () => {
    const { user, team } = await createUserAndTeam();
    for (const members of [['inválido'], [new mongoose.Types.ObjectId().toString()], 'inválido']) {
      const response = await request(app).post('/api/teams').send({ name: 'Robocats', mascot: 'Hubot', members });
      expect(response.status).toBe(400);
    }
    expect(await Team.countDocuments()).toBe(1);
    const response = await request(app).post('/api/teams').send({ name: 'Robocats', mascot: 'Hubot', members: [user._id.toString(), user._id.toString()] });
    expect(response.status).toBe(201);
    expect(response.body.team.members).toHaveLength(1);
    expect((await Team.findById(team._id))?.members).toHaveLength(0);
    expect((await User.findById(user._id))?.team?.toString()).toBe(response.body.team._id);
  });

  it('inclui equipes sem atividades e desempata pelo nome', async () => {
    await Team.create([{ name: 'Zeta', mascot: 'Z' }, { name: 'Alfa', mascot: 'A' }]);
    const response = await request(app).get('/api/leaderboard');
    expect(response.body.leaderboard).toEqual([
      { teamName: 'Alfa', totalPoints: 0, rank: 1 },
      { teamName: 'Zeta', totalPoints: 0, rank: 2 },
    ]);
  });

  it('usa a atividade recente quando não há treino para a meta', async () => {
    const { user, team } = await createUserAndTeam();
    await Activity.create({ user: user._id, team: team._id, type: 'strength', minutes: 20, points: 20, occurredAt: new Date() });
    await Workout.create({ title: 'Circuito de força', focus: 'strength', minutes: 30, difficulty: 'moderate' });
    const response = await request(app).get('/api/workouts/suggestions/mona%40example.com');
    expect(response.body.suggestions[0]).toMatchObject({ focus: 'strength', reason: expect.stringMatching(/atividade recente.*força/i) });
  });
});