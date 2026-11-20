import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Dados da atividade inválidos'), { status: 400 });
  }
  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (!mongoose.isObjectIdOrHexString(userId) || !mongoose.isObjectIdOrHexString(teamId)
    || typeof type !== 'string' || !type.trim()
    || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('Dados da atividade inválidos'), { status: 400 });
  }
  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) {
    throw Object.assign(new Error('Pessoa ou equipe não encontrada'), { status: 400 });
  }
  return Activity.create({ user: userId, team: teamId, type: type.trim(), minutes, points: minutes, occurredAt: new Date() });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Dados da equipe inválidos'), { status: 400 });
  }
  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim() || typeof mascot !== 'string' || !mascot.trim()
    || !Array.isArray(members) || !members.every((member) => mongoose.isObjectIdOrHexString(member))) {
    throw Object.assign(new Error('Dados da equipe inválidos'), { status: 400 });
  }
  const memberIds = [...new Set(members.map((member) => member.toString().toLowerCase()))];
  if (await User.countDocuments({ _id: { $in: memberIds } }) !== memberIds.length) {
    throw Object.assign(new Error('Pessoa integrante não encontrada'), { status: 400 });
  }
  const team = await Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
  if (memberIds.length) {
    await Team.updateMany({ _id: { $ne: team._id }, members: { $in: memberIds } }, { $pull: { members: { $in: memberIds } } });
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const teams = await Team.aggregate<{ teamName: string; totalPoints: number }>([
    { $lookup: { from: Activity.collection.name, localField: '_id', foreignField: 'team', as: 'activities' } },
    { $project: { teamName: '$name', totalPoints: { $sum: '$activities.points' } } },
    { $sort: { totalPoints: -1, teamName: 1, _id: 1 } },
  ]);
  return teams.map(({ teamName, totalPoints }, index) => ({ teamName, totalPoints, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('Pessoa não encontrada'), { status: 404 });
  }
  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1, _id: -1 }).lean();
  const activityFocus: Record<string, string> = {
    run: 'endurance', cycle: 'endurance', walk: 'endurance', swim: 'endurance', strength: 'strength',
  };
  const recentFocus = recentActivity ? activityFocus[recentActivity.type] : undefined;
  let workouts = await Workout.find({ focus: user.fitnessGoal }).lean();
  let focus = user.fitnessGoal;
  if (workouts.length === 0 && recentFocus && recentFocus !== focus) {
    focus = recentFocus;
    workouts = await Workout.find({ focus }).lean();
  }
  const focusNames: Record<string, string> = { endurance: 'resistência', strength: 'força' };
  const focusName = focusNames[focus] ?? 'atividade física';
  const reason = focus === user.fitnessGoal
    ? `Treino recomendado para sua meta de ${focusName}.`
    : `Treino recomendado para sua atividade recente de ${focusName}.`;
  return workouts.map((workout) => ({ ...workout, reason }));
}

export { User };
