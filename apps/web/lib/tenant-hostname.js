function normalizeHostname(host) {
  if (typeof host !== 'string') return null;
  const match = /^([a-z0-9.-]+)(?::[0-9]{1,5})?$/i.exec(host);
  return match ? match[1].toLowerCase().replace(/\.$/, '') : null;
}

export function getTenantSubdomain(host, rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'educationos.com') {
  const hostname = normalizeHostname(host);
  if (!hostname) return null;

  // Check the configured domain first. It may itself be under a local wildcard domain.
  const roots = [normalizeHostname(rootDomain), 'lvh.me', 'localhost'].filter(Boolean);
  for (const root of roots) {
    if (hostname === root) return null;
    if (hostname.endsWith(`.${root}`)) {
      const label = hostname.slice(0, -(root.length + 1));
      return label !== 'www' && label.length <= 63 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(label)
        ? label
        : null;
    }
  }
  return null;
}

export function selectTenantForHost(host, tenants, preferredId) {
  const slug = getTenantSubdomain(host);
  if (slug) {
    const tenant = tenants.find((entry) => entry.slug?.toLowerCase() === slug) ?? null;
    return { tenant, missingTenantSlug: tenant ? null : slug };
  }

  const tenant = tenants.find((entry) => entry.id === preferredId) ?? tenants[0] ?? null;
  return { tenant, missingTenantSlug: null };
}
