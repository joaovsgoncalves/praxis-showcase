import React, { useState, useRef, useEffect, useCallback } from 'react';
import { praxisApi } from '@/api/praxisClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Square, Loader2, Check, Copy, X, Sparkles, Inbox, Upload, FileAudio } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  VOICE_CAPTURE_MAX_BYTES,
  VOICE_CAPTURE_MAX_DURATION_MS,
  VOICE_CAPTURE_WARN_DURATION_MS,
  formatBytes,
  validateVoiceBlob,
} from '@/lib/voiceCaptureLimits';
import { humanizeCaptureError } from '@/lib/captureErrorMessage';
import { PageHero } from '@/components/layout/PraxisPage';

const PHASE_COPY = {
  sending: { icon: Upload, title: 'Enviando áudio…', hint: 'Conexão com o servidor.' },
  transcribing: { icon: FileAudio, title: 'Transcrevendo…', hint: 'Até 2 tentativas no servidor (pode levar ~1 min).' },
  parsing: { icon: Sparkles, title: 'Organizando tarefas…', hint: 'IA separa hábitos e tarefas do texto.' },
  loading_capture: { icon: Loader2, title: 'Carregando captura…', hint: 'Buscando gravação salva.' },
};

export default function VoiceCapture() {
  const reduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const captureParam = searchParams.get('capture');

  const [capturePhase, setCapturePhase] = useState('idle'); // idle | recording | sending | transcribing | parsing | loading_capture
  const [items, setItems] = useState([]);
  const [transcription, setTranscription] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeCaptureId, setActiveCaptureId] = useState(captureParam || null);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  // Texto que o navegador entendeu enquanto gravava. Só aparece quando o envio
  // do áudio falha — aí o que foi falado não morre junto com a requisição.
  const [rescuedText, setRescuedText] = useState('');
  const [copiedRescued, setCopiedRescued] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recordingTimeout = useRef(null);
  const recordingStartedAt = useRef(0);
  const recordingTick = useRef(null);
  const browserRecognition = useRef(null);
  const shadowRecognition = useRef(null);
  const shadowTranscript = useRef('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: pending } = useQuery({
    queryKey: ['captures', 'pending-count'],
    queryFn: () => praxisApi.captures.pendingCount(),
    staleTime: 20_000,
  });
  const inboxCount = pending?.count ?? 0;

  const clearError = () => {
    setErrorTitle('');
    setErrorMessage('');
  };

  const setCaptureError = (opts) => {
    const { title, detail } = humanizeCaptureError(opts);
    setErrorTitle(title);
    setErrorMessage(detail);
  };

  const applyParsedItems = useCallback((parseRes) => {
    const parsedItems = (parseRes.items || []).map((item, i) => ({
      ...item,
      id: i,
      category: item.category || 'pessoal',
      priority: item.priority || 'medium',
      confirmed: false,
    }));
    setItems(parsedItems);
    if (parsedItems.length === 0) {
      setErrorTitle('Nada identificado');
      setErrorMessage('Transcrevi, mas não achei tarefa/hábito. Edite o texto ou grave de novo com frases curtas.');
    }
  }, []);

  const runParse = useCallback(async (text, captureId) => {
    const parseRes = await praxisApi.parseVoice(text);
    applyParsedItems(parseRes);
    if (captureId) {
      try {
        await praxisApi.captures.saveParsed(captureId, parseRes.items || []);
      } catch {
        /* non-blocking */
      }
    }
  }, [applyParsedItems]);

  useEffect(() => {
    if (!captureParam) return;
    let cancelled = false;
    (async () => {
      setCapturePhase('loading_capture');
      clearError();
      try {
        const cap = await praxisApi.captures.get(captureParam);
        if (cancelled) return;
        setActiveCaptureId(cap.id);
        if (cap.parsed_items?.length) {
          setTranscription(cap.transcript || '');
          applyParsedItems({ items: cap.parsed_items });
        } else if (cap.transcript) {
          setTranscription(cap.transcript);
          setCapturePhase('parsing');
          await runParse(cap.transcript, cap.id);
        } else if (cap.status === 'failed') {
          setErrorTitle('Captura falhou');
          setErrorMessage(cap.error_message || 'Use Revisar capturas → Tentar STT de novo.');
        }
      } catch {
        if (!cancelled) {
          setErrorTitle('Não encontrada');
          setErrorMessage('Essa captura não existe mais ou foi arquivada.');
        }
      } finally {
        if (!cancelled) setCapturePhase('idle');
      }
    })();
    return () => { cancelled = true; };
  }, [captureParam, applyParsedItems, runParse]);

  const browserSpeechSupported = typeof window !== 'undefined'
    && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Reconhecimento "sombra": roda em paralelo ao MediaRecorder só pra ter um
  // texto local se o envio do áudio falhar. Nunca interrompe nem atrasa a
  // gravação — qualquer erro dele é engolido de propósito.
  const startShadowSpeech = useCallback(() => {
    shadowTranscript.current = '';
    if (!browserSpeechSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    try {
      const recognition = new SR();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (!event.results[i].isFinal) continue;
          const chunk = event.results[i][0]?.transcript || '';
          if (chunk) {
            shadowTranscript.current = `${shadowTranscript.current} ${chunk}`.trim();
          }
        }
      };
      recognition.onerror = () => { /* seguro silencioso — o áudio é a via principal */ };
      recognition.onend = () => { shadowRecognition.current = null; };
      recognition.start();
      shadowRecognition.current = recognition;
    } catch {
      shadowRecognition.current = null;
    }
  }, [browserSpeechSupported]);

  const stopShadowSpeech = useCallback(() => {
    const recognition = shadowRecognition.current;
    shadowRecognition.current = null;
    if (!recognition) return;
    try { recognition.stop(); } catch { /* noop */ }
  }, []);

  // Fallback nativo: transcreve pelo próprio navegador (Web Speech API) sem
  // depender do backend de STT. Usado quando o MediaRecorder não existe ou
  // quando a conexão/servidor de transcrição está inacessível.
  const startBrowserSpeech = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorTitle('Sem reconhecimento no navegador');
      setErrorMessage('Este navegador não faz transcrição local. Tente a gravação normal ou o app oficial.');
      return;
    }

    clearError();
    setTranscription('');
    setItems([]);
    setActiveCaptureId(null);
    setSearchParams({});

    const stopTick = () => {
      if (recordingTick.current) {
        clearInterval(recordingTick.current);
        recordingTick.current = null;
      }
    };

    const recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    browserRecognition.current = recognition;

    recognition.onresult = async (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0]?.transcript || '')
        .join(' ')
        .trim();
      setTranscription(text);
      if (!text) {
        setErrorTitle('Nada capturado');
        setErrorMessage('Não entendi o áudio pelo navegador. Fale de novo em frases curtas.');
        setCapturePhase('idle');
        return;
      }
      setCapturePhase('parsing');
      try {
        await runParse(text, null);
      } catch (error) {
        setCaptureError({ status: error.status, body: error.body || {}, message: error.message });
      }
      setCapturePhase('idle');
    };

    recognition.onerror = (event) => {
      stopTick();
      setErrorTitle('Reconhecimento do navegador');
      setErrorMessage(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Permissão de microfone negada. Libere o microfone e tente de novo.'
          : 'Falha no reconhecimento local. Tente a gravação normal.',
      );
      setCapturePhase('idle');
    };

    recognition.onend = () => {
      stopTick();
      browserRecognition.current = null;
      setCapturePhase((prev) => (prev === 'recording' ? 'idle' : prev));
    };

    try {
      recordingStartedAt.current = Date.now();
      setRecordingElapsed(0);
      recordingTick.current = setInterval(() => {
        setRecordingElapsed(Date.now() - recordingStartedAt.current);
      }, 500);
      setCapturePhase('recording');
      recognition.start();
    } catch {
      stopTick();
      setCapturePhase('idle');
      setErrorTitle('Reconhecimento do navegador');
      setErrorMessage('Não consegui iniciar a transcrição local. Tente a gravação normal.');
    }
  }, [runParse, setSearchParams]);

  const startRecording = async () => {
    clearError();
    setTranscription('');
    setItems([]);
    setActiveCaptureId(null);
    setRescuedText('');
    setCopiedRescued(false);
    setSearchParams({});

    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        if (browserSpeechSupported) {
          startBrowserSpeech();
          return;
        }
        throw new Error('Seu navegador não suporta gravação de áudio nesta tela.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      mediaRecorder.current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        if (recordingTimeout.current) clearTimeout(recordingTimeout.current);
        if (recordingTick.current) clearInterval(recordingTick.current);
        stopShadowSpeech();
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunks.current, { type: mimeType || 'audio/webm' });
        const durationMs = Date.now() - recordingStartedAt.current;
        const validationError = validateVoiceBlob(blob, durationMs);
        if (validationError) {
          setErrorTitle('Áudio inválido');
          setErrorMessage(validationError);
          setCapturePhase('idle');
          return;
        }
        await processAudio(blob);
      };

      mediaRecorder.current.start();
      startShadowSpeech();
      recordingStartedAt.current = Date.now();
      setRecordingElapsed(0);
      recordingTick.current = setInterval(() => {
        setRecordingElapsed(Date.now() - recordingStartedAt.current);
      }, 500);
      setCapturePhase('recording');
      recordingTimeout.current = setTimeout(() => stopRecording(), VOICE_CAPTURE_MAX_DURATION_MS);
    } catch (error) {
      console.error('Microphone error:', error);
      setErrorTitle('Microfone');
      setErrorMessage(error.message || 'Não consegui acessar o microfone. Verifique a permissão do navegador.');
      setCapturePhase('idle');
    }
  };

  const stopRecording = () => {
    if (recordingTimeout.current) clearTimeout(recordingTimeout.current);
    if (recordingTick.current) clearInterval(recordingTick.current);
    if (browserRecognition.current) {
      try { browserRecognition.current.stop(); } catch { /* noop */ }
      return;
    }
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
  };

  const processAudio = async (blob) => {
    clearError();
    setCapturePhase('sending');

    try {
      setCapturePhase('transcribing');
      const captureRes = await praxisApi.captures.submitAudio(blob);
      const captureId = captureRes.capture_id || null;
      setActiveCaptureId(captureId);
      const text = captureRes.text || '';
      setTranscription(text);
      shadowTranscript.current = '';
      setCapturePhase('parsing');
      await runParse(text, captureId);
      queryClient.invalidateQueries({ queryKey: ['captures'] });
    } catch (error) {
      console.error('Voice capture error:', error);
      const body = error.body || {};
      const captureId = body.capture_id;
      if (captureId) setActiveCaptureId(captureId);
      setCaptureError({ status: error.status, body, message: error.message });
      // O envio morreu, mas o que o navegador entendeu fica na tela pra copiar
      // ou organizar — não se perde o que foi falado.
      const localText = shadowTranscript.current.trim();
      if (localText) {
        setRescuedText(localText);
        setCopiedRescued(false);
      }
      queryClient.invalidateQueries({ queryKey: ['captures'] });
    }

    setCapturePhase('idle');
  };

  // Limpa o reconhecimento sombra se a tela sair no meio da gravação.
  useEffect(() => () => stopShadowSpeech(), [stopShadowSpeech]);

  const copyRescuedText = async () => {
    try {
      await navigator.clipboard.writeText(rescuedText);
      setCopiedRescued(true);
    } catch {
      setCopiedRescued(false);
    }
  };

  const organizeRescuedText = async () => {
    const text = rescuedText.trim();
    if (!text) return;
    clearError();
    setTranscription(text);
    setCapturePhase('parsing');
    try {
      await runParse(text, null);
      setRescuedText('');
    } catch (error) {
      setCaptureError({ status: error.status, body: error.body || {}, message: error.message });
    }
    setCapturePhase('idle');
  };

  const updateItem = (id, field, value) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const confirmItem = async (item) => {
    try {
      if (item.type === 'habit') {
        await praxisApi.habits.create({
          title: item.title,
          frequency: item.frequency || 'daily',
          category: item.category || 'pessoal',
          source: 'voice',
        });
      } else {
        await praxisApi.tasks.create({
          title: item.title,
          date: item.date || null,
          time: item.time || null,
          priority: item.priority || 'medium',
          category: item.category || 'pessoal',
          source: 'voice',
        });
      }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, confirmed: true } : i)));
      queryClient.invalidateQueries();
    } catch (error) {
      console.error('Confirm error:', error);
    }
  };

  const confirmAll = async () => {
    const unconfirmed = items.filter((i) => !i.confirmed);
    for (const item of unconfirmed) {
      await confirmItem(item);
    }
    if (activeCaptureId) {
      try {
        await praxisApi.captures.archive(activeCaptureId);
        queryClient.invalidateQueries({ queryKey: ['captures'] });
      } catch {
        /* non-blocking */
      }
    }
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const allConfirmed = items.length > 0 && items.every((i) => i.confirmed);
  const busy = ['sending', 'transcribing', 'parsing', 'loading_capture'].includes(capturePhase);
  const phaseMeta = PHASE_COPY[capturePhase];
  const PhaseIcon = phaseMeta?.icon || Loader2;
  const recordingWarn = capturePhase === 'recording' && recordingElapsed >= VOICE_CAPTURE_WARN_DURATION_MS;

  return (
    <div className="praxis-page max-w-2xl">
      <PageHero
        kicker="Voz & PraxIA"
        kickerIcon={Mic}
        title="Descarregar meu dia em áudio"
        description="Fale sem se preocupar em organizar. A PraxIA separa tarefas e hábitos para você revisar antes de salvar."
        action={(
          <Button asChild variant="outline" size="sm" className="relative praxis-touch-target shrink-0 rounded-full">
            <Link to="/capturas">
              <Inbox className="w-4 h-4 mr-1" />
              Revisar
              {inboxCount > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                  {inboxCount}
                </span>
              )}
            </Link>
          </Button>
        )}
      />

      <Link to="/" className="sr-only">Hoje</Link>

      <p className="text-xs text-muted-foreground text-center lg:text-left">
        Máx. {formatBytes(VOICE_CAPTURE_MAX_BYTES)} · até 90s por gravação
      </p>

      <Card className="bg-card border-border">
        <CardContent className="py-12 flex flex-col items-center gap-6">
          <AnimatePresence mode="wait">
            {busy && phaseMeta ? (
              <motion.div
                key={capturePhase}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col items-center gap-4 text-center"
              >
                <PhaseIcon className={cn('w-12 h-12 text-primary', capturePhase !== 'loading_capture' && !reduceMotion && 'animate-pulse')} />
                <div>
                  <p className="font-medium text-sm">{phaseMeta.title}</p>
                  <p className="text-muted-foreground text-xs mt-1">{phaseMeta.hint}</p>
                </div>
              </motion.div>
            ) : capturePhase === 'recording' ? (
              <motion.div
                key="recording"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col items-center gap-4"
              >
                <div className={cn('w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center', !reduceMotion && 'praxis-opacity-pulse')}>
                  <div className="w-16 h-16 rounded-full bg-destructive/40 flex items-center justify-center">
                    <Mic className="w-8 h-8 text-destructive" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Gravando — fale tarefas e hábitos em frases curtas</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {Math.floor(recordingElapsed / 1000)}s / {VOICE_CAPTURE_MAX_DURATION_MS / 1000}s
                </p>
                {recordingWarn && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Quase no limite — pare em instantes.</p>
                )}
                <Button onClick={stopRecording} variant="destructive" size="lg" className="rounded-full praxis-touch-target">
                  <Square className="w-4 h-4 mr-2" />Parar e enviar
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col items-center gap-4"
              >
                <motion.button
                  type="button"
                  whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  onClick={startRecording}
                  disabled={busy}
                  className="praxis-touch-target w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors disabled:opacity-50"
                >
                  <Mic className="w-10 h-10 text-primary" />
                </motion.button>
                <p className="text-sm text-muted-foreground">Toque para gravar</p>
                <p className="text-xs text-muted-foreground">Se o STT falhar, o áudio fica em Revisar capturas.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {(errorTitle || errorMessage) && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="py-4 space-y-2">
            {errorTitle && <p className="text-sm font-medium text-destructive">{errorTitle}</p>}
            <p className="text-sm text-destructive/90">{errorMessage}</p>
            <div className="flex flex-wrap gap-2">
              {browserSpeechSupported && !busy && (
                <Button onClick={startBrowserSpeech} variant="secondary" size="sm" className="praxis-touch-target">
                  <Mic className="w-4 h-4 mr-1" />Tentar pelo navegador
                </Button>
              )}
              {(activeCaptureId || inboxCount > 0) && (
                <Button asChild variant="secondary" size="sm" className="praxis-touch-target">
                  <Link to="/capturas">Abrir Revisar capturas</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {rescuedText && (
        <Card className="bg-secondary/30 border-amber-500/30">
          <CardContent className="py-4 space-y-3">
            <div>
              <p className="text-sm font-medium">O que o navegador entendeu</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                O áudio não subiu, mas isto aqui não se perdeu. Ajuste se precisar,
                copie ou mande organizar.
              </p>
            </div>
            <Textarea
              value={rescuedText}
              onChange={(e) => {
                setRescuedText(e.target.value);
                setCopiedRescued(false);
              }}
              rows={4}
              className="bg-background/60 text-sm"
              aria-label="Texto reconhecido pelo navegador"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={copyRescuedText} variant="secondary" size="sm" className="praxis-touch-target">
                {copiedRescued ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copiedRescued ? 'Copiado' : 'Copiar texto'}
              </Button>
              <Button
                onClick={organizeRescuedText}
                size="sm"
                className="praxis-touch-target"
                disabled={busy || !rescuedText.trim()}
              >
                <Sparkles className="w-4 h-4 mr-1" />Organizar este texto
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {transcription && (
        <Card className="bg-secondary/30 border-border">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground mb-1">Transcrição:</p>
            <p className="text-sm italic">&quot;{transcription}&quot;</p>
          </CardContent>
        </Card>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Itens Identificados</h2>
            {!allConfirmed && (
              <Button onClick={confirmAll} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Check className="w-4 h-4 mr-1" />Confirmar Todos
              </Button>
            )}
          </div>

          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                  key={item.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                >
                <Card className={cn('bg-card border-border', item.confirmed && 'opacity-60')}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={item.type === 'habit' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}>
                          {item.type === 'habit' ? 'Hábito' : 'Tarefa'}
                        </Badge>
                        {item.confirmed && <Badge className="bg-accent/20 text-accent">Confirmado ✓</Badge>}
                      </div>
                      {!item.confirmed && (
                        <button type="button" onClick={() => removeItem(item.id)}><X className="w-4 h-4 text-muted-foreground hover:text-destructive" /></button>
                      )}
                    </div>
                    <Input value={item.title} onChange={(e) => updateItem(item.id, 'title', e.target.value)} className="bg-secondary/50" disabled={item.confirmed} />
                    <div className="grid grid-cols-2 gap-2">
                      {item.type === 'task' && (
                        <>
                          <Input type="date" value={item.date || ''} onChange={(e) => updateItem(item.id, 'date', e.target.value)} className="bg-secondary/50" disabled={item.confirmed} />
                          <Input type="time" value={item.time || ''} onChange={(e) => updateItem(item.id, 'time', e.target.value)} className="bg-secondary/50" disabled={item.confirmed} />
                        </>
                      )}
                      {item.type === 'habit' && (
                        <Select value={item.frequency || 'daily'} onValueChange={(v) => updateItem(item.id, 'frequency', v)} disabled={item.confirmed}>
                          <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diário</SelectItem>
                            <SelectItem value="weekdays">Dias úteis</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <Select value={item.category || 'pessoal'} onValueChange={(v) => updateItem(item.id, 'category', v)} disabled={item.confirmed}>
                        <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="farmacia">💼 Trabalho / RCA</SelectItem>
                          <SelectItem value="gofluxo">🤝 GoFluxo</SelectItem>
                          <SelectItem value="treino">💪 Treino</SelectItem>
                          <SelectItem value="estudo">📚 Estudo</SelectItem>
                          <SelectItem value="jotav_fit">📸 @jotav.fit</SelectItem>
                          <SelectItem value="ideias">💡 Ideias</SelectItem>
                          <SelectItem value="pessoal">🏠 Pessoal</SelectItem>
                          <SelectItem value="rotina">🔥 Rotina</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {!item.confirmed && (
                      <Button onClick={() => confirmItem(item)} className="w-full bg-primary hover:bg-primary/90 praxis-touch-target" size="sm">
                        <Check className="w-4 h-4 mr-1" />Confirmar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {allConfirmed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
              <p className="text-accent font-medium">Tudo confirmado! ✨</p>
              <Button onClick={() => navigate('/')} variant="outline" className="mt-2 praxis-touch-target">Voltar ao Dashboard</Button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}