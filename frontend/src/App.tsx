import "./App.css";
import { useEffect } from "react";
import { socket } from "./socket";

function App() {
  useEffect(() => {
  socket.connect();

  socket.on('connect', () => {
    console.log('✅ Socket connected, id =', socket.id);

    
    socket.emit('ping');
  });

 
  socket.on('pong', (data: { time: number }) => {
    console.log('🏓 Pong received at', new Date(data.time).toLocaleTimeString());
  });

  socket.on('disconnect', reason => {
    console.log('⚠️ Socket disconnected:', reason);
  });

  return () => {
    socket.off('connect');
    socket.off('pong');
    socket.off('disconnect');
    socket.disconnect();
  };
}, []);
  return (
    <>
      <div className="App">
        <h1>Welcome to your Whiteboard App</h1>
      </div>
    </>
  );
}

export default App;
