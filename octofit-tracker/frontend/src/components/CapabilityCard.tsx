import { useEffect, useState, type ReactNode } from 'react';
import { getJson } from '../api/client.js';

type Props<T> = {
  title: string;
  path: string;
  collection: string;
  emptyText: string;
  children: (items: T[]) => ReactNode;
};

export function CapabilityCard<T>({ title, path, collection, emptyText, children }: Props<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<Record<string, T[]>>(path)
      .then((data) => {
        if (!Array.isArray(data[collection])) throw new Error('Resposta inválida');
        if (active) setItems(data[collection]);
      })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [path, collection]);

  return <section><h2>{title}</h2>
    {error ? <p role="alert">Não foi possível carregar os dados.</p>
      : items === null ? <p role="status">Carregando dados...</p>
      : items.length === 0 ? <p>{emptyText}</p>
      : children(items)}
  </section>;
}
