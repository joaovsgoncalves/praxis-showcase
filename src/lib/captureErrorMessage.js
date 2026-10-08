/** Mensagens PT para erros de captura / STT (onda 21). */
export function humanizeCaptureError({ status, body = {}, message = '' }) {
  const detail = body.detail || body.error || message || '';
  const lower = String(detail).toLowerCase();

  if (status === 429 || lower.includes('busy') || lower.includes('ocupad')) {
    return {
      title: 'Servidor ocupado',
      detail: 'Outra transcrição está rodando. Espere ~30s e toque em Tentar de novo.',
    };
  }
  if (status === 400 || lower.includes('no audio') || lower.includes('sem áudio')) {
    return {
      title: 'Sem áudio',
      detail: 'O arquivo chegou vazio. Grave de novo com o microfone permitido.',
    };
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('demorou')) {
    return {
      title: 'Tempo esgotado',
      detail: 'O STT demorou mais que o limite. A gravação foi salva — use Revisar capturas → Tentar STT de novo.',
    };
  }
  if (lower.includes('empty transcript') || lower.includes('vazio')) {
    return {
      title: 'Não entendi o áudio',
      detail: 'Não saiu texto na transcrição. Fale mais perto do microfone ou tente de novo.',
    };
  }
  if (body.exhausted || lower.includes('várias tentativas') || lower.includes('revisar capturas')) {
    return {
      title: 'STT falhou',
      detail: detail || 'Não consegui transcrever após várias tentativas. Abra Revisar capturas.',
    };
  }
  if (status === 503) {
    return {
      title: 'Transcrição indisponível',
      detail: detail || 'Serviço de voz falhou. Tente de novo em Revisar capturas.',
    };
  }
  return {
    title: 'Erro na captura',
    detail: detail || 'Não consegui processar o áudio. Tente de novo em instantes.',
  };
}

export function humanizeStoredCaptureError(errorMessage) {
  if (!errorMessage) return 'Falha desconhecida — tente STT de novo.';
  const lower = errorMessage.toLowerCase();
  if (lower.includes('timeout')) return 'Tempo esgotado no servidor de voz.';
  if (lower.includes('empty')) return 'Áudio sem fala detectável.';
  if (lower.includes('transcription failed')) return 'Motor de voz não respondeu — retry costuma resolver.';
  return errorMessage;
}