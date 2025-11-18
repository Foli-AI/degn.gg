'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function SolBirdPageContent() {
  const sp = useSearchParams();
  const lobbyId = sp.get('lobbyId') ?? sp.get('matchKey') ?? '';
  const playerId = sp.get('playerId') ?? '';
  const username = sp.get('username') ?? '';
  const wsUrl = sp.get('wsUrl') ?? (process.env.NEXT_PUBLIC_MATCHMAKER_URL ? `${process.env.NEXT_PUBLIC_MATCHMAKER_URL.replace(/^http/, 'ws')}/ws` : '');
  const entry = sp.get('entry') ?? sp.get('entryFee') ?? '0';
  const players = sp.get('players') ?? sp.get('maxPlayers') ?? '2';
  const matchKey = sp.get('matchKey') ?? `lobby_${lobbyId}_${playerId}`;


  const clientSrc = useMemo(() => {
    const url = new URL('/games/sol-bird/client/index.html', location.origin);
    if (lobbyId) url.searchParams.set('lobbyId', lobbyId);
    url.searchParams.set('playerId', playerId);
    url.searchParams.set('username', username);
    url.searchParams.set('wsUrl', wsUrl);
    url.searchParams.set('entry', entry);
    url.searchParams.set('players', players);
    url.searchParams.set('matchKey', matchKey);
    return url.toString();
  }, [lobbyId, playerId, username, wsUrl, entry, players, matchKey]);


  const [loaded, setLoaded] = useState(false);


  useEffect(() => {
    setLoaded(false);
  }, [clientSrc]);


  return (
    <div style={{height:'100vh', width:'100%', background:'#0b0c10', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column'}}>
      <div style={{position:'absolute', top:12, left:12, color:'#c9c6ff'}}>
        <strong>Sol Bird (Flappy Race)</strong>
        <div style={{fontSize:12, color:'#9b99c8'}}>Lobby: {lobbyId || '—'} • Player: {playerId || '—'}</div>
      </div>


      {!loaded && (
        <div style={{color:'#fff', textAlign:'center'}}>
          <div style={{marginBottom:8}}>Loading game…</div>
          <div style={{fontSize:12, color:'#cfcfff'}}>If this hangs, confirm the Godot HTML export exists at /public/games/sol-bird/client/index.html</div>
        </div>
      )}


      <iframe
        key={clientSrc}
        title="Sol Bird Game"
        src={clientSrc}
        onLoad={() => setLoaded(true)}
        style={{
          border: 'none',
          width: '100%',
          height: '100vh',
          maxWidth: 1280,
          maxHeight: 720,
          background: '#000',
        }}
      />
    </div>
  );
}

export default function SolBirdPageClient() {
  return (
    <Suspense fallback={
      <div style={{height:'100vh', width:'100%', background:'#0b0c10', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column'}}>
        <div style={{color:'#fff', textAlign:'center'}}>
          <div style={{marginBottom:8}}>Loading game…</div>
        </div>
      </div>
    }>
      <SolBirdPageContent />
    </Suspense>
  );
}

