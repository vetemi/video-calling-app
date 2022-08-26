import React, { useEffect, useRef, useState } from "react";
import SimplePeer, { Instance, SignalData } from "simple-peer";
import "./App.scss";

enum ConnectionStatus {
  OFFERING,
  RECEIVING,
  CONNECTED,
}

const webSocketConnection = new WebSocket("ws://localhost:8061/api/videochat");
const chatId = '41bf7460-1a1a-41cb-8b2f-a89688671b33';

export const VideoCall = () => {
  const [token, setToken] = React.useState('<STUDENT_TOKEN>');
  const videoSelf = useRef<HTMLVideoElement | null>(null);
  const videoCaller = useRef<HTMLVideoElement | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [offerSignal, setOfferSignal] = useState<SignalData>();
  const [simplePeer, setSimplePeer] = useState<Instance>();

  useEffect(() => {
    webSocketConnection.onmessage = (message: any) => {
      const payload = JSON.parse(message.data);
      console.log("webSocketConnection.onmessage", payload);
      if (payload?.type === "offer") {
        setOfferSignal(payload);
        setConnectionStatus(ConnectionStatus.RECEIVING);
      } else if (payload?.type === "answer") simplePeer?.signal(payload);
    };
  }, [simplePeer]);

  const sendOrAcceptInvitation = (isInitiator: boolean, offer?: SignalData) => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((mediaStream) => {
      const video = videoSelf.current;
      video!.srcObject = mediaStream;
      video!.play();

      const sp = new SimplePeer({
        trickle: false,
        initiator: isInitiator,
        stream: mediaStream,
      });

      if (isInitiator) setConnectionStatus(ConnectionStatus.OFFERING);
      else offer && sp.signal(offer);

      sp.on("signal", (data) => {
        const payload = Object.assign(data, {
          token,
          chatId
        });
        console.log("sp.on('signal'", payload);
        webSocketConnection.send(JSON.stringify(payload));
      });
      sp.on("connect", () => setConnectionStatus(ConnectionStatus.CONNECTED));
      sp.on("stream", (stream) => {
        const video = videoCaller.current;
        video!.srcObject = stream;
        video!.play();
      });
      setSimplePeer(sp);
    });
  };

  const handleChange = (event: any) => {
    setToken(event.target.value);
  };

  const init = () => {
    const payload = {
      token,
      type: 'init'
    }
    console.log("init()", payload);
    webSocketConnection.send(JSON.stringify(payload));
  }

  return (
    <div className="web-rtc-page">
      {!connectionStatus && 
        <label>
          Which user?
          <select value={token} onChange={handleChange}>
            <option value="<STUDENT_TOKEN>">
              Student
            </option>
            <option value="<ADMIN_TOKEN>">
              Admin
            </option>
          </select>
        </label>
      }
      {
        !connectionStatus &&
          <button onClick={() => init()}>INIT</button>
      }

      {connectionStatus === null && <button onClick={() => sendOrAcceptInvitation(true)}>CALL</button>}
      {connectionStatus === ConnectionStatus.OFFERING && <div className="loader"></div>}
      {connectionStatus === ConnectionStatus.RECEIVING && (
        <button onClick={() => sendOrAcceptInvitation(false, offerSignal)}>ANSWER CALL</button>
      )}
      <div className="video-container">
        <video ref={videoSelf} className="video-block" />
        <video ref={videoCaller} className="video-block" />
      </div>
    </div>
  );
};
