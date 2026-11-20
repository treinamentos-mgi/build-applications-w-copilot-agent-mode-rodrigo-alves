import { useState, type FormEvent } from 'react';
import { CapabilityCard } from './CapabilityCard.js';

type Suggestion = { _id?: string; title: string; reason?: string; minutes?: number };

export default function Workouts() {
  const [input, setInput] = useState('mona@example.com');
  const [email, setEmail] = useState(input);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmail(input.trim());
  }

  return <>
    <form onSubmit={submit} className="mb-3">
      <label htmlFor="workout-email" className="form-label">E-mail da pessoa</label>
      <div className="d-flex gap-2 flex-wrap">
        <input id="workout-email" type="email" className="form-control w-auto" value={input} onChange={(event) => setInput(event.target.value)} required />
        <button type="submit" className="btn btn-primary">Buscar sugestões</button>
      </div>
    </form>
    <CapabilityCard<Suggestion> key={email} title="Sugestões de treino" path={`/api/workouts/suggestions/${encodeURIComponent(email)}`} collection="suggestions" emptyText="Nenhuma sugestão encontrada.">
      {(suggestions) => <ul>{suggestions.map((suggestion, index) => <li key={suggestion._id ?? index}><strong>{suggestion.title}</strong>{suggestion.minutes != null && ` - ${suggestion.minutes} minutos`}{suggestion.reason && <p>{suggestion.reason}</p>}</li>)}</ul>}
    </CapabilityCard>
  </>;
}
