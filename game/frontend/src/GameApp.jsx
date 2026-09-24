import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster, toast } from "sonner";
import GameLobby from "@/pages/GameLobby";
import GameRoom from "@/pages/GameRoom";

export default function GameApp() {
  return (
    <BrowserRouter basename="/game">
      <div className="min-h-screen w-full text-white">
        <Routes>
          <Route path="/" element={<GameLobby />} />
          <Route path="/play/:roomId" element={<GameRoom />} />
        </Routes>
        <Toaster theme="dark" position="top-center" richColors closeButton />
      </div>
    </BrowserRouter>
  );
}
