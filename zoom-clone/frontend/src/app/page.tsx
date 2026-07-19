'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import MeetingCard from '@/components/MeetingCard';
import NewMeetingModal from '@/components/NewMeetingModal';
import JoinMeetingModal from '@/components/JoinMeetingModal';
import ScheduleMeetingModal from '@/components/ScheduleMeetingModal';

interface Meeting {
  id: number;
  meeting_id: string;
  title: string;
  description?: string;
  scheduled_time?: string;
  duration?: number;
  is_active: boolean;
  created_at: string;
}

export default function Home() {
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [showJoinMeeting, setShowJoinMeeting] = useState(false);
  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);

  const API_BASE = 'http://localhost:8000/api';
  const DEFAULT_USER_ID = 1;

  useEffect(() => {
    fetchMeetings();
    seedDatabase();
  }, []);

  const seedDatabase = async () => {
    try {
      await fetch(`${API_BASE}/seed`, { method: 'POST' });
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  };

  const fetchMeetings = async () => {
    try {
      const [upcomingRes, recentRes] = await Promise.all([
        fetch(`${API_BASE}/meetings/user/${DEFAULT_USER_ID}/upcoming`),
        fetch(`${API_BASE}/meetings/user/${DEFAULT_USER_ID}/recent`)
      ]);
      
      if (upcomingRes.ok) {
        const upcomingData = await upcomingRes.json();
        setUpcomingMeetings(upcomingData);
      }
      
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentMeetings(recentData);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  const handleNewMeeting = async () => {
    console.log('handleNewMeeting function called');
    try {
      console.log('Calling API to create meeting...');
      const res = await fetch(`${API_BASE}/meetings/instant?host_id=${DEFAULT_USER_ID}`, {
        method: 'POST'
      });
      console.log('API response status:', res.status);
      if (res.ok) {
        const meeting = await res.json();
        console.log('Meeting created successfully:', meeting);
        setCurrentMeeting(meeting);
        setShowNewMeeting(false);
        console.log('Redirecting to meeting room...');
        window.location.href = `/meeting/${meeting.meeting_id}?host=true&name=Host`;
      } else {
        console.error('API returned error:', res.status);
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  };

  const handleJoinMeeting = async (meetingId: string, displayName: string) => {
    try {
      const res = await fetch(`${API_BASE}/meetings/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId, display_name: displayName })
      });
      if (res.ok) {
        const data = await res.json();
        setShowJoinMeeting(false);
        window.location.href = `/meeting/${meetingId}`;
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
    }
  };

  const handleScheduleMeeting = async (meetingData: any) => {
    console.log('handleScheduleMeeting function called with data:', meetingData);
    try {
      console.log('Calling API to schedule meeting...');
      const res = await fetch(`${API_BASE}/meetings/schedule?host_id=${DEFAULT_USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData)
      });
      console.log('API response status:', res.status);
      if (res.ok) {
        const meeting = await res.json();
        console.log('Meeting scheduled successfully:', meeting);
        setShowScheduleMeeting(false);
        fetchMeetings();
      } else {
        console.error('API returned error:', res.status);
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Video Conferencing Made Easy
          </h1>
          <p className="text-lg text-gray-600">
            Connect with anyone, anywhere, anytime
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <button
            onClick={() => setShowNewMeeting(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Meeting
          </button>
          <button
            onClick={() => setShowJoinMeeting(true)}
            className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-8 rounded-lg border border-gray-300 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Join Meeting
          </button>
          <button
            onClick={() => setShowScheduleMeeting(true)}
            className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-8 rounded-lg border border-gray-300 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Schedule Meeting
          </button>
        </div>

        {/* Upcoming Meetings */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Meetings</h2>
          {upcomingMeetings.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No upcoming meetings scheduled
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Meetings */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Meetings</h2>
          {recentMeetings.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No recent meetings
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showNewMeeting && (
        <NewMeetingModal
          onClose={() => setShowNewMeeting(false)}
          onConfirm={handleNewMeeting}
        />
      )}

      {showJoinMeeting && (
        <JoinMeetingModal
          onClose={() => setShowJoinMeeting(false)}
          onJoin={handleJoinMeeting}
        />
      )}

      {showScheduleMeeting && (
        <ScheduleMeetingModal
          onClose={() => setShowScheduleMeeting(false)}
          onSchedule={handleScheduleMeeting}
        />
      )}
    </div>
  );
}
