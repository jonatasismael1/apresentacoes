import { getStore } from '@netlify/blobs';

const STORE_NAME = 'dbe-presentations';
const STORE_KEY = 'presentations-v1';
const DELETED_PRESENTATION_MARKER = '__DBE_DELETED__';
const LEGACY_CLOUD_API_URL = 'https://script.google.com/macros/s/AKfycbzTt15VdiCcqn9kYwQkl4oc2jQ5UL8uYJZ1k2ToMNRby4F-TJ7C7zLYKVc4HA2hI2YG/exec';

interface PresentationRecord {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  clientName?: string;
  clientSegment?: string;
  title?: string;
  objective?: string;
  format?: string;
  responsible?: string;
  date?: string;
  scripts?: unknown[];
  approvalStatus?: string;
  comments?: unknown[];
  history?: unknown[];
  [key: string]: unknown;
}

interface PresentationState {
  presentations: PresentationRecord[];
  updatedAt: string;
}

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const getPresentationTime = (presentation: PresentationRecord) => (
  new Date(presentation.updatedAt || presentation.createdAt || 0).getTime()
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isPresentation = (value: unknown): value is PresentationRecord => (
  isRecord(value) && typeof value.id === 'string'
);

const normalizePresentation = (presentation: PresentationRecord): PresentationRecord => {
  const now = new Date().toISOString();
  return {
    ...presentation,
    scripts: presentation.scripts || [],
    comments: presentation.comments || [],
    history: presentation.history || [],
    createdAt: presentation.createdAt || now,
    updatedAt: presentation.updatedAt || presentation.createdAt || now,
  };
};

const createDeletedPresentation = (id: string): PresentationRecord => {
  const deletedAt = new Date().toISOString();
  return normalizePresentation({
    id,
    clientName: DELETED_PRESENTATION_MARKER,
    clientSegment: '',
    title: DELETED_PRESENTATION_MARKER,
    objective: '',
    format: '',
    responsible: '',
    date: '',
    scripts: [],
    createdAt: deletedAt,
    updatedAt: deletedAt,
    deletedAt,
    approvalStatus: 'finalized',
    comments: [],
    history: [],
  });
};

const mergePresentations = (
  existing: PresentationRecord[],
  incoming: PresentationRecord[],
) => {
  const byId = new Map<string, PresentationRecord>();

  existing.map(normalizePresentation).forEach(item => {
    byId.set(item.id, item);
  });

  incoming.map(normalizePresentation).forEach(item => {
    const current = byId.get(item.id);
    if (!current || getPresentationTime(item) >= getPresentationTime(current)) {
      byId.set(item.id, item);
    }
  });

  return Array.from(byId.values())
    .sort((a, b) => getPresentationTime(b) - getPresentationTime(a));
};

const fetchLegacyPresentations = async () => {
  const callback = `legacy_${Date.now()}`;
  const response = await fetch(`${LEGACY_CLOUD_API_URL}?callback=${callback}&_=${Date.now()}`);
  if (!response.ok) return [];

  const text = await response.text();
  const prefix = `${callback}(`;
  if (!text.startsWith(prefix)) return [];

  const json = text.slice(prefix.length, text.endsWith(');') ? -2 : -1);
  const parsed: unknown = JSON.parse(json);
  return Array.isArray(parsed) ? parsed.filter(isPresentation).map(normalizePresentation) : [];
};

const getState = async (): Promise<PresentationState> => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  const stored = await store.get(STORE_KEY, { type: 'json' });

  if (isRecord(stored) && Array.isArray(stored.presentations)) {
    return {
      presentations: stored.presentations.filter(isPresentation).map(normalizePresentation),
      updatedAt: typeof stored.updatedAt === 'string' ? stored.updatedAt : new Date().toISOString(),
    };
  }

  const legacyPresentations = await fetchLegacyPresentations();
  const seededState = {
    presentations: legacyPresentations,
    updatedAt: new Date().toISOString(),
  };
  await store.setJSON(STORE_KEY, seededState);
  return seededState;
};

const saveState = async (presentations: PresentationRecord[]) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  const state = {
    presentations,
    updatedAt: new Date().toISOString(),
  };
  await store.setJSON(STORE_KEY, state);
  return state;
};

const getIncomingPresentations = (body: unknown) => {
  if (Array.isArray(body)) {
    return body.filter(isPresentation);
  }

  if (isPresentation(body)) {
    return [body];
  }

  if (isRecord(body) && body.action === 'delete' && typeof body.id === 'string') {
    return [createDeletedPresentation(body.id)];
  }

  return [];
};

export default async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: jsonHeaders });
  }

  if (request.method === 'GET') {
    const state = await getState();
    return Response.json(state.presentations, { headers: jsonHeaders });
  }

  if (request.method === 'POST') {
    const body: unknown = await request.json();
    const incoming = getIncomingPresentations(body);

    if (incoming.length === 0) {
      return Response.json({ status: 'error', message: 'Payload invalido' }, {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const current = await getState();
    const nextPresentations = mergePresentations(current.presentations, incoming);
    const nextState = await saveState(nextPresentations);

    return Response.json({
      status: 'ok',
      updatedAt: nextState.updatedAt,
      count: nextState.presentations.length,
    }, { headers: jsonHeaders });
  }

  return Response.json({ status: 'error', message: 'Metodo nao permitido' }, {
    status: 405,
    headers: jsonHeaders,
  });
};

export const config = {
  path: '/api/presentations',
};
