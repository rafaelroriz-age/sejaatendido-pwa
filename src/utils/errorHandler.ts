import axios from 'axios';

function extractMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const anyData = data as Record<string, unknown>;

  // Try to pull field-level detail from "detalhes" array first
  if (Array.isArray(anyData.detalhes) && anyData.detalhes.length > 0) {
    const parts = anyData.detalhes
      .map((d: unknown) => {
        if (d && typeof d === 'object') {
          const det = d as Record<string, unknown>;
          return det.mensagem ?? det.message ?? det.campo ?? undefined;
        }
        return undefined;
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
  }

  return (
    (anyData.message as string) ??
    (anyData.erro as string) ??
    (anyData.error as string) ??
    (anyData.detail as string)
  );
}

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return 'O servidor demorou para responder. Se estiver enviando um arquivo, tente com um arquivo menor ou tente novamente em instantes.';
    }

    const status = error.response?.status;
    const messageFromApi = extractMessage(error.response?.data);

    if (status === 401) return 'Sessão expirada. Faça login novamente.';
    if (status === 403) return 'Você não tem permissão para realizar esta ação.';
    if (status === 404) return messageFromApi ?? 'Recurso não encontrado.';
    if (status === 413) return 'O arquivo enviado é muito grande. Use um arquivo menor.';
    if (status === 429) return 'Muitas requisições. Aguarde um momento.';
    if (status && status >= 500) return messageFromApi ?? 'Erro no servidor. Tente novamente mais tarde.';

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
