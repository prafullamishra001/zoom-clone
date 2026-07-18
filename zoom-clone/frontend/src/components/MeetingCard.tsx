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
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {meeting.title}
          </h3>
          {meeting.description && (
            <p className="text-sm text-gray-600 mb-2">{meeting.description}</p>
          )}
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          meeting.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {meeting.is_active ? 'Active' : 'Ended'}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        {meeting.scheduled_time && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(meeting.scheduled_time)}
          </div>
        )}
        {meeting.duration && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {meeting.duration} minutes
          </div>
        )}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          Meeting ID: {meeting.meeting_id}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
        <button
          onClick={() => window.location.href = `/meeting/${meeting.meeting_id}`}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Join
        </button>
        <button
          onClick={copyMeetingLink}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Copy Link
        </button>
      </div>
    </div>
  );
}
