import React, { useEffect, useRef, useState } from 'react'

import { io } from 'socket.io-client';


const Chat = () => {
  
  const [convo, setConvo] = useState<any>([]);
  const [ip, setIp] = useState<any>("");

  const sendToRef = useRef<any>();
  const fromRef = useRef<any>();
  const socketRef = useRef<any>();

  useEffect(() => {
    const socket = io('http://localhost:3000', { auth: { session: "xyz"} });

    socketRef.current = socket;


    socket.on('connect', () => {
      console.log("Connect");

    })
    socket.on('disconnect', () => {
      console.log("Disconnected");

    });

    socket.on('message', (message) => {
      console.log("message received", message);
      setConvo((prv: any) => {
        return [...prv, message.message];
      })
    });

    return ()=>{socket.disconnect()}
    

  }, [])

  const sendMessage = () => {
    socketRef.current.emit('message', { message: ip, sendTo: sendToRef.current.value||"", from: fromRef.current.value||"", type: "chat" })
    setIp('');
  }

  return (
    <div>
      <h3>chat</h3>
      {
        convo.map((c: any) => (
          <p>{c}</p>
        ))
      }
      <div>

        <h2>Send your message</h2>
        <div>
          <input onChange={(e) => { setIp(e.target.value) }} type="text" name="" id="" />
          <input placeholder='Send To' ref={sendToRef} type="text" name="" id="" />
          <input placeholder='From' ref={fromRef} type="text" name="" id="" />
          <button onClick={sendMessage}>send</button>
        </div>
      </div>
    </div>

  )
}

export default Chat