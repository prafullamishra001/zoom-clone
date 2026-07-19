'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';

export default function MeetingRoom() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = params.meetingId as string;
  const isHostFromUrl = searchParams.get('host') === 'true';
  const hostNameFromUrl = searchParams.get('name') || 'Host';
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [displayName, setDisplayName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [meetingExists, setMeetingExists] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  const [meeting, setMeeting] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const API_BASE = 'http://localhost:8000/api';
  const DEFAULT_USER_ID = 1;

  // WebRTC integration
  const { isConnected: webrtcConnected, setLocalStream: setWebRTCStream, disconnect: disconnectWebRTC } = useWebRTC({
    meetingId,
    userId: currentUser?.id?.toString() || '',
    onRemoteStream: (userId, stream) => {
      console.log(`Received remote stream from user ${userId}`, stream);
      setRemoteStreams(prev => new Map(prev.set(userId, stream)));
    },
    onUserLeft: (userId) => {
      console.log(`User ${userId} left`);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    }
  });

  // Debug currentUser changes
  useEffect(() => {
    console.log('currentUser changed:', currentUser);
    console.log('userId for WebRTC:', currentUser?.id?.toString() || 'not set');
  }, [currentUser]);

  // Update WebRTC with local stream when available
  useEffect(() => {
    if (localStream && currentUser) {
      setWebRTCStream(localStream);
    }
  }, [localStream, currentUser, setWebRTCStream]);

  useEffect(() => {
    validateMeeting();
  }, [meetingId]);

  const validateMeeting = async () => {
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}`);
      if (res.ok) {
        const meetingData = await res.json();
        setMeeting(meetingData);
        setMeetingExists(true);
        setIsLoading(false);
        
        // If coming from dashboard as host, auto-join
        if (isHostFromUrl) {
          autoJoinAsHost(meetingData);
        }
      } else {
        setMeetingExists(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error validating meeting:', error);
      setMeetingExists(false);
      setIsLoading(false);
    }
  };

  const autoJoinAsHost = async (meetingData: any) => {
    try {
      const res = await fetch(`${API_BASE}/meetings/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId, display_name: hostNameFromUrl })
      });
      
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setIsJoined(true);
        setIsHost(true);
        await startLocalVideo();
        fetchParticipants();
        startPolling();
      }
    } catch (error) {
      console.error('Error auto-joining as host:', error);
    }
  };

  const handleJoin = async () => {
    if (!displayName.trim()) {
      alert('Please enter your display name');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/meetings/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId, display_name: displayName.trim() })
      });
      
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setIsJoined(true);
        
        // Check if user is host
        if (meeting && data.user.id === meeting.host_id) {
          setIsHost(true);
        }
        
        await startLocalVideo();
        fetchParticipants();
        startPolling();
      } else {
        alert('Failed to join meeting');
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      alert('Failed to join meeting');
    }
  };

  const startPolling = () => {
    // Poll for participants every 3 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchParticipants();
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      return null;
    }
  };

  const fetchParticipants = async () => {
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/participants`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        setIsScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } catch (error) {
        console.error('Error sharing screen:', error);
      }
    } else {
      setIsScreenSharing(false);
    }
  };

  const leaveMeeting = async () => {
    stopPolling();
    disconnectWebRTC();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    router.push('/');
  };

  const handleMuteAll = async () => {
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/mute-all`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchParticipants();
        alert('All participants muted');
      }
    } catch (error) {
      console.error('Error muting all:', error);
    }
  };

  const handleMuteParticipant = async (participantId: number) => {
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/participants/${participantId}/mute`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchParticipants();
      }
    } catch (error) {
      console.error('Error muting participant:', error);
    }
  };

  const handleUnmuteParticipant = async (participantId: number) => {
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/participants/${participantId}/unmute`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchParticipants();
      }
    } catch (error) {
      console.error('Error unmuting participant:', error);
    }
  };

  const handleRemoveParticipant = async (participantId: number) => {
    if (!confirm('Are you sure you want to remove this participant?')) {
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/participants/${participantId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchParticipants();
        alert('Participant removed');
      }
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/meeting/${meetingId}`;
    navigator.clipboard.writeText(link);
    alert('Meeting link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading meeting...</div>
      </div>
    );
  }

  if (!meetingExists) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 rounded-lg p-8 text-center max-w-md">
          <h1 className="text-white text-2xl font-bold mb-4">Meeting Not Found</h1>
          <p className="text-gray-400 mb-6">The meeting with ID {meetingId} does not exist or has ended.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
          <h1 className="text-white text-2xl font-bold mb-2">Join Meeting</h1>
          <p className="text-gray-400 mb-6">Meeting ID: {meetingId}</p>
          
          <div className="mb-6">
            <label htmlFor="displayName" className="block text-white text-sm font-medium mb-2">
              Display Name *
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>

          <button
            onClick={handleJoin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Join Meeting
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-semibold">Meeting: {meetingId}</h1>
          <span className="text-gray-400 text-sm">
            {participants.length + 1} participant{participants.length + 1 !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyInviteLink}
            className="text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Copy Invite Link
          </button>
          <button
            onClick={leaveMeeting}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  You
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              You
            </div>
            {isMuted && (
              <div className="absolute bottom-2 right-2 bg-red-600 rounded-full p-1">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Participant Videos with WebRTC */}
          {participants.map((participant) => {
            const participantUserId = participant.user_id?.toString() || participant.id.toString();
            const remoteStream = remoteStreams.get(participantUserId);
            console.log(`Rendering participant ${participant.id}, user_id: ${participantUserId}, has stream: ${!!remoteStream}`);
            return (
              <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                {remoteStream ? (
                  <video
                    ref={(el) => {
                      if (el) {
                        console.log(`Setting video element for participant ${participantUserId}`);
                        remoteVideoRefs.current.set(participant.id.toString(), el);
                        el.srcObject = remoteStream;
                        el.autoplay = true;
                        el.playsInline = true;
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold">
                      {participant.user?.display_name?.charAt(0) || 'U'}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  {participant.user?.display_name || 'Participant'}
                </div>
                {!remoteStream && (
                  <div className="absolute top-2 right-2 bg-yellow-600 rounded-full p-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add more placeholder participants if needed */}
          {participants.length === 0 && (
            <>
              <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                  <div className="text-gray-400 text-center">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Waiting for others to join...</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Participants ({participants.length + 1})</h2>
            {isHost && (
              <button
                onClick={handleMuteAll}
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
              >
                Mute All
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 bg-gray-700 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                You
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{currentUser?.display_name || 'You'}</p>
                <p className="text-gray-400 text-xs">{isHost ? 'Host' : 'Participant'}</p>
              </div>
              {isMuted && (
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                </svg>
              )}
            </div>
            
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center gap-3 p-2 bg-gray-700 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
                  {participant.user?.display_name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    {participant.user?.display_name || 'Participant'}
                  </p>
                  <p className="text-gray-400 text-xs">Participant</p>
                </div>
                
                {isHost && (
                  <div className="flex gap-1">
                    {participant.is_muted ? (
                      <button
                        onClick={() => handleUnmuteParticipant(participant.id)}
                        className="p-1 hover:bg-gray-600 rounded transition-colors"
                        title="Unmute"
                      >
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMuteParticipant(participant.id)}
                        className="p-1 hover:bg-gray-600 rounded transition-colors"
                        title="Mute"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveParticipant(participant.id)}
                      className="p-1 hover:bg-gray-600 rounded transition-colors"
                      title="Remove"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                )}
                
                {!isHost && participant.is_muted && (
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                  </svg>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-white font-semibold mb-3">Meeting Info</h3>
            <div className="bg-gray-700 rounded-lg p-3 space-y-2">
              <div>
                <p className="text-gray-400 text-xs">Meeting ID</p>
                <p className="text-white text-sm font-mono">{meetingId}</p>
              </div>
              <button
                onClick={copyInviteLink}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors"
              >
                Copy Invite Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-colors ${
              isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-colors ${
              !isVideoOn ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isVideoOn ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
              </svg>
            )}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-colors ${
              isScreenSharing ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.11-.9-2-2-2H4c-1.11 0-2 .89-2 2v10c0 1.1.89 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
            </svg>
          </button>

          <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 24h2v-2H7v2zm4 0h2v-2h-2v2zm4 0h2v-2h-2v2zM16.5 3c-4.14 0-7.5 3.36-7.5 7.5 0 4.14 3.36 7.5 7.5 7.5S24 14.64 24 10.5 20.64 3 16.5 3zm0 13c-3.03 0-5.5-2.47-5.5-5.5S13.47 5 16.5 5 22 7.47 22 10.5 19.53 16 16.5 16zM9 5c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h3c.55 0 1-.45 1-1V5zm-1 3H5V5h3v3z"/>
            </svg>
          </button>

          <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </button>

          <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
          </button>

          <button
            onClick={leaveMeeting}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors ml-4"
          >
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
