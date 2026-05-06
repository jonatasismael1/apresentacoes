# DBE Roteiros Design System

## Objetivo

O app deve parecer uma ferramenta operacional para criação, revisão e leitura de roteiros. A interface prioriza clareza, velocidade de leitura, estados confiáveis e ações previsíveis.

## Princípios

- Interfaces densas, mas organizadas.
- Ações principais sempre claras: criar, editar, visualizar, exportar e ler no teleprompter.
- Estados visíveis: local, sincronizando, sincronizado, pendente, erro, arquivado e aprovado.
- Cards só para itens repetidos, modais e blocos de ferramenta.
- Evitar duplicar comandos equivalentes na mesma superfície.

## Cores

- Azul DBE: `#0090D0`, usado para ações primárias, foco e progresso.
- Verde DBE: `#4BB65B`, usado para sucesso, aprovação e estados concluídos.
- Fundo principal: `#0A0A0A`.
- Superfície: `#000000` ou `#18181b` quando precisar separar blocos.
- Borda padrão: `#27272a`.
- Texto primário: `#ffffff`.
- Texto secundário: `#a1a1aa`.
- Texto auxiliar: `#71717a`.
- Erro: vermelho Tailwind `red-400/red-500`.
- Aviso: amarelo Tailwind `yellow-400/yellow-500`.

## Tipografia

- Interface: Inter.
- Destaques de apresentação: Montserrat.
- Evitar uppercase em textos longos.
- Uppercase fica reservado para labels curtas, badges e metadados.
- Títulos em painéis devem ser compactos; títulos hero só no preview/apresentação.

## Componentes

### Botões

- Primário: `btn-primary`, para a ação principal da tela.
- Secundário: `btn-secondary`, para comandos seguros e frequentes.
- Ícone/ghost: `btn-ghost`, para ações auxiliares.
- Destrutivo deve usar vermelho e confirmação quando for permanente.

### Cards

- Raio máximo padrão: `12px`.
- Usar cards para apresentações, roteiros, histórico e modais.
- Não colocar cards decorativos dentro de cards sem necessidade funcional.

### Estados Vazios

Todo estado vazio deve ter:

- ícone simples;
- frase curta;
- próxima ação possível;
- opção de sincronizar quando envolver nuvem.

## Mobile

- Toolbar com ícones e texto curto.
- Tabelas devem virar rolagem horizontal ou cards.
- Teleprompter deve priorizar área de leitura, controles ocultáveis e modo ensaio.
- Respeitar áreas seguras de PWA em iOS/Android.

## Teleprompter

- Debug fica oculto por padrão.
- Modo ensaio mantém controles visíveis e fonte reduzida.
- Sempre exibir progresso e tempo estimado.
- Play deve passar por contagem regressiva quando iniciar.

## Exportação

- HTML/PDF/DOCX devem ter opções claras: capa, objetivo, roteiros selecionados e comentários.
- Conteúdo vindo do usuário deve ser escapado antes de entrar em HTML exportado.
- PDF usa o fluxo de impressão do HTML, mantendo layout limpo e legível.
