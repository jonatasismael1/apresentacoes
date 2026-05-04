import { useState, useEffect, useCallback } from 'react';
import type { Presentation } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'dbe_apresentacoes';

export const useStorage = () => {
  const [presentations, setPresentations] = useState<Presentation[]>([]);

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
  }, []);

  const savePresentation = useCallback((presentation: Presentation) => {
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
  }, []);

  const deletePresentation = useCallback((id: string) => {
    setPresentations(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
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
    savePresentation,
    deletePresentation,
    duplicatePresentation,
    getPresentation,
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
        },
        {
          id: uuidv4(),
          title: 'Vídeo 2: Prova Social',
          theme: 'Resultados reais',
          audience: 'Diretores Financeiros',
          tone: 'Direto e Assertivo',
          hook: 'Como reduzimos os custos operacionais em 30% para nossos parceiros.',
          development: 'Apresentação de dados e depoimentos rápidos.',
          cta: 'Fale com um consultor agora.',
          notes: 'Usar gráficos na edição.',
          referenceLink: ''
        }
      ],
      createdAt: new Date().toISOString(),
    }
  ];
};
