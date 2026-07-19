'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Hash, User, AlertCircle } from 'lucide-react';
import { meetingsApi } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function JoinPage() {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const validateMeeting = async (id: string) => {
    if (id.length !== 10) return false;
    try {
      await meetingsApi.getMeeting(id);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!meetingId.trim() || !displayName.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (meetingId.trim().length !== 10) {
      setError('Meeting ID must be 10 digits');
      return;
    }

    setIsValidating(true);
    const exists = await validateMeeting(meetingId.trim());
    setIsValidating(false);

    if (!exists) {
      setError('Meeting not found. Please check the meeting ID.');
      return;
    }

    try {
      await meetingsApi.joinMeeting({ 
        meeting_id: meetingId.trim(), 
        display_name: displayName.trim() 
      });
      router.push(`/meeting/${meetingId.trim()}`);
    } catch (error) {
      setError('Failed to join meeting. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Meeting</h1>
            <p className="text-gray-600">Enter the meeting ID to join</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="meetingId" className="block text-sm font-medium text-gray-700 mb-2">
                Meeting ID
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="meetingId"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit meeting ID"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                  maxLength={10}
                />
              </div>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isValidating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? 'Validating...' : 'Join Meeting'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
