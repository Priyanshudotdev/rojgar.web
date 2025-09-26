"use client";
import { MessageCircle } from 'lucide-react';

export default function CompanyChatPage() {
  return (
    <div className="flex flex-col h-full pb-20">
      <div className="sticky top-0 z-20">
        <div className="bg-green-600 text-white px-4 sm:px-6 py-3 flex items-center gap-3">
          <MessageCircle className="w-5 h-5" />
          <h1 className="text-base sm:text-lg font-semibold tracking-tight">Messages</h1>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-white flex items-center justify-center p-8">
        <div className="text-center">
          <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800">No chats yet</h2>
          <p className="text-sm text-gray-500">Chats will appear here when available.</p>
        </div>
      </div>
    </div>
  );
}
