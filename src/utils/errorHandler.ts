import axios from 'axios';

function extractMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const anyData = data as Record<string, unknown>;
  return (
    (anyData.message as string) ??
    (anyData.erro as string) ??
    (anyData.error as string) ??
    (anyData.detail as string)
  );
}

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const messageFromApi = extractMessage(error.response?.data);

    if (status === 401) return 'Sessão expirada. Faça login novamente.';
    if (status === 403) return 'Você não tem permissão para realizar esta ação.';
    if (status === 404) return 'Recurso não encontrado.';
    if (status === 429) return 'Muitas requisições. Aguarde um momento.';
    if (status && status >= 500) return 'Erro no servidor. Tente novamente mais tarde.';

    return messageFromApi ?? 'Erro ao conectar com o servidor';
  }
  return 'Erro inesperado. Verifique sua conexão.';
};

export const showErrorAlert = (error: unknown, title = 'Erro') => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error('[API_ERROR]', error);
  }
  const message = handleApiError(error);
  window.alert(`${title}\n${message}`);
};
