'use client';

import { Calendar, Clock, Hash, Copy, Video } from 'lucide-react';

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

interface MeetingCardProps {
  meeting: Meeting;
}

export default function MeetingCard({ meeting }: MeetingCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyMeetingLink = () => {
    const link = `${window.location.origin}/meeting/${meeting.meeting_id}`;
    navigator.clipboard.writeText(link);
    alert('Meeting link copied to clipboard!');
  };

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 p-6 border border-gray-100 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {meeting.title || 'Instant Meeting'}
          </h3>
          {meeting.description && (
            <p className="text-sm text-gray-600 mb-2">{meeting.description}</p>
          )}
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
          meeting.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {meeting.is_active ? 'Active' : 'Ended'}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        {meeting.scheduled_time && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {formatDate(meeting.scheduled_time)}
          </div>
        )}
        {meeting.duration && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {meeting.duration} minutes
          </div>
        )}
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Meeting ID: {meeting.meeting_id}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
        <button
          onClick={() => {
            window.location.href = `/meeting/${meeting.meeting_id}`;
          }}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
        >
          <Video className="w-4 h-4" />
          Join
        </button>
        <button
          onClick={copyMeetingLink}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Copy Link
        </button>
      </div>
    </div>
  );
}
