import { useEffect, useRef, useState } from 'react';

interface WebRTCConfig {
  meetingId: string;
  userId: string;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onUserLeft: (userId: string) => void;
}

export function useWebRTC({ meetingId, userId, onRemoteStream, onUserLeft }: WebRTCConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  
  // STUN servers (free public STUN servers)
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ]
  };

  const setLocalStream = (stream: MediaStream) => {
    localStreamRef.current = stream;
  };

  const connectWebSocket = () => {
    const wsUrl = `ws://localhost:8000/ws/signaling/${meetingId}/${userId}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      websocketRef.current = ws;
      
      // Request current participants
      ws.send(JSON.stringify({ type: 'get_participants' }));
    };
    
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'participants_list':
          const newParticipants = data.participants.filter((p: string) => p !== userId);
          newParticipants.forEach((participantId: string) => {
            if (!participants.has(participantId)) {
              createPeerConnection(participantId);
              initiateOffer(participantId);
            }
          });
          setParticipants(new Set(data.participants));
          break;
          
        case 'user_joined':
          if (data.user_id !== userId) {
            setParticipants(prev => new Set([...prev, data.user_id]));
            createPeerConnection(data.user_id);
          }
          break;
          
        case 'user_left':
          if (data.user_id !== userId) {
            setParticipants(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.user_id);
              return newSet;
            });
            closePeerConnection(data.user_id);
            onUserLeft(data.user_id);
          }
          break;
          
        case 'offer':
          await handleOffer(data.offer, data.sender_user_id);
          break;
          
        case 'answer':
          await handleAnswer(data.answer, data.sender_user_id);
          break;
          
        case 'ice_candidate':
          await handleIceCandidate(data.candidate, data.sender_user_id);
          break;
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };
    
    return ws;
  };

  const createPeerConnection = (remoteUserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(rtcConfig);
    
    peerConnectionsRef.current.set(remoteUserId, pc);
    
    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        onRemoteStream(remoteUserId, event.streams[0]);
      }
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'ice_candidate',
          candidate: event.candidate,
          target_user_id: remoteUserId
        }));
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${remoteUserId}:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        closePeerConnection(remoteUserId);
      }
    };
    
    return pc;
  };

  const initiateOffer = async (remoteUserId: string) => {
    const pc = peerConnectionsRef.current.get(remoteUserId);
    if (!pc) return;
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'offer',
          offer: offer,
          target_user_id: remoteUserId
        }));
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, senderUserId: string) => {
    const pc = peerConnectionsRef.current.get(senderUserId);
    if (!pc) return;
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'answer',
          answer: answer,
          target_user_id: senderUserId
        }));
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, senderUserId: string) => {
    const pc = peerConnectionsRef.current.get(senderUserId);
    if (!pc) return;
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, senderUserId: string) => {
    const pc = peerConnectionsRef.current.get(senderUserId);
    if (!pc) return;
    
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const closePeerConnection = (userId: string) => {
    const pc = peerConnectionsRef.current.get(userId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(userId);
    }
  };

  const disconnect = () => {
    peerConnectionsRef.current.forEach((pc, userId) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();
    
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    setIsConnected(false);
    setParticipants(new Set());
  };

  useEffect(() => {
    const ws = connectWebSocket();
    
    return () => {
      disconnect();
    };
  }, [meetingId, userId]);

  return {
    isConnected,
    participants,
    setLocalStream,
    disconnect
  };
}
