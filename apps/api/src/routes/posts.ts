import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from './middleware.js';
import { getWorkspaceBundle } from '../services/workspace.service.js';
import { createPost, getPost, listPosts, listVariants, replacePostBodyWithVariant, saveVariants, setPostStatus, setScheduled, updatePost } from '../services/posts.service.js';
import { generateVariants } from '../services/ai.service.js';
import { sendChannelMessage } from '../services/telegram.service.js';
import { markPublished, markFailed } from '../services/posts.service.js';

export const postsRouter = Router();

postsRouter.get('/api/posts', requireAuth, async (req, res) => {
  const bundle = await getWorkspaceBundle();
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const posts = await listPosts(bundle.workspace.id, status);
  res.json(posts);
});

postsRouter.post('/api/posts', requireAuth, async (req, res) => {
  const schema = z.object({ title: z.string().optional().nullable(), body: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const bundle = await getWorkspaceBundle();
  const post = await createPost(bundle.workspace.id, parsed.data);
  res.status(201).json(post);
});

postsRouter.get('/api/posts/:postId', requireAuth, async (req, res) => {
  const post = await getPost(String(req.params.postId));
  if (!post) return res.status(404).json({ message: 'Not found' });
  const variants = await listVariants(post.id);
  res.json({ post, variants });
});

postsRouter.patch('/api/posts/:postId', requireAuth, async (req, res) => {
  const schema = z.object({ title: z.string().optional().nullable(), body: z.string().optional(), status: z.enum(['draft','approved','scheduled','published','failed','archived']).optional(), scheduledFor: z.string().datetime().optional().nullable() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const bundle = await getWorkspaceBundle();
  const post = await updatePost(String(req.params.postId), bundle.workspace.id, parsed.data);
  if (!post) return res.status(404).json({ message: 'Not found' });
  res.json(post);
});

postsRouter.post('/api/posts/:postId/approve', requireAuth, async (req, res) => {
  const bundle = await getWorkspaceBundle();
  const post = await setPostStatus(String(req.params.postId), bundle.workspace.id, 'approved');
  if (!post) return res.status(404).json({ message: 'Not found' });
  res.json(post);
});

postsRouter.post('/api/posts/:postId/schedule', requireAuth, async (req, res) => {
  const schema = z.object({ scheduledFor: z.string().datetime() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const bundle = await getWorkspaceBundle();
  const post = await setScheduled(String(req.params.postId), bundle.workspace.id, parsed.data.scheduledFor);
  if (!post) return res.status(404).json({ message: 'Not found' });
  res.json(post);
});

postsRouter.post('/api/posts/:postId/publish-now', requireAuth, async (req, res) => {
  const bundle = await getWorkspaceBundle();
  const post = await getPost(String(req.params.postId));
  if (!post) return res.status(404).json({ message: 'Not found' });
  try {
    const result = await sendChannelMessage(post.body);
    const published = await markPublished(post.id, bundle.workspace.id, String(result.message_id));
    res.json(published);
  } catch (error) {
    await markFailed(post.id, bundle.workspace.id, error instanceof Error ? error.message : 'Publish error');
    res.status(500).json({ message: error instanceof Error ? error.message : 'Publish error' });
  }
});

postsRouter.post('/api/posts/:postId/variants', requireAuth, async (req, res) => {
  const schema = z.object({ count: z.number().int().min(1).max(5).default(3) });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const bundle = await getWorkspaceBundle();
  const post = await getPost(String(req.params.postId));
  if (!post) return res.status(404).json({ message: 'Not found' });

  const variants = await generateVariants({
    body: post.body,
    voice: bundle.styleProfile.voice,
    bannedPhrases: bundle.styleProfile.banned_phrases ?? [],
    count: parsed.data.count
  });
  await saveVariants(post.id, variants);
  res.json(await listVariants(post.id));
});

postsRouter.post('/api/posts/:postId/select-variant/:variantId', requireAuth, async (req, res) => {
  const bundle = await getWorkspaceBundle();
  const post = await replacePostBodyWithVariant(String(req.params.postId), String(req.params.variantId), bundle.workspace.id);
  if (!post) return res.status(404).json({ message: 'Variant not found' });
  res.json(post);
});
