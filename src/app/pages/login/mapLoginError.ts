type ApiErrorLike = {
  status?: number;
  error?: {
    error?: string;
    message?: string;
  } | string;
};

export function mapLoginError(err: ApiErrorLike): string {
  const errorBody = err?.error;
  const body =
    typeof errorBody === 'string'
      ? { message: errorBody }
      : (errorBody ?? {});

  const code = String(body.error ?? body.message ?? '').trim();
  const message = String(body.message ?? '').trim();

  const codeMap: Record<string, string> = {
    INVALID_PASSWORD: 'Usuário ou senha incorretos.',
    USER_NOT_FOUND: 'Usuário não encontrado.',
    LDAP_UNAVAILABLE: 'Serviço LDAP indisponível.',
    LDAP_CONNECTIVITY_ERROR: 'Falha de conexão com o servidor LDAP.',
  };

  const matchedCode = [code, message].find((value) => value && codeMap[value]);
  if (matchedCode && codeMap[matchedCode]) {
    return codeMap[matchedCode];
  }

  const statusMap: Record<number, string> = {
    401: 'Usuário ou senha incorretos.',
    404: 'Usuário não encontrado.',
    503: 'Serviço LDAP indisponível.',
    0: 'O servidor parece estar desligado ou houve erro de CORS.',
  };

  return statusMap[Number(err?.status)] ?? `Erro inesperado: ${message || code || 'Erro de conexão.'}`;
}
