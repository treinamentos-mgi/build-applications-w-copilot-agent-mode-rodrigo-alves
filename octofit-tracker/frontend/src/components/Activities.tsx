import { CapabilityCard } from './CapabilityCard.js';

type Activity = { _id?: string; type: string; minutes: number; points: number };

const activityNames: Record<string, string> = {
  run: 'Corrida',
  cycle: 'Ciclismo',
  walk: 'Caminhada',
  swim: 'Natação',
};

export default function Activities() {
  return <CapabilityCard<Activity> title="Atividades" path="/api/activities" collection="activities" emptyText="Nenhuma atividade encontrada.">
    {(activities) => <ul>{activities.map((activity, index) => <li key={activity._id ?? index}>{activityNames[activity.type] ?? activity.type}: {activity.minutes} minutos, {activity.points} pontos</li>)}</ul>}
  </CapabilityCard>;
}
