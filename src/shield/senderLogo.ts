/** Mailbox providers whose logo says nothing about who actually sent the email. */
const PERSONAL_MAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'ymail.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'mail.com',
  'zoho.com',
]);

const SECOND_LEVEL_SUFFIX = /\.(co|com|org|net|gov|ac|edu)\.[a-z]{2}$/;

/** `news.mail.fnb.co.za` -> `fnb.co.za`, so marketing subdomains resolve to the brand's site. */
function brandDomain(address: string) {
  const domain = address.split('@')[1]?.trim().toLowerCase();
  if (!domain || !domain.includes('.')) return null;
  return domain
    .split('.')
    .slice(SECOND_LEVEL_SUFFIX.test(domain) ? -3 : -2)
    .join('.');
}

/**
 * Logo for a business sender, or null for personal mailboxes. The URL 404s when the site has no
 * icon, so callers should fall back to initials on load errors.
 */
export function senderLogoUrl(address: string) {
  const domain = brandDomain(address);
  if (!domain || PERSONAL_MAIL_DOMAINS.has(domain)) return null;
  return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;
}
