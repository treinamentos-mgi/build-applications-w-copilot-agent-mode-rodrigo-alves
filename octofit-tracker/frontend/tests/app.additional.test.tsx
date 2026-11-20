import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.js';

function renderRoute(route: string) {
  return render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);
}

describe('Cenários adicionais da apresentação', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('busca sugestões para o e-mail informado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ suggestions: [{ title: 'Força' }] }), { status: 200 })));
    renderRoute('/workouts');
    fireEvent.change(screen.getByLabelText(/e-mail da pessoa/i), { target: { value: 'hubot@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar sugestões/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/workouts\/suggestions\/hubot%40example\.com$/)));
    expect(await screen.findByText('Força')).toBeInTheDocument();
  });

  it('anuncia respostas com formato inválido', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ activities: null }), { status: 200 })));
    renderRoute('/activities');
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível/i);
  });
});