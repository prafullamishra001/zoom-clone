'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, FileText, Clock, Timer, X, AlertCircle } from 'lucide-react';
import { meetingsApi, DEFAULT_USER_ID } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function SchedulePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!title.trim() || !scheduledTime) {
      setError('Please fill in all required fields');
      return;
    }

    setIsScheduling(true);
    try {
      await meetingsApi.scheduleMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_time: new Date(scheduledTime).toISOString(),
        duration: duration
      }, DEFAULT_USER_ID);
      router.push('/');
    } catch (error) {
      setError('Failed to schedule meeting. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Meeting</h1>
            <p className="text-gray-600">Plan your meeting in advance</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Team Standup"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description (optional)"
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-2">
                Date & Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="datetime-local"
                  id="scheduledTime"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Duration
              </label>
              <div className="relative">
                <Timer className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isScheduling}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScheduling ? 'Scheduling...' : 'Schedule Meeting'}
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
