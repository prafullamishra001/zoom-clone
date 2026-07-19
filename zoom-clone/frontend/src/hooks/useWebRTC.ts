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

  const hasRecreatedConnectionsRef = useRef(false);

  const setLocalStream = (stream: MediaStream) => {
    // Only set if stream is different to prevent infinite loop
    if (localStreamRef.current === stream) {
      console.log('Stream already set, skipping recreation');
      return;
    }
    
    localStreamRef.current = stream;
    
    // Only recreate connections once
    if (hasRecreatedConnectionsRef.current) {
      console.log('Connections already recreated, skipping');
      return;
    }
    
    hasRecreatedConnectionsRef.current = true;
    
    // Recreate peer connections with the new stream
    // This ensures ICE gathering starts properly with tracks
    peerConnectionsRef.current.forEach((pc, remoteUserId) => {
      console.log(`Recreating peer connection with ${remoteUserId} to add tracks and restart ICE gathering`);
      closePeerConnection(remoteUserId);
      createPeerConnection(remoteUserId);
      initiateOffer(remoteUserId);
    });
  };

  const connectWebSocket = () => {
    if (!userId) {
      console.log('Cannot connect WebSocket: userId is missing');
      return null;
    }
    
    const wsUrl = `ws://localhost:8000/ws/signaling/${meetingId}/${userId}`;
    console.log('Connecting to WebSocket:', wsUrl);
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
              // Only initiate offer if we're the new user (participants list is empty initially)
              if (participants.size === 0) {
                initiateOffer(participantId);
              }
            }
          });
          setParticipants(new Set(data.participants));
          break;
          
        case 'user_joined':
          if (data.user_id !== userId) {
            console.log(`User ${data.user_id} joined, creating peer connection`);
            setParticipants(prev => new Set([...prev, data.user_id]));
            createPeerConnection(data.user_id);
            // Only the new user initiates offers, existing users wait for offers
            // Don't initiate offer here - wait for the new user to initiate
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
          console.log(`Received ICE candidate from ${data.sender_user_id}`);
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
    console.log(`Creating peer connection with ${remoteUserId}`);
    const pc = new RTCPeerConnection(rtcConfig);
    
    peerConnectionsRef.current.set(remoteUserId, pc);
    
    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      console.log('Adding local tracks to peer connection');
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      console.log('No local stream available yet - ICE gathering will start when stream is added');
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log(`Received remote track from ${remoteUserId}`);
      if (event.streams && event.streams[0]) {
        onRemoteStream(remoteUserId, event.streams[0]);
      }
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      console.log(`ICE candidate generated for ${remoteUserId}:`, event.candidate ? 'candidate present' : 'null (gathering complete)');
      if (event.candidate && websocketRef.current) {
        console.log(`Sending ICE candidate to ${remoteUserId}`);
        websocketRef.current.send(JSON.stringify({
          type: 'ice_candidate',
          candidate: event.candidate,
          target_user_id: remoteUserId,
          sender_user_id: userId
        }));
      }
    };
    
    pc.onicegatheringstatechange = () => {
      console.log(`ICE gathering state with ${remoteUserId}:`, pc.iceGatheringState);
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${remoteUserId}:`, pc.iceConnectionState);
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
    console.log(`Initiating offer to ${remoteUserId}`);
    const pc = peerConnectionsRef.current.get(remoteUserId);
    if (!pc) {
      console.log(`No peer connection found for ${remoteUserId}`);
      return;
    }
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log(`Local description set for offer to ${remoteUserId}`);
      
      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'offer',
          offer: offer,
          target_user_id: remoteUserId
        }));
        console.log(`Offer sent to ${remoteUserId}`);
      }
    } catch (error) {
      console.error(`Error creating offer to ${remoteUserId}:`, error);
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, senderUserId: string) => {
    console.log(`Handling offer from ${senderUserId}`);
    const pc = peerConnectionsRef.current.get(senderUserId);
    if (!pc) {
      console.log(`No peer connection found for ${senderUserId}, creating one`);
      createPeerConnection(senderUserId);
      const newPc = peerConnectionsRef.current.get(senderUserId);
      if (!newPc) return;
      
      try {
        await newPc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await newPc.createAnswer();
        await newPc.setLocalDescription(answer);
        console.log(`Answer created for ${senderUserId}`);
        
        if (websocketRef.current) {
          websocketRef.current.send(JSON.stringify({
            type: 'answer',
            answer: answer,
            target_user_id: senderUserId
          }));
          console.log(`Answer sent to ${senderUserId}`);
        }
      } catch (error) {
        console.error(`Error handling offer from ${senderUserId}:`, error);
      }
      return;
    }
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(`Answer created for ${senderUserId}`);
      
      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'answer',
          answer: answer,
          target_user_id: senderUserId
        }));
        console.log(`Answer sent to ${senderUserId}`);
      }
    } catch (error) {
      console.error(`Error handling offer from ${senderUserId}:`, error);
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, senderUserId: string) => {
    console.log(`Handling answer from ${senderUserId}`);
    const pc = peerConnectionsRef.current.get(senderUserId);
    if (!pc) {
      console.log(`No peer connection found for ${senderUserId}`);
      return;
    }
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`Remote description set for answer from ${senderUserId}`);
    } catch (error) {
      console.error(`Error handling answer from ${senderUserId}:`, error);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, senderUserId: string) => {
    console.log(`Handling ICE candidate from ${senderUserId}`);
    const pc = peerConnectionsRef.current.get(senderUserId);
    if (!pc) {
      console.log(`No peer connection found for ${senderUserId}`);
      return;
    }
    
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(`ICE candidate added for ${senderUserId}`);
    } catch (error) {
      console.error(`Error handling ICE candidate from ${senderUserId}:`, error);
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
    if (!userId) {
      console.log('WebSocket not connecting: userId not available yet');
      return;
    }
    
    console.log('WebSocket connecting with userId:', userId);
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
