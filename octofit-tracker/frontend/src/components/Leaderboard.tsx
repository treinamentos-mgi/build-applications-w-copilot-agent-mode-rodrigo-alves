import { CapabilityCard } from './CapabilityCard.js';

type Entry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  return <CapabilityCard<Entry> title="Placar" path="/api/leaderboard" collection="leaderboard" emptyText="Sem classificação disponível.">
    {(entries) => <ol>{entries.map((entry, index) => <li key={`${entry.teamName}-${index}`}>{entry.rank}º - {entry.teamName}: {entry.totalPoints} pontos</li>)}</ol>}
  </CapabilityCard>;
}
