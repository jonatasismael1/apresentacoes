import { useState, useEffect, useCallback } from 'react';
import type { Presentation } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'dbe_apresentacoes';
const CLOUD_API_URL = 'https://script.google.com/macros/s/AKfycbzTt15VdiCcqn9kYwQkl4oc2jQ5UL8uYJZ1k2ToMNRby4F-TJ7C7zLYKVc4HA2hI2YG/exec';

const fetchJsonp = <T,>(url: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_callback_${Date.now()}_${Math.round(Math.random() * 100000)}`;

    const script = document.createElement('script');
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}&_=${Date.now()}`;
    script.async = true;
    script.crossOrigin = 'anonymous';

    const cleanup = () => {
      delete (window as any)[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Tempo de resposta esgotado. Verifique sua conexão e tente novamente.'));
    }, 15000);

    (window as any)[callbackName] = (data: T) => {
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

const EXAMPLE_FLAG = 'dbe_is_example';

export const useStorage = () => {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Função utilitária para envio via fetch no-cors com FormData
  const submitToGoogleScript = async (payload: unknown) => {
    console.log('[Cloud Sync] Enviando payload via fetch no-cors:', payload);

    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));

    await fetch(CLOUD_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formData,
    });

    console.log('[Cloud Sync] POST no-cors enviado para Apps Script.');
  };

  // Função para salvar na nuvem (Sheets)
  const saveToCloud = async (presentation: Presentation) => {
    try {
      console.log('[Cloud Sync] Enviando apresentação para Google Sheets');
      await submitToGoogleScript(presentation);
    } catch (error) {
      console.error('[Cloud Sync] Erro ao enviar apresentação:', error);
    }
  };

  // Função para deletar da nuvem
  const deleteFromCloud = async (id: string) => {
    try {
      console.log('[Cloud Sync] Enviando exclusão para Google Sheets');
      await submitToGoogleScript({ action: 'delete', id });
    } catch (error) {
      console.error('[Cloud Sync] Erro ao excluir apresentação:', error);
    }
  };

  // Função para carregar da nuvem via JSONP (Bypasses CORS)
  const fetchFromCloud = useCallback(async (isManual = false) => {
    setIsLoading(true);
    if (isManual) setSyncError(null);

    try {
      console.log('[Cloud Sync] Buscando dados da nuvem via JSONP...');

      const cloudData = await fetchJsonp<Presentation[] | { status: string; message?: string }>(CLOUD_API_URL);

      if (Array.isArray(cloudData) && cloudData.length > 0) {
        console.log(`[Cloud Sync] ${cloudData.length} apresentações carregadas da nuvem.`);
        // Cloud data ALWAYS wins - overwrite everything including example data
        setPresentations(cloudData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
        localStorage.removeItem(EXAMPLE_FLAG); // Mark as real data
        setSyncError(null); // Clear any previous error on success
        return;
      }

      if (Array.isArray(cloudData) && cloudData.length === 0) {
        console.log('[Cloud Sync] Nuvem retornou lista vazia — mantendo dados locais.');
        return;
      }

      if (cloudData && (cloudData as any).status === 'error') {
        const msg = (cloudData as any).message || 'Erro desconhecido';
        console.error('[Cloud Sync] Erro retornado pelo Apps Script:', msg);
        if (isManual) setSyncError(msg);
        return;
      }

      console.error('[Cloud Sync] Resposta inesperada da nuvem:', cloudData);

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha de conexão';
      console.error('[Cloud Sync] Erro ao carregar dados via JSONP:', msg);
      // Only show error to user if they triggered it manually
      if (isManual) setSyncError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const isExample = localStorage.getItem(EXAMPLE_FLAG) === '1';
    
    if (stored && !isExample) {
      // Has real local data — show immediately while we refresh from cloud
      try {
        setPresentations(JSON.parse(stored));
      } catch (e) {
        console.error('Erro ao carregar dados do localStorage', e);
      }
    } else {
      // No data or only example: show empty list while cloud loads
      // Don't populate example data to avoid confusion
      setPresentations([]);
    }

    // Always fetch from cloud on startup
    fetchFromCloud();
  }, [fetchFromCloud]);

  const savePresentationLocal = useCallback((presentation: Presentation) => {
    setPresentations(prev => {
      const index = prev.findIndex(p => p.id === presentation.id);
      let updated: Presentation[];
      
      if (index >= 0) {
        updated = [...prev];
        updated[index] = presentation;
      } else {
        updated = [...prev, presentation];
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      localStorage.removeItem(EXAMPLE_FLAG); // Any save marks data as real
      return updated;
    });
  }, []);

  const savePresentation = useCallback((presentation: Presentation) => {
    // 1. Salva localmente primeiro (garante funcionamento offline e velocidade)
    savePresentationLocal(presentation);

    // 2. Tenta sincronizar com a nuvem
    saveToCloud(presentation);
  }, [savePresentationLocal]);

  const deletePresentation = useCallback((id: string) => {
    setPresentations(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Tenta remover da nuvem
    deleteFromCloud(id);
  }, []);

  const duplicatePresentation = useCallback((id: string) => {
    const original = presentations.find(p => p.id === id);
    if (original) {
      const duplicated: Presentation = {
        ...original,
        id: uuidv4(),
        title: `${original.title} (Cópia)`,
        createdAt: new Date().toISOString(),
      };
      savePresentation(duplicated);
      return duplicated.id;
    }
  }, [presentations, savePresentation]);

  const getPresentation = useCallback((id: string) => {
    return presentations.find(p => p.id === id);
  }, [presentations]);

  return {
    presentations,
    isLoading,
    syncError,
    savePresentation,
    savePresentationLocal,
    deletePresentation,
    duplicatePresentation,
    getPresentation,
    refresh: fetchFromCloud,
    manualRefresh: () => fetchFromCloud(true),
  };
};

