import React, { useState, useEffect } from 'react';
import { praxisApi } from '@/api/praxisClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, User, Timer, LogOut, Bell, Camera, Database, Settings as SettingsIcon } from 'lucide-react';
import { PageHero } from '@/components/layout/PraxisPage';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

const AVATAR_MAX_DIMENSION = 256;
const AVATAR_MAX_DATA_URL_LENGTH = 80_000;
const AVATAR_QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52];

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não consegui ler essa imagem.'));
    };
    img.src = objectUrl;
  });
}

async function compressAvatar(file) {
  const img = await loadImageFromFile(file);
  const ratio = Math.min(AVATAR_MAX_DIMENSION / img.width, AVATAR_MAX_DIMENSION / img.height, 1);
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  for (const quality of AVATAR_QUALITY_STEPS) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= AVATAR_MAX_DATA_URL_LENGTH) return dataUrl;
  }

  throw new Error('A foto ficou grande demais. Tenta uma imagem menor ou já cortada em quadrado.');
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => praxisApi.user.getSettings() });
  const { data: backupMeta } = useQuery({
    queryKey: ['ops', 'backup-meta'],
    queryFn: () => praxisApi.ops.backupMeta(),
    staleTime: 120_000,
  });

  const [pomodoroFocus, setPomodoroFocus] = useState('25');
  const [pomodoroBreak, setPomodoroBreak] = useState('5');
  const [notifHabits, setNotifHabits] = useState(true);
  const [notifGoals, setNotifGoals] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user?.pomodoro_focus) setPomodoroFocus(String(user.pomodoro_focus));
    if (user?.pomodoro_break) setPomodoroBreak(String(user.pomodoro_break));
    setAvatarUrl(user?.avatar_url || null);
  }, [user]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Escolhe um arquivo de imagem.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const nextAvatarUrl = await compressAvatar(file);
      setAvatarUrl(nextAvatarUrl);
      await praxisApi.user.updateSettings({ avatar_url: nextAvatarUrl });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Foto de perfil atualizada!');
    } catch (err) {
      setAvatarUrl(user?.avatar_url || null);
      toast.error(err?.message || 'Não consegui atualizar a foto agora.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveSettings = async () => {
    await praxisApi.user.updateSettings({
      pomodoro_focus: Number(pomodoroFocus),
      pomodoro_break: Number(pomodoroBreak),
    });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    toast.success('Configurações salvas!');
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className="praxis-page max-w-xl">
      <PageHero
        kicker="Conta"
        kickerIcon={SettingsIcon}
        title="Configurações"
        description="Perfil, pomodoro, notificações e backup."
      />

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" />Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <label className={`relative group ${uploadingAvatar ? 'cursor-wait opacity-80' : 'cursor-pointer'}`}>
              <div className="w-20 h-20 rounded-full bg-secondary border-2 border-border overflow-hidden flex items-center justify-center">
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : <User className="w-8 h-8 text-muted-foreground" />
                }
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
            </label>
            <p className="text-xs text-muted-foreground">{uploadingAvatar ? 'Enviando...' : 'Clique para alterar'}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Nome</Label>
            <p className="text-sm font-medium mt-1">{user?.full_name || '—'}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Email</Label>
            <p className="text-sm font-medium mt-1">{user?.email || '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Timer className="w-4 h-4" />Pomodoro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Duração do foco (minutos)</Label>
            <Select value={pomodoroFocus} onValueChange={setPomodoroFocus}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[15, 20, 25, 30, 45, 60].map(v => <SelectItem key={v} value={String(v)}>{v} min</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Duração da pausa (minutos)</Label>
            <Select value={pomodoroBreak} onValueChange={setPomodoroBreak}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[3, 5, 10, 15].map(v => <SelectItem key={v} value={String(v)}>{v} min</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveSettings} className="w-full bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" />Notificações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Hábitos</p>
              <p className="text-xs text-muted-foreground">Lembretes diários</p>
            </div>
            <Switch checked={notifHabits} onCheckedChange={setNotifHabits} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Metas</p>
              <p className="text-xs text-muted-foreground">Atualizações de progresso</p>
            </div>
            <Switch checked={notifGoals} onCheckedChange={setNotifGoals} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            Backup (servidor)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {backupMeta?.last ? (
            <>
              <p>
                <span className="text-muted-foreground">Último snapshot: </span>
                {new Date(backupMeta.last.at).toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {backupMeta.last.daily} · {(backupMeta.last.bytes / 1024).toFixed(0)} KB
              </p>
              <p className="text-xs text-muted-foreground">
                Diários guardados: {backupMeta.daily_snapshots ?? '—'}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nenhum backup registrado ainda. Na VPS: <code className="text-xs">./scripts/praxis-backup.sh</code>
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="py-4">
          <Button onClick={handleLogout} variant="outline" className="w-full text-destructive border-destructive/20 hover:bg-destructive/10">
            <LogOut className="w-4 h-4 mr-2" />Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}