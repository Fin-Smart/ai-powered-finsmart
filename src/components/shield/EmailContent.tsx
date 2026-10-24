'use dom';

import { useEffect, useRef, type MouseEvent } from 'react';

type EmailContentProps = {
  /** Original HTML part; when empty, `text` is rendered instead. */
  html: string;
  text: string;
  /** Remote images can be tracking pixels or borrowed brand logos, so flagged emails hide them. */
  allowImages: boolean;
  colors: { text: string; link: string };
  /** Every link tap goes through the app so it can warn before opening. */
  onOpenLink: (url: string) => Promise<void>;
  dom?: import('expo/dom').DOMProps;
};

const BLOCKED_TAGS = 'script,noscript,iframe,frame,frameset,object,embed,applet,form,input,button,select,textarea,link,meta,base,svg';
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'xlink:href', 'formaction', 'background']);
const UNSAFE_URL = /^\s*(javascript|vbscript|data):/i;
const DATA_IMAGE = /^\s*data:image\//i;
const OPENABLE_LINK = /^(https?:|mailto:|tel:)/i;
const CSS_URL = /url\([^)]*\)/gi;

function sanitize(doc: Document, allowImages: boolean) {
  doc.querySelectorAll(BLOCKED_TAGS).forEach((element) => element.remove());

  doc.querySelectorAll('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const isUnsafeUrl =
        URL_ATTRIBUTES.has(name) && UNSAFE_URL.test(attribute.value) && !(name === 'src' && DATA_IMAGE.test(attribute.value));
      if (name.startsWith('on') || isUnsafeUrl) element.removeAttribute(attribute.name);
    }

    if (!allowImages) {
      element.removeAttribute('background');
      const style = element.getAttribute('style');
      if (style && CSS_URL.test(style)) element.setAttribute('style', style.replace(CSS_URL, 'none'));
    }
  });

  if (!allowImages) {
    doc.querySelectorAll('img').forEach((image) => {
      if (DATA_IMAGE.test(image.getAttribute('src') ?? '')) return;
      image.removeAttribute('src');
      image.removeAttribute('srcset');
      image.setAttribute('data-blocked', '');
    });
    doc.querySelectorAll('style').forEach((style) => {
      style.textContent = (style.textContent ?? '').replace(CSS_URL, 'none');
    });
  }
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function shortLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Plain-text emails: paragraphs, and long URLs shortened to their site name. */
function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const linked = escapeHtml(paragraph.trim()).replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/gi, (url) => {
        const href = url.replace(/&amp;/g, '&');
        return `<a href="${escapeHtml(href)}">${escapeHtml(shortLabel(href))}</a>`;
      });
      return `<p>${linked.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

/** Many newsletters are built at a fixed 600px+ width; zoom them out to fit the screen. */
function fitToWidth(container: HTMLElement) {
  container.style.setProperty('zoom', '1');
  const available = container.clientWidth;
  const needed = container.scrollWidth;
  if (needed > available + 1) container.style.setProperty('zoom', String(available / needed));
}

export default function EmailContent({ html, text, allowImages, colors, onOpenLink }: EmailContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isHtml = html.trim().length > 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const doc = new DOMParser().parseFromString(isHtml ? html : textToHtml(text), 'text/html');
    sanitize(doc, allowImages);
    const headStyles = Array.from(doc.head.querySelectorAll('style'))
      .map((style) => style.outerHTML)
      .join('');
    container.innerHTML = headStyles + doc.body.innerHTML;

    const refit = () => fitToWidth(container);
    refit();
    container.querySelectorAll('img').forEach((image) => image.addEventListener('load', refit, { once: true }));
    window.addEventListener('resize', refit);
    return () => window.removeEventListener('resize', refit);
  }, [allowImages, html, isHtml, text]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest('a');
    if (!anchor) return;
    event.preventDefault();
    const href = anchor.getAttribute('href')?.trim() ?? '';
    if (OPENABLE_LINK.test(href)) void onOpenLink(href);
  };

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; background: transparent; }
        .fs-email {
          box-sizing: border-box;
          width: 100%;
          padding: ${isHtml ? '16px' : '0'};
          color: ${isHtml ? '#202124' : colors.text};
          background: ${isHtml ? '#ffffff' : 'transparent'};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 15px;
          line-height: 1.55;
          overflow-wrap: anywhere;
          -webkit-text-size-adjust: 100%;
        }
        .fs-email img { max-width: 100% !important; height: auto !important; }
        .fs-email img[data-blocked] { display: none !important; }
        .fs-email table { max-width: 100%; }
        .fs-email p { margin: 0 0 14px; }
        .fs-email p:last-child { margin-bottom: 0; }
        .fs-email a { color: ${colors.link}; }
        .fs-email.fs-text a { text-decoration: none; font-weight: 600; }
      `}</style>
      <div ref={containerRef} className={isHtml ? 'fs-email' : 'fs-email fs-text'} onClick={handleClick} />
    </>
  );
}
