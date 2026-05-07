import { useState, useEffect, useCallback } from 'react';
import type {
  ApprovalComment,
  ApprovalStatus,
  ClientProfile,
  Presentation,
  PresentationVersion,
  SyncStatus,
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { addToQueue, getQueue, removeFromQueue } from '../lib/syncQueue';
import { normalizeApprovalStatus, type LegacyApprovalStatus } from '../constants/presentationStatus';

const STORAGE_KEY = 'dbe_apresentacoes';
const CLIENT_PROFILES_KEY = 'dbe_client_profiles';
const EXAMPLE_FLAG = 'dbe_is_example';
const DELETED_PRESENTATIONS_KEY = 'dbe_deleted_presentations';
const CLOUD_API_URL = 'https://script.google.com/macros/s/AKfycbzTt15VdiCcqn9kYwQkl4oc2jQ5UL8uYJZ1k2ToMNRby4F-TJ7C7zLYKVc4HA2hI2YG/exec';
const MAX_HISTORY_ENTRIES = 20;
const DELETE_TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DELETED_PRESENTATION_MARKER = '__DBE_DELETED__';

type CloudResponse = Presentation[] | { status: string; message?: string };
type SyncStatusMap = Record<string, SyncStatus>;
type TimestampMap = Record<string, number>;

const readJsonArray = <T,>(key: string): T[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T[] : [];
  } catch {
    return [];
  }
};

const readJsonObject = <T extends Record<string, unknown>>(key: string): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : {} as T;
  } catch {
    return {} as T;
  }
};

const writeJsonObject = (key: string, value: Record<string, unknown>) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const isCloudError = (data: CloudResponse): data is { status: string; message?: string } => {
  return !Array.isArray(data) && data.status === 'error';
};

const normalizePresentation = (presentation: Presentation): Presentation => {
  const now = new Date().toISOString();
  return {
    ...presentation,
    scripts: presentation.scripts ?? [],
    createdAt: presentation.createdAt || now,
    updatedAt: presentation.updatedAt || presentation.createdAt || now,
    approvalStatus: normalizeApprovalStatus(presentation.approvalStatus as LegacyApprovalStatus),
    comments: presentation.comments || [],
    history: presentation.history || [],
  };
};

const applyStatusToPresentation = (presentation: Presentation, approvalStatus: ApprovalStatus): Presentation => {
  const next: Presentation = { ...presentation, approvalStatus };
  if (approvalStatus === 'finalized') {
    return {
      ...next,
      archivedAt: presentation.archivedAt || new Date().toISOString(),
    };
  }

  const { archivedAt: _archivedAt, ...activePresentation } = next;
  void _archivedAt;
  return activePresentation;
};

const createHistoryEntry = (presentation: Presentation, label: string): PresentationVersion => {
  const { history: _history, ...snapshot } = normalizePresentation(presentation);
  void _history;
  return {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    label,
    snapshot,
  };
};

const touchPresentation = (presentation: Presentation): Presentation => ({
  ...normalizePresentation(presentation),
  updatedAt: new Date().toISOString(),
});

const getPresentationTime = (presentation: Presentation) => (
  new Date(presentation.updatedAt || presentation.createdAt).getTime()
);

const getPayloadId = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;
  const maybePayload = payload as { id?: unknown };
  return typeof maybePayload.id === 'string' ? maybePayload.id : undefined;
};

const rememberDeletedPresentation = (id: string, deletedAt = Date.now()) => {
  const deleted = readJsonObject<TimestampMap>(DELETED_PRESENTATIONS_KEY);
  deleted[id] = Math.max(deleted[id] || 0, deletedAt);
  writeJsonObject(DELETED_PRESENTATIONS_KEY, deleted);
};

const pruneDeletedPresentations = () => {
  const now = Date.now();
  const deleted = readJsonObject<TimestampMap>(DELETED_PRESENTATIONS_KEY);
  let changed = false;

  Object.entries(deleted).forEach(([id, timestamp]) => {
    if (now - timestamp > DELETE_TOMBSTONE_TTL_MS) {
      delete deleted[id];
      changed = true;
    }
  });

  if (changed) writeJsonObject(DELETED_PRESENTATIONS_KEY, deleted);
  return deleted;
};

const getDeletedTime = (presentation: Presentation) => (
  presentation.deletedAt ? new Date(presentation.deletedAt).getTime() : 0
);

const hasDeletedMarker = (presentation: Presentation) => (
  presentation.clientName === DELETED_PRESENTATION_MARKER || presentation.title === DELETED_PRESENTATION_MARKER
);

const getDeletionTime = (presentation: Presentation) => (
  getDeletedTime(presentation) || (hasDeletedMarker(presentation) ? getPresentationTime(presentation) : 0)
);

const isDeletedPresentation = (presentation: Presentation) => Boolean(getDeletionTime(presentation));

const reconcileWithCloud = (
  local: Presentation[],
  cloud: Presentation[],
  pendingSaveIds: Set<string>,
  pendingDeleteIds: Set<string>,
): Presentation[] => {
  const deletedPresentations = pruneDeletedPresentations();
  const cloudById = new Map<string, Presentation>();

  cloud.map(normalizePresentation).forEach(item => {
    const cloudDeleteTime = getDeletionTime(item);
    if (cloudDeleteTime) {
      deletedPresentations[item.id] = Math.max(deletedPresentations[item.id] || 0, cloudDeleteTime);
      rememberDeletedPresentation(item.id, cloudDeleteTime);
      return;
    }

    const deletedAt = deletedPresentations[item.id];
    if (deletedAt && deletedAt >= getPresentationTime(item)) return;
    cloudById.set(item.id, item);
  });

  local.map(normalizePresentation).forEach(item => {
    if (pendingDeleteIds.has(item.id) || deletedPresentations[item.id]) return;

    const cloudItem = cloudById.get(item.id);

    if (!cloudItem) {
      if (pendingSaveIds.has(item.id)) {
        cloudById.set(item.id, item);
      }
      return;
    }

    const localTime = getPresentationTime(item);
    const cloudTime = getPresentationTime(cloudItem);
    if (pendingSaveIds.has(item.id) && localTime >= cloudTime) {
      cloudById.set(item.id, item);
      return;
    }

  });

  return Array.from(cloudById.values())
    .sort((a, b) => getPresentationTime(b) - getPresentationTime(a));
};

const persistPresentations = (presentations: Presentation[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presentations));
  localStorage.removeItem(EXAMPLE_FLAG);
};

const fetchJsonp = <T,>(url: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_callback_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const callbacks = window as unknown as Window & Record<string, ((data: T) => void) | undefined>;
    const script = document.createElement('script');
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}&_=${Date.now()}`;
    script.async = true;
    script.crossOrigin = 'anonymous';

    const cleanup = () => {
      delete callbacks[callbackName];
      script.parentNode?.removeChild(script);
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Tempo de resposta esgotado. Verifique sua conexão e tente novamente.'));
    }, 15000);

    callbacks[callbackName] = (data: T) => {
      clearTimeout(timeout);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Não foi possível conectar à nuvem. O app funcionará offline.'));
    };

    document.body.appendChild(script);
  });
};

export const useStorage = () => {
  const [presentations, setPresentations] = useState<Presentation[]>(() => {
    const isExample = localStorage.getItem(EXAMPLE_FLAG) === '1';
    return isExample ? [] : readJsonArray<Presentation>(STORAGE_KEY)
      .map(normalizePresentation)
      .filter(item => !isDeletedPresentation(item));
  });
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>(() =>
    readJsonArray<ClientProfile>(CLIENT_PROFILES_KEY)
  );
  const [syncStatusById, setSyncStatusById] = useState<SyncStatusMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const setAndPersistPresentations = useCallback((updater: (prev: Presentation[]) => Presentation[]) => {
    setPresentations(prev => {
      const updated = updater(prev)
        .map(normalizePresentation)
        .filter(item => !isDeletedPresentation(item));
      persistPresentations(updated);
      return updated;
    });
  }, []);

  const setAndPersistClientProfiles = useCallback((updater: (prev: ClientProfile[]) => ClientProfile[]) => {
    setClientProfiles(prev => {
      const updated = updater(prev);
      localStorage.setItem(CLIENT_PROFILES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markSyncStatus = useCallback((id: string, status: SyncStatus) => {
    setSyncStatusById(prev => ({ ...prev, [id]: status }));
  }, []);

  const submitToGoogleScript = useCallback(async (payload: unknown, type: 'save' | 'delete' = 'save') => {
    if (!navigator.onLine) {
      await addToQueue(type, payload);
      return 'pending' as const;
    }

    try {
      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      await fetch(CLOUD_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
      });
      return 'synced' as const;
    } catch (error) {
      console.error('[Cloud Sync] Erro no envio, adicionando à fila:', error);
      await addToQueue(type, payload);
      return 'pending' as const;
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (!navigator.onLine) return;

    const queue = await getQueue();
    for (const item of queue) {
      try {
        const formData = new FormData();
        formData.append('payload', JSON.stringify(item.payload));
        await fetch(CLOUD_API_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: formData,
        });
        await removeFromQueue(item.id);
      } catch (error) {
        console.error(`[Sync Queue] Falha ao enviar item ${item.id}.`, error);
      }
    }
  }, []);

  const fetchFromCloud = useCallback(async (isManual = false) => {
    setIsLoading(true);
    if (isManual) setSyncError(null);

    try {
      const cloudData = await fetchJsonp<CloudResponse>(CLOUD_API_URL);

      if (Array.isArray(cloudData)) {
        const queue = await getQueue();
        const pendingSaveIds = new Set<string>();
        const pendingDeleteIds = new Set<string>();

        queue.forEach(item => {
          const id = getPayloadId(item.payload);
          if (!id) return;
          if (item.type === 'delete') pendingDeleteIds.add(id);
          else pendingSaveIds.add(id);
        });

        setAndPersistPresentations(prev => reconcileWithCloud(prev, cloudData, pendingSaveIds, pendingDeleteIds));
        setSyncError(null);
        return;
      }

      if (isCloudError(cloudData)) {
        const msg = cloudData.message || 'Erro desconhecido';
        if (isManual) setSyncError(msg);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha de conexão';
      if (isManual) setSyncError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [setAndPersistPresentations]);

  useEffect(() => {
    const handleOnline = () => {
      processQueue();
      void fetchFromCloud();
    };
    const handleFocus = () => {
      void fetchFromCloud();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchFromCloud();
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setPresentations(readJsonArray<Presentation>(STORAGE_KEY)
          .map(normalizePresentation)
          .filter(item => !isDeletedPresentation(item)));
      }
      if (event.key === CLIENT_PROFILES_KEY) {
        setClientProfiles(readJsonArray<ClientProfile>(CLIENT_PROFILES_KEY));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    processQueue();
    const initialFetch = window.setTimeout(() => {
      void fetchFromCloud();
    }, 0);
    const refreshInterval = window.setInterval(() => {
      void fetchFromCloud();
    }, 30000);

    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(refreshInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchFromCloud, processQueue]);

  const savePresentationLocal = useCallback((presentation: Presentation) => {
    const touched = touchPresentation(presentation);
    setAndPersistPresentations(prev => {
      const index = prev.findIndex(p => p.id === touched.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = touched;
        return updated;
      }
      return [...prev, touched];
    });
    markSyncStatus(touched.id, 'local');
    return touched;
  }, [markSyncStatus, setAndPersistPresentations]);

  const savePresentationDraft = useCallback((presentation: Presentation) => {
    const touched = touchPresentation(presentation);

    setAndPersistPresentations(prev => {
      const index = prev.findIndex(p => p.id === touched.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = touched;
        return updated;
      }
      return [...prev, touched];
    });

    markSyncStatus(touched.id, 'syncing');
    void submitToGoogleScript(touched, 'save').then(status => markSyncStatus(touched.id, status));
    return touched;
  }, [markSyncStatus, setAndPersistPresentations, submitToGoogleScript]);

  const savePresentation = useCallback((presentation: Presentation, label = 'Salvar manual') => {
    const current = normalizePresentation(presentation);
    const version = createHistoryEntry(current, label);
    const touched: Presentation = {
      ...touchPresentation(current),
      history: [version, ...(current.history || [])].slice(0, MAX_HISTORY_ENTRIES),
    };

    setAndPersistPresentations(prev => {
      const index = prev.findIndex(p => p.id === touched.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = touched;
        return updated;
      }
      return [...prev, touched];
    });

    markSyncStatus(touched.id, 'syncing');
    void submitToGoogleScript(touched, 'save').then(status => markSyncStatus(touched.id, status));
    return touched;
  }, [markSyncStatus, setAndPersistPresentations, submitToGoogleScript]);

  const archivePresentation = useCallback((id: string) => {
    const archivedAt = new Date().toISOString();
    let archived: Presentation | undefined;
    setAndPersistPresentations(prev => prev.map(item => {
      if (item.id !== id) return item;
      archived = { ...touchPresentation(item), archivedAt, approvalStatus: 'finalized' };
      return archived;
    }));
    if (archived) {
      markSyncStatus(id, 'syncing');
      void submitToGoogleScript(archived, 'save').then(status => markSyncStatus(id, status));
    }
  }, [markSyncStatus, setAndPersistPresentations, submitToGoogleScript]);

  const restorePresentation = useCallback((id: string) => {
    let restored: Presentation | undefined;
    setAndPersistPresentations(prev => prev.map(item => {
      if (item.id !== id) return item;
      const { archivedAt: _archivedAt, deletedAt: _deletedAt, ...rest } = item;
      void _archivedAt;
      void _deletedAt;
      restored = touchPresentation({ ...rest, approvalStatus: normalizeApprovalStatus(rest.approvalStatus) === 'finalized' ? 'sent' : normalizeApprovalStatus(rest.approvalStatus) });
      return restored;
    }));
    if (restored) {
      markSyncStatus(id, 'syncing');
      void submitToGoogleScript(restored, 'save').then(status => markSyncStatus(id, status));
    }
  }, [markSyncStatus, setAndPersistPresentations, submitToGoogleScript]);

  const deletePresentation = useCallback((id: string) => {
    const deletedAt = new Date().toISOString();
    const existing = presentations.find(item => item.id === id);
    const deletedPresentation = touchPresentation({
      ...(existing ? normalizePresentation(existing) : {
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
        approvalStatus: 'sent' as ApprovalStatus,
        comments: [],
        history: [],
      }),
      clientName: DELETED_PRESENTATION_MARKER,
      clientSegment: '',
      title: DELETED_PRESENTATION_MARKER,
      objective: '',
      format: '',
      responsible: '',
      date: '',
      clientLogo: undefined,
      primaryColor: undefined,
      secondaryColor: undefined,
      scripts: [],
      archivedAt: undefined,
      clientProfileId: undefined,
      approvalStatus: 'finalized',
      comments: [],
      history: [],
      deletedAt,
    });

    rememberDeletedPresentation(id, getDeletionTime(deletedPresentation));
    setAndPersistPresentations(prev => prev.filter(p => p.id !== id));
    markSyncStatus(id, 'syncing');
    void submitToGoogleScript(deletedPresentation, 'save').then(status => markSyncStatus(id, status));
  }, [markSyncStatus, presentations, setAndPersistPresentations, submitToGoogleScript]);

  const duplicatePresentation = useCallback((id: string, sameClientOnly = false) => {
    const original = presentations.find(p => p.id === id);
    if (!original) return undefined;

    const duplicated: Presentation = {
      ...normalizePresentation(original),
      id: uuidv4(),
      title: sameClientOnly ? `${original.title} - novo projeto` : `${original.title} (Cópia)`,
      scripts: original.scripts.map(script => ({ ...script, id: uuidv4() })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: undefined,
      approvalStatus: 'sent',
      comments: [],
      history: [],
    };

    savePresentation(duplicated, sameClientOnly ? 'Novo projeto do mesmo cliente' : 'Duplicação');
    return duplicated.id;
  }, [presentations, savePresentation]);

  const getPresentation = useCallback((id: string) => {
    return presentations.find(p => p.id === id);
  }, [presentations]);

  const saveClientProfile = useCallback((profile: Partial<ClientProfile> & { name: string }) => {
    const now = new Date().toISOString();
    const next: ClientProfile = {
      id: profile.id || uuidv4(),
      name: profile.name,
      segment: profile.segment || '',
      logo: profile.logo,
      primaryColor: profile.primaryColor,
      secondaryColor: profile.secondaryColor,
      tone: profile.tone,
      createdAt: profile.createdAt || now,
      updatedAt: now,
    };

    setAndPersistClientProfiles(prev => {
      const index = prev.findIndex(item => item.id === next.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = next;
        return updated;
      }
      return [...prev, next];
    });
    return next;
  }, [setAndPersistClientProfiles]);

  const createClientProfileFromPresentation = useCallback((presentation: Presentation) => {
    return saveClientProfile({
      name: presentation.clientName,
      segment: presentation.clientSegment,
      logo: presentation.clientLogo,
      primaryColor: presentation.primaryColor,
      secondaryColor: presentation.secondaryColor,
      tone: presentation.scripts[0]?.tone || '',
    });
  }, [saveClientProfile]);

  const addApprovalComment = useCallback((id: string, message: string, author = 'DBE') => {
    let updatedPresentation: Presentation | undefined;
    const comment: ApprovalComment = {
      id: uuidv4(),
      author,
      message,
      createdAt: new Date().toISOString(),
    };

    setAndPersistPresentations(prev => prev.map(item => {
      if (item.id !== id) return item;
      updatedPresentation = touchPresentation({
        ...item,
        comments: [comment, ...(item.comments || [])],
      });
      return updatedPresentation;
    }));

    if (updatedPresentation) {
      markSyncStatus(id, 'syncing');
      void submitToGoogleScript(updatedPresentation, 'save').then(status => markSyncStatus(id, status));
    }
  }, [markSyncStatus, setAndPersistPresentations, submitToGoogleScript]);

  const updateApprovalStatus = useCallback((id: string, approvalStatus: ApprovalStatus) => {
    let updatedPresentation: Presentation | undefined;
    setAndPersistPresentations(prev => prev.map(item => {
      if (item.id !== id) return item;
      updatedPresentation = touchPresentation(applyStatusToPresentation(item, approvalStatus));
      return updatedPresentation;
    }));

    if (updatedPresentation) {
      markSyncStatus(id, 'syncing');
      void submitToGoogleScript(updatedPresentation, 'save').then(status => markSyncStatus(id, status));
    }
  }, [markSyncStatus, setAndPersistPresentations, submitToGoogleScript]);

  return {
    presentations,
    clientProfiles,
    syncStatusById,
    isLoading,
    syncError,
    savePresentation,
    savePresentationLocal,
    savePresentationDraft,
    archivePresentation,
    restorePresentation,
    deletePresentation,
    duplicatePresentation,
    getPresentation,
    saveClientProfile,
    createClientProfileFromPresentation,
    addApprovalComment,
    updateApprovalStatus,
    refresh: fetchFromCloud,
    manualRefresh: () => fetchFromCloud(true),
  };
};
