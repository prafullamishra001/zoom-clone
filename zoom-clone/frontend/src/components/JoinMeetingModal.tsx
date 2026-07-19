'use client';

import { useState } from 'react';

interface JoinMeetingModalProps {
  onClose: () => void;
  onJoin: (meetingId: string, displayName: string) => void;
}

export default function JoinMeetingModal({ onClose, onJoin }: JoinMeetingModalProps) {
  const [meetingId, setMeetingId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const validateMeeting = async (id: string) => {
    if (id.length !== 10) return false;
    try {
      const res = await fetch(`http://localhost:8000/api/meetings/${id}`);
      return res.ok;
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

    onJoin(meetingId.trim(), displayName.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Join Meeting</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="meetingId" className="block text-sm font-medium text-gray-700 mb-1">
                Meeting ID
              </label>
              <input
                type="text"
                id="meetingId"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                placeholder="Enter 10-digit meeting ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                maxLength={10}
              />
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  console.log('Cancel button clicked');
                  onClose();
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
                disabled={isValidating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isValidating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? 'Validating...' : 'Join Meeting'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
