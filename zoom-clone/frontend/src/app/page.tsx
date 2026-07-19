'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, LogIn, Calendar, Clock, Users } from 'lucide-react';
import Navbar from '@/components/Navbar';
import MeetingCard from '@/components/MeetingCard';
import NewMeetingModal from '@/components/NewMeetingModal';
import { meetingsApi, DEFAULT_USER_ID } from '@/lib/api';

interface Meeting {
  id: number;
  meeting_id: string;
  title?: string;
  description?: string;
  scheduled_time?: string;
  duration?: number;
  is_active: boolean;
  created_at: string;
}

export default function Home() {
  const router = useRouter();
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      setIsLoading(true);
      const [upcoming, recent] = await Promise.all([
        meetingsApi.getUpcomingMeetings(DEFAULT_USER_ID),
        meetingsApi.getRecentMeetings(DEFAULT_USER_ID)
      ]);
      setUpcomingMeetings(upcoming);
      setRecentMeetings(recent);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewMeeting = async () => {
    try {
      const meeting = await meetingsApi.createInstantMeeting(DEFAULT_USER_ID);
      setShowNewMeeting(false);
      router.push(`/meeting/${meeting.meeting_id}?host=true&name=Host`);
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-6 shadow-lg">
            <Video className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Video Conferencing Made Easy
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect with anyone, anywhere, anytime. Experience seamless video meetings with professional features.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <button
            onClick={() => setShowNewMeeting(true)}
            className="group bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Video className="w-5 h-5" />
            New Meeting
          </button>
          <button
            onClick={() => router.push('/join')}
            className="group bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-8 rounded-xl border-2 border-gray-200 transition-all duration-200 flex items-center gap-3 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <LogIn className="w-5 h-5" />
            Join Meeting
          </button>
          <button
            onClick={() => router.push('/schedule')}
            className="group bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-8 rounded-xl border-2 border-gray-200 transition-all duration-200 flex items-center gap-3 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <Calendar className="w-5 h-5" />
            Schedule Meeting
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading meetings...</p>
          </div>
        ) : (
          <>
            {/* Upcoming Meetings */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Upcoming Meetings</h2>
              </div>
              {upcomingMeetings.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No upcoming meetings scheduled</p>
                  <p className="text-gray-400 text-sm mt-2">Click "Schedule Meeting" to plan your next call</p>
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
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Recent Meetings</h2>
              </div>
              {recentMeetings.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No recent meetings</p>
                  <p className="text-gray-400 text-sm mt-2">Your meeting history will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentMeetings.map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Modal */}
      {showNewMeeting && (
        <NewMeetingModal
          onClose={() => setShowNewMeeting(false)}
          onConfirm={handleNewMeeting}
        />
      )}
    </div>
  );
}
