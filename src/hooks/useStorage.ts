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

const STORAGE_KEY = 'dbe_apresentacoes';
const CLIENT_PROFILES_KEY = 'dbe_client_profiles';
const EXAMPLE_FLAG = 'dbe_is_example';
const CLOUD_API_URL = 'https://script.google.com/macros/s/AKfycbzTt15VdiCcqn9kYwQkl4oc2jQ5UL8uYJZ1k2ToMNRby4F-TJ7C7zLYKVc4HA2hI2YG/exec';
const MAX_HISTORY_ENTRIES = 20;

type CloudResponse = Presentation[] | { status: string; message?: string };
type SyncStatusMap = Record<string, SyncStatus>;

const readJsonArray = <T,>(key: string): T[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T[] : [];
  } catch {
    return [];
  }
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
    approvalStatus: presentation.approvalStatus || 'draft',
    comments: presentation.comments || [],
    history: presentation.history || [],
  };
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

const mergeByUpdatedAt = (local: Presentation[], cloud: Presentation[]): Presentation[] => {
  const byId = new Map<string, Presentation>();

  [...local.map(normalizePresentation), ...cloud.map(normalizePresentation)].forEach(item => {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      return;
    }

    const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime();
    const itemTime = new Date(item.updatedAt || item.createdAt).getTime();
    byId.set(item.id, itemTime >= existingTime ? item : existing);
  });

  return Array.from(byId.values());
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
    return isExample ? [] : readJsonArray<Presentation>(STORAGE_KEY).map(normalizePresentation);
  });
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>(() =>
    readJsonArray<ClientProfile>(CLIENT_PROFILES_KEY)
  );
  const [syncStatusById, setSyncStatusById] = useState<SyncStatusMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const setAndPersistPresentations = useCallback((updater: (prev: Presentation[]) => Presentation[]) => {
    setPresentations(prev => {
      const updated = updater(prev).map(normalizePresentation);
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
        setAndPersistPresentations(prev => mergeByUpdatedAt(prev, cloudData));
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
    };

    window.addEventListener('online', handleOnline);
    processQueue();
    const initialFetch = window.setTimeout(() => {
      void fetchFromCloud();
    }, 0);

    return () => {
      window.clearTimeout(initialFetch);
      window.removeEventListener('online', handleOnline);
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
      archived = { ...touchPresentation(item), archivedAt };
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
      const { archivedAt: _archivedAt, ...rest } = item;
      void _archivedAt;
      restored = touchPresentation(rest);
      return restored;
    }));
    if (restored) {
      markSyncStatus(id, 'syncing');
      void submitToGoogleScript(restored, 'save').then(status => markSyncStatus(id, status));
    }
  }, [markSyncStatus, setAndPersistPresentations, submitToGoogleScript]);

  const deletePresentation = useCallback((id: string) => {
    setAndPersistPresentations(prev => prev.filter(p => p.id !== id));
    markSyncStatus(id, 'syncing');
    void submitToGoogleScript({ action: 'delete', id }, 'delete').then(status => markSyncStatus(id, status));
  }, [markSyncStatus, setAndPersistPresentations, submitToGoogleScript]);

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
      approvalStatus: 'draft',
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
      updatedPresentation = touchPresentation({ ...item, approvalStatus });
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
