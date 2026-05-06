import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { ExportOptions, Presentation, Script } from '../types';
import { dbeLogoBase64 } from '../constants/dbeLogo';

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeCover: true,
  includeObjective: true,
  includeScripts: true,
  scriptIds: [],
  includeComments: true,
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export function normalizeExportOptions(options: Partial<ExportOptions>): ExportOptions {
  return { ...DEFAULT_EXPORT_OPTIONS, ...options };
}

export function getExportScripts(data: Presentation, options: ExportOptions): Script[] {
  if (!options.includeScripts) return [];
  if (options.scriptIds.length === 0) return data.scripts;
  return data.scripts.filter(script => options.scriptIds.includes(script.id));
}

export function generateStandaloneHTML(data: Presentation, optionsInput: Partial<ExportOptions> = {}) {
  const options = normalizeExportOptions(optionsInput);
  const scripts = getExportScripts(data, options);
  const lineBreaks = (value: string) => escapeHtml(value).replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DBE - ${escapeHtml(data.clientName)}</title>
  <style>
    :root {
      --blue: ${data.primaryColor || '#006f9f'};
      --green: #00b851;
      --ink: #102331;
      --muted: #5e7180;
      --paper: #f4f9fb;
      --line: #dce9ef;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: var(--ink);
      background: var(--paper);
      line-height: 1.55;
    }
    .page {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 40px 0 60px;
    }
    .hero, .card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 22px;
      box-shadow: 0 18px 54px rgba(0, 74, 114, .10);
    }
    .hero {
      padding: 34px;
      display: grid;
      grid-template-columns: 190px 1fr;
      gap: 30px;
      align-items: center;
      margin-bottom: 24px;
    }
    .logo-wrap {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px;
      background: #fff;
    }
    .logo { width: 100%; display: block; }
    .eyebrow {
      display: inline-flex;
      padding: 7px 11px;
      border-radius: 999px;
      background: rgba(0,184,81,.10);
      color: var(--blue);
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    h1 {
      margin: 0;
      color: var(--blue);
      font-size: clamp(30px, 4vw, 52px);
      line-height: 1.05;
      letter-spacing: -0.035em;
    }
    h2 {
      margin: 0;
      color: var(--blue);
      font-size: 28px;
      line-height: 1.15;
    }
    .subtitle { margin: 14px 0 0; color: var(--muted); font-size: 18px; }
    .meta { margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px; }
    .pill {
      padding: 9px 13px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--blue);
      font-weight: 700;
      font-size: 13px;
    }
    .grid { display: grid; gap: 20px; }
    .card { padding: 26px; break-inside: avoid; }
    .card-top {
      display: grid;
      grid-template-columns: 54px 1fr;
      gap: 16px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .number {
      width: 54px;
      height: 54px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--blue), var(--green));
      color: #fff;
      font-weight: 800;
    }
    .block { padding: 14px 0; border-bottom: 1px solid rgba(220, 233, 239, .8); }
    .block:last-child { border-bottom: 0; }
    .label {
      color: var(--green);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-size: 12px;
      margin-bottom: 8px;
    }
    p { margin: 0; font-size: 16px; }
    .footer { text-align: center; margin-top: 32px; color: var(--muted); font-size: 13px; }
    @media print {
      body { background: #fff; }
      .page { width: 100%; padding: 0; }
      .hero, .card { box-shadow: none; }
      .card { page-break-inside: avoid; margin-bottom: 18px; }
    }
    @media (max-width: 760px) {
      .page { width: min(100% - 22px, 1120px); padding: 22px 0 40px; }
      .hero { grid-template-columns: 1fr; padding: 24px; }
      .logo-wrap { max-width: 210px; }
    }
  </style>
</head>
<body>
  <main class="page">
    ${options.includeCover ? `
    <header class="hero">
      <div class="logo-wrap"><img class="logo" src="${dbeLogoBase64}" alt="Logo DBE" /></div>
      <div>
        <div class="eyebrow">Roteiros para aprovação</div>
        <h1>${escapeHtml(data.title)}</h1>
        ${options.includeObjective && data.objective ? `<p class="subtitle">${lineBreaks(data.objective)}</p>` : ''}
        <div class="meta">
          <span class="pill">Cliente: ${escapeHtml(data.clientName)}</span>
          <span class="pill">Formato: ${escapeHtml(data.format || 'Não informado')}</span>
          <span class="pill">Responsável: ${escapeHtml(data.responsible || 'DBE')}</span>
        </div>
      </div>
    </header>` : ''}

    ${!options.includeCover && options.includeObjective && data.objective ? `
      <article class="card">
        <div class="label">Objetivo</div>
        <p>${lineBreaks(data.objective)}</p>
      </article>
    ` : ''}

    <section class="grid">
      ${scripts.map((script, index) => `
        <article class="card" id="roteiro-${index + 1}">
          <div class="card-top">
            <span class="number">${(index + 1).toString().padStart(2, '0')}</span>
            <div>
              <h2>${escapeHtml(script.title || `Roteiro ${index + 1}`)}</h2>
              <p style="color: var(--muted); margin-top: 8px;">Tonalidade: ${escapeHtml(script.tone || 'Não informada')}</p>
            </div>
          </div>
          <section class="block"><div class="label">Gancho</div><p>${lineBreaks(script.hook || '-')}</p></section>
          <section class="block"><div class="label">Desenvolvimento</div><p>${lineBreaks(script.development || '-')}</p></section>
          <section class="block"><div class="label">CTA</div><p>${lineBreaks(script.cta || '-')}</p></section>
          ${script.notes ? `<section class="block"><div class="label">Observações</div><p><i>${lineBreaks(script.notes)}</i></p></section>` : ''}
          ${script.referenceLink ? `<section class="block"><div class="label">Referência</div><p><a href="${escapeHtml(script.referenceLink)}">${escapeHtml(script.referenceLink)}</a></p></section>` : ''}
        </article>
      `).join('')}
    </section>

    ${options.includeComments && data.comments?.length ? `
      <article class="card" style="margin-top: 20px;">
        <div class="label">Comentários e aprovação</div>
        ${data.comments.map(comment => `<p style="margin-top: 10px;"><strong>${escapeHtml(comment.author)}:</strong> ${lineBreaks(comment.message)}</p>`).join('')}
      </article>
    ` : ''}

    <footer class="footer">DBE - Dos Bastidores ao Espetáculo</footer>
  </main>
</body>
</html>`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadHtmlDocument(data: Presentation, options: ExportOptions) {
  const htmlContent = generateStandaloneHTML(data, options);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, `DBE-${data.clientName.replace(/\s+/g, '-')}.html`);
}

export async function downloadDocxDocument(data: Presentation, options: ExportOptions) {
  const scripts = getExportScripts(data, options);
  const children: Paragraph[] = [];

  if (options.includeCover) {
    children.push(
      new Paragraph({
        text: data.title || 'Apresentação DBE',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        text: `Cliente: ${data.clientName}`,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ text: '' }),
    );
  }

  if (options.includeObjective && data.objective) {
    children.push(
      new Paragraph({ text: 'Objetivo', heading: HeadingLevel.HEADING_1 }),
      new Paragraph(data.objective),
      new Paragraph({ text: '' }),
    );
  }

  scripts.forEach((script, index) => {
    children.push(
      new Paragraph({
        text: `${index + 1}. ${script.title || `Roteiro ${index + 1}`}`,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({ children: [new TextRun({ text: 'Gancho', bold: true })] }),
      new Paragraph(script.hook || '-'),
      new Paragraph({ children: [new TextRun({ text: 'Desenvolvimento', bold: true })] }),
      new Paragraph(script.development || '-'),
      new Paragraph({ children: [new TextRun({ text: 'CTA', bold: true })] }),
      new Paragraph(script.cta || '-'),
      new Paragraph({ text: '' }),
    );

    if (script.notes) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: 'Observações', bold: true })] }),
        new Paragraph(script.notes),
      );
    }
  });

  if (options.includeComments && data.comments?.length) {
    children.push(new Paragraph({ text: 'Comentários e aprovação', heading: HeadingLevel.HEADING_1 }));
    data.comments.forEach(comment => {
      children.push(new Paragraph(`${comment.author}: ${comment.message}`));
    });
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `DBE-${data.clientName.replace(/\s+/g, '-')}.docx`);
}
