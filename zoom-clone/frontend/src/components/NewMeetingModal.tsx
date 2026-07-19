'use client';

import { Video, Info, X } from 'lucide-react';

interface NewMeetingModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export default function NewMeetingModal({ onClose, onConfirm }: NewMeetingModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 rounded-xl p-2">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Start a New Meeting</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <p className="text-gray-600 mb-6">
            Start an instant meeting. You can invite others by sharing the meeting link.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                A unique meeting ID will be generated automatically
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg"
            >
              Start Meeting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
