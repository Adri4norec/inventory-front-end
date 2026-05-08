type ApiErrorLike = {
  status?: number;
  error?: any;
};

export function mapLoginError(err: ApiErrorLike): string {
  const errorBody = err?.error;
  const message = typeof errorBody === 'string' ? errorBody : errorBody?.message || '';

  const statusMap: Record<number, string> = {
    503: 'Servidor de rede indisponível. Tente o acesso local.',
    404: 'Usuário não cadastrado no sistema.',
    401: 'Senha ou usuário incorretos.',
    0: 'O servidor parece estar desligado ou houve erro de CORS.',
  };

  const codeMap: Record<string, string> = {
    LDAP_CONNECTIVITY_ERROR: statusMap[503],
    USER_NOT_FOUND: statusMap[404],
    INVALID_PASSWORD: statusMap[401],
  };

  const matchedCode = Object.keys(codeMap).find(code => message.includes(code));
  const byCode = matchedCode ? codeMap[matchedCode] : undefined;
  const byStatus = statusMap[Number(err?.status)];

  return byCode ?? byStatus ?? `Erro inesperado: ${message || 'Erro de conexão.'}`;
}

