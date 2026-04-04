import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, clearToken, formatDate, getToken, setToken } from './lib';
import type { LoginResponse, Post, Variant, WorkspaceBundle } from './types';

function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function App() {
  const [tokenReady, setTokenReady] = useState(Boolean(getToken()));
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceBundle | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostVariants, setSelectedPostVariants] = useState<Variant[]>([]);
  const [scheduleAt, setScheduleAt] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedPost = useMemo(() => posts.find((item) => item.id === selectedPostId) ?? null, [posts, selectedPostId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [workspaceData, postsData, logsData] = await Promise.all([
        api<WorkspaceBundle>('/api/workspace'),
        api<Post[]>('/api/posts'),
        api<any[]>('/api/logs')
      ]);
      setWorkspace(workspaceData);
      setPosts(postsData);
      setLogs(logsData);
      if (!selectedPostId && postsData[0]) {
        setSelectedPostId(postsData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tokenReady) {
      void loadAll();
    }
  }, [tokenReady]);

  useEffect(() => {
    async function loadPostDetails() {
      if (!selectedPostId) return;
      try {
        const data = await api<{ post: Post; variants: Variant[] }>(`/api/posts/${selectedPostId}`);
        setSelectedPostVariants(data.variants);
      } catch {
        setSelectedPostVariants([]);
      }
    }
    void loadPostDetails();
  }, [selectedPostId]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const data = await api<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      setToken(data.token);
      setTokenReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  async function handleCreatePost(event: FormEvent) {
    event.preventDefault();
    if (!draftBody.trim()) return;
    setError(null);
    try {
      const post = await api<Post>('/api/posts', {
        method: 'POST',
        body: JSON.stringify({ title: draftTitle || null, body: draftBody })
      });
      setDraftTitle('');
      setDraftBody('');
      await loadAll();
      setSelectedPostId(post.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  }

  async function generateVariants() {
    if (!selectedPost) return;
    setError(null);
    try {
      const data = await api<Variant[]>(`/api/posts/${selectedPost.id}/variants`, {
        method: 'POST',
        body: JSON.stringify({ count: 3 })
      });
      setSelectedPostVariants(data);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Variant generation failed');
    }
  }

  async function selectVariant(variantId: string) {
    if (!selectedPost) return;
    await api(`/api/posts/${selectedPost.id}/select-variant/${variantId}`, { method: 'POST' });
    await loadAll();
  }

  async function approvePost() {
    if (!selectedPost) return;
    await api(`/api/posts/${selectedPost.id}/approve`, { method: 'POST' });
    await loadAll();
  }

  async function publishNow() {
    if (!selectedPost) return;
    await api(`/api/posts/${selectedPost.id}/publish-now`, { method: 'POST' });
    await loadAll();
  }

  async function schedulePost() {
    if (!selectedPost || !scheduleAt) return;
    const iso = new Date(scheduleAt).toISOString();
    await api(`/api/posts/${selectedPost.id}/schedule`, { method: 'POST', body: JSON.stringify({ scheduledFor: iso }) });
    await loadAll();
  }

  async function pauseResume(paused: boolean) {
    await api('/api/workspace/publishing', { method: 'PATCH', body: JSON.stringify({ paused }) });
    await loadAll();
  }

  async function configureWebhook() {
    await api('/api/workspace/set-webhook', { method: 'POST' });
    await loadAll();
  }

  if (!tokenReady) {
    return (
      <div className="login-shell">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="eyebrow">Channel OS</div>
          <h1>Вход в операторскую</h1>
          <p>Это панель управления Telegram-каналом: черновики, очередь, публикации и AI-перепаковка.</p>
          <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email" type="email" />
          <input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" type="password" />
          <button type="submit">Войти</button>
          {error ? <div className="error-box">{error}</div> : null}
        </form>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Telegram Channel OS</div>
          <h1>{workspace?.workspace.name ?? 'Workspace'}</h1>
        </div>
        <div className="topbar-actions">
          <button className="secondary" onClick={() => configureWebhook()}>Set webhook</button>
          <button className="secondary" onClick={() => { clearToken(); location.reload(); }}>Выход</button>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      <div className="grid top-grid">
        <Section title="Статус">
          <div className="stats">
            <div className="stat"><span>Канал</span><strong>{workspace?.channel.title ?? '—'}</strong></div>
            <div className="stat"><span>Channel ID</span><strong>{workspace?.channel.telegram_channel_id ?? 'не задан'}</strong></div>
            <div className="stat"><span>Бот</span><strong>{workspace?.channel.bot_enabled ? 'включён' : 'выключен'}</strong></div>
            <div className="stat"><span>Пауза</span><strong>{workspace?.publishingRules.paused ? 'да' : 'нет'}</strong></div>
          </div>
          <div className="inline-actions">
            <button className="secondary" onClick={() => pauseResume(true)}>Пауза</button>
            <button className="secondary" onClick={() => pauseResume(false)}>Resume</button>
            <button className="secondary" onClick={() => void loadAll()}>{loading ? 'Обновляем...' : 'Обновить'}</button>
          </div>
        </Section>

        <Section title="Новый черновик">
          <form className="stack" onSubmit={handleCreatePost}>
            <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Заголовок (опционально)" />
            <textarea value={draftBody} onChange={(e) => setDraftBody(e.target.value)} placeholder="Текст поста" rows={8} />
            <button type="submit">Создать пост</button>
          </form>
        </Section>
      </div>

      <div className="grid main-grid">
        <Section title="Посты">
          <div className="post-list">
            {posts.map((post) => (
              <button key={post.id} className={`post-card ${selectedPostId === post.id ? 'active' : ''}`} onClick={() => setSelectedPostId(post.id)}>
                <div className="post-card-top">
                  <strong>{post.title ?? 'Без названия'}</strong>
                  <span className={`badge status-${post.status}`}>{post.status}</span>
                </div>
                <p>{post.body.slice(0, 180)}{post.body.length > 180 ? '…' : ''}</p>
                <small>Schedule: {formatDate(post.scheduled_for)}</small>
              </button>
            ))}
          </div>
        </Section>

        <Section
          title={selectedPost ? 'Редактор поста' : 'Выбери пост'}
          actions={selectedPost ? (
            <div className="inline-actions">
              <button className="secondary" onClick={() => generateVariants()}>AI variants</button>
              <button className="secondary" onClick={() => approvePost()}>Approve</button>
              <button className="secondary" onClick={() => publishNow()}>Publish now</button>
            </div>
          ) : null}
        >
          {selectedPost ? (
            <div className="stack">
              <div className="editor-body">{selectedPost.body}</div>
              <div className="schedule-box">
                <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                <button className="secondary" onClick={() => schedulePost()}>Schedule</button>
              </div>
              <div>
                <h3>Варианты</h3>
                <div className="variant-list">
                  {selectedPostVariants.length === 0 ? <div className="muted">Пока пусто. Нажми AI variants.</div> : null}
                  {selectedPostVariants.map((variant) => (
                    <div key={variant.id} className="variant-card">
                      <div className="variant-top">
                        <strong>Вариант {variant.variant_index}</strong>
                        <button className="secondary" onClick={() => selectVariant(variant.id)}>Выбрать</button>
                      </div>
                      <p>{variant.body}</p>
                      <small>{variant.provider ?? '—'} / {variant.model ?? '—'}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : <div className="muted">Выбери пост слева.</div>}
        </Section>
      </div>

      <Section title="Логи">
        <div className="log-list">
          {logs.map((log) => (
            <div key={log.id} className="log-item">
              <strong>{log.action}</strong>
              <span>{log.entity_type}</span>
              <small>{formatDate(log.created_at)}</small>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
