import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Canvas from '../../components/Canvas';
import Toolbar from '../../components/Toolbar';

const WhiteboardPage = () => {
  const router = useRouter();
  const { roomId, nickname } = router.query;

  useEffect(() => {
    // 如果沒有暱稱，重定向回首頁
    if (!nickname && router.isReady) {
      router.push('/');
    }
  }, [nickname, router.isReady]);

  if (!roomId || !nickname) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative">
      <Toolbar />
      <Canvas 
        roomId={roomId as string} 
        nickname={nickname as string} 
      />
    </div>
  );
};

export default WhiteboardPage;