'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, 
  Users, Copy, LogOut, MessageSquare, Settings, 
  Phone, PhoneOff, AlertCircle, UserPlus 
} from 'lucide-react';

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
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-white text-xl">Loading meeting...</div>
        </div>
      </div>
    );
  }

  if (!meetingExists) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-md mx-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-white text-2xl font-bold mb-4">Meeting Not Found</h1>
          <p className="text-gray-400 mb-6">The meeting with ID {meetingId} does not exist or has ended.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors shadow-md hover:shadow-lg"
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
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">Join Meeting</h1>
            <p className="text-gray-400">Meeting ID: {meetingId}</p>
          </div>
          
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
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>

          <button
            onClick={handleJoin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" />
            Join Meeting
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
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
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h1 className="text-white font-semibold">Meeting: {meetingId}</h1>
          </div>
          <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
            {participants.length + 1} participant{participants.length + 1 !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyInviteLink}
            className="text-gray-300 hover:text-white px-3 py-2 rounded-xl hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy Invite Link
          </button>
          <button
            onClick={leaveMeeting}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            Leave
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-2xl overflow-hidden aspect-video shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {currentUser?.display_name?.charAt(0) || 'Y'}
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm">
              You
            </div>
            {isMuted && (
              <div className="absolute bottom-3 right-3 bg-red-600 rounded-full p-2 shadow-lg">
                <MicOff className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Participant Videos with WebRTC */}
          {participants.map((participant) => {
            const participantUserId = participant.user_id?.toString() || participant.id.toString();
            const remoteStream = remoteStreams.get(participantUserId);
            console.log(`Rendering participant ${participant.id}, user_id: ${participantUserId}, has stream: ${!!remoteStream}`);
            return (
              <div key={participant.id} className="relative bg-gray-800 rounded-2xl overflow-hidden aspect-video shadow-lg">
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
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {participant.user?.display_name?.charAt(0) || 'U'}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm">
                  {participant.user?.display_name || 'Participant'}
                </div>
                {!remoteStream && (
                  <div className="absolute top-3 right-3 bg-yellow-600 rounded-full p-2 shadow-lg">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Add more placeholder participants if needed */}
          {participants.length === 0 && (
            <>
              <div className="relative bg-gray-800 rounded-2xl overflow-hidden aspect-video shadow-lg">
                <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                  <div className="text-gray-400 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
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
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-semibold">Participants ({participants.length + 1})</h2>
            </div>
            {isHost && (
              <button
                onClick={handleMuteAll}
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <MicOff className="w-3 h-3" />
                Mute All
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold shadow-md">
                {currentUser?.display_name?.charAt(0) || 'Y'}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{currentUser?.display_name || 'You'}</p>
                <p className="text-gray-400 text-xs">{isHost ? 'Host' : 'Participant'}</p>
              </div>
              {isMuted && (
                <MicOff className="w-4 h-4 text-red-500" />
              )}
            </div>
            
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center text-white font-semibold shadow-md">
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
                        className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Unmute"
                      >
                        <Mic className="w-4 h-4 text-green-500" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMuteParticipant(participant.id)}
                        className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Mute"
                      >
                        <MicOff className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveParticipant(participant.id)}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                )}
                
                {!isHost && participant.is_muted && (
                  <MicOff className="w-4 h-4 text-red-500" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Copy className="w-4 h-4 text-blue-400" />
              <h3 className="text-white font-semibold">Meeting Info</h3>
            </div>
            <div className="bg-gray-700 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-gray-400 text-xs mb-1">Meeting ID</p>
                <p className="text-white text-sm font-mono bg-gray-800 px-3 py-2 rounded-lg">{meetingId}</p>
              </div>
              <button
                onClick={copyInviteLink}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <Copy className="w-4 h-4" />
                Copy Invite Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-4">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all duration-200 ${
              isMuted ? 'bg-red-600 hover:bg-red-700 shadow-lg' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all duration-200 ${
              !isVideoOn ? 'bg-red-600 hover:bg-red-700 shadow-lg' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isVideoOn ? 'Turn off video' : 'Turn on video'}
          >
            {isVideoOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all duration-200 ${
              isScreenSharing ? 'bg-green-600 hover:bg-green-700 shadow-lg' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? <MonitorOff className="w-6 h-6 text-white" /> : <Monitor className="w-6 h-6 text-white" />}
          </button>

          <button 
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all duration-200"
            title="Participants"
          >
            <Users className="w-6 h-6 text-white" />
          </button>

          <button 
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all duration-200"
            title="Chat"
          >
            <MessageSquare className="w-6 h-6 text-white" />
          </button>

          <button 
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all duration-200"
            title="Settings"
          >
            <Settings className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={leaveMeeting}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all duration-200 shadow-lg ml-4"
            title="Leave meeting"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
