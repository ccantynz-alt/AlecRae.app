export interface SSOConfig {
  provider: 'google' | 'microsoft';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface SSOProviderEndpoints {
  authorization: string;
  token: string;
  userinfo: string;
  scopes: string[];
}

const PROVIDERS: Record<string, SSOProviderEndpoints> = {
  google: {
    authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userinfo: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scopes: ['openid', 'email', 'profile'],
  },
  microsoft: {
    authorization: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userinfo: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'email', 'profile', 'User.Read'],
  },
};

function getConfig(provider: 'google' | 'microsoft'): SSOConfig {
  const prefix = provider.toUpperCase();
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://alecrae.app';
  const redirectUri = `${baseUrl}/api/auth/sso/${provider}/callback`;

  if (!clientId || !clientSecret) {
    throw new Error(`${prefix}_CLIENT_ID and ${prefix}_CLIENT_SECRET must be set`);
  }

  return { provider, clientId, clientSecret, redirectUri };
}

/**
 * Build the authorization URL that redirects the user to the SSO provider.
 */
export function getAuthorizationUrl(provider: 'google' | 'microsoft'): string {
  const config = getConfig(provider);
  const endpoints = PROVIDERS[provider];

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: endpoints.scopes.join(' '),
    access_type: 'offline',
    prompt: 'select_account',
  });

  return `${endpoints.authorization}?${params.toString()}`;
}

/**
 * Exchange the authorization code for tokens, then fetch user info.
 */
export async function handleCallback(
  provider: string,
  code: string
): Promise<{ email: string; name: string; sub: string }> {
  if (provider !== 'google' && provider !== 'microsoft') {
    throw new Error(`Unsupported SSO provider: ${provider}`);
  }

  const config = getConfig(provider);
  const endpoints = PROVIDERS[provider];

  // Exchange code for tokens
  const tokenResponse = await fetch(endpoints.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const tokens = await tokenResponse.json();
  const accessToken = tokens.access_token as string;

  // Fetch user info
  const userinfoResponse = await fetch(endpoints.userinfo, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userinfoResponse.ok) {
    throw new Error('Failed to fetch user info from SSO provider');
  }

  const userinfo = await userinfoResponse.json();

  if (provider === 'google') {
    return {
      email: userinfo.email as string,
      name: userinfo.name as string,
      sub: userinfo.sub as string,
    };
  }

  // Microsoft returns slightly different fields
  return {
    email: (userinfo.mail || userinfo.userPrincipalName) as string,
    name: userinfo.displayName as string,
    sub: userinfo.id as string,
  };
}
