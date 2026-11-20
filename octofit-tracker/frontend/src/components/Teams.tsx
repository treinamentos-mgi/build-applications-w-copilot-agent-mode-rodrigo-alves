import { CapabilityCard } from './CapabilityCard.js';

type Team = { _id?: string; name: string; mascot?: string; members?: string[] };

export default function Teams() {
  return <CapabilityCard<Team> title="Equipes" path="/api/teams" collection="teams" emptyText="Nenhuma equipe encontrada.">
    {(teams) => <ul>{teams.map((team, index) => <li key={team._id ?? index}>{team.name}{team.mascot && ` - Mascote: ${team.mascot}`}{team.members && ` - Integrantes: ${team.members.length}`}</li>)}</ul>}
  </CapabilityCard>;
}
