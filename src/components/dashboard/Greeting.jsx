import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Greeting({ userName }) {
  const now = new Date();
  const hour = now.getHours();
  let greeting = 'Boa noite';
  if (hour < 12) greeting = 'Bom dia';
  else if (hour < 18) greeting = 'Boa tarde';

  const dateStr = format(now, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="mb-8">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">
        {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''} 👋
      </h1>
      <p className="text-muted-foreground mt-1 capitalize">{dateStr}</p>
    </div>
  );
}