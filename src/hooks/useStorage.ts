import { useState, useEffect, useCallback } from 'react';
import type { Presentation } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'dbe_apresentacoes';
const CLOUD_API_URL = 'https://script.google.com/macros/s/AKfycbyC05QIQ1oisATuXMydDMKTGYzngOJ8y88FKGeXuvAP0JzXHnWy6NWd8oU6U1HQTXw/exec';

export const useStorage = () => {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Função para salvar na nuvem (Sheets)
  const saveToCloud = async (presentation: Presentation) => {
    try {
      console.log('Sincronizando com a nuvem...', presentation.id);
      // Usamos no-cors para evitar erros de redirecionamento do Google Apps Script
      // O Google Apps Script consegue ler o corpo mesmo sem Content-Type: application/json em no-cors
      await fetch(CLOUD_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(presentation),
      });
    } catch (error) {
      console.error('Erro ao sincronizar com Google Sheets:', error);
    }
  };

  // Função para deletar da nuvem
  const deleteFromCloud = async (id: string) => {
    try {
      await fetch(CLOUD_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'delete', id }),
      });
    } catch (error) {
      console.error('Erro ao deletar do Google Sheets:', error);
    }
  };

  // Função para carregar da nuvem
  const fetchFromCloud = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(CLOUD_API_URL);
      const cloudData = await response.json();
      if (Array.isArray(cloudData)) {
        if (cloudData.length > 0) {
          setPresentations(cloudData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados da nuvem:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (stored) {
      try {
        setPresentations(JSON.parse(stored));
      } catch (e) {
        console.error('Erro ao carregar dados do localStorage', e);
      }
    } else {
      const example = getExampleData();
      setPresentations(example);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(example));
    }

    // Tenta carregar da nuvem para manter atualizado
    fetchFromCloud();
  }, [fetchFromCloud]);

  const savePresentation = useCallback((presentation: Presentation) => {
    // 1. Atualiza o estado local primeiro (mais rápido)
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
      return updated;
    });

    // 2. Sincroniza com a nuvem (fora do setter para evitar efeitos colaterais)
    saveToCloud(presentation);
  }, []);

  const deletePresentation = useCallback((id: string) => {
    setPresentations(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Deleta da nuvem fora do setter
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
    savePresentation,
    deletePresentation,
    duplicatePresentation,
    getPresentation,
    refresh: fetchFromCloud
  };
};

const getExampleData = (): Presentation[] => {
  return [
    {
      id: uuidv4(),
      clientName: 'Cliente Exemplo',
      clientSegment: 'Tecnologia',
      title: 'Campanha de Lançamento 2026',
      objective: 'Apresentar as novas funcionalidades do software para o mercado B2B.',
      format: 'Reels / TikTok',
      responsible: 'Equipe DBE',
      date: new Date().toLocaleDateString('pt-BR'),
      scripts: [
        {
          id: uuidv4(),
          title: 'Vídeo 1: A Dor do Cliente',
          theme: 'Problemas de produtividade',
          audience: 'Gestores de TI',
          tone: 'Profissional e Empático',
          hook: 'Você já sentiu que sua equipe está perdendo tempo com processos manuais?',
          development: 'Muitas empresas sofrem com a falta de integração entre ferramentas.',
          cta: 'Clique no link da bio para testar grátis.',
          notes: 'Gravar em ambiente de escritório moderno.',
          referenceLink: 'https://youtube.com/exemplo1'
        }
      ],
      createdAt: new Date().toISOString(),
    }
  ];
};
