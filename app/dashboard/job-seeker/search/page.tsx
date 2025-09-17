'use client';

import { useState } from 'react';
import { ArrowLeft, X, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const recentSearches = [
  { id: 1, query: 'Delivery', time: '3 minutes ago' },
  { id: 2, query: 'Carpenter', time: '5 minutes ago' }
];

const suggestions = ['Carpenter', 'Car Washer', 'Car Detailer', 'Car Driver'];

const trySearching = ['Mechanic', 'Carpenter', 'Plumber'];

const suggestCategories = ['Mechanic', 'Carpenter', 'Plumber'];

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  return (
    <div className="h-screen bg-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b">
  <button onClick={() => router.push('/dashboard/job-seeker')} className="mr-3">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search Job"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
      </div>

      <div className="p-4">
        {/* Recent Searches */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Searches</h2>
            <button className="text-green-600 text-sm">Clear</button>
          </div>
          <div className="space-y-2">
            {recentSearches.map((search) => (
              <div key={search.id} className="flex items-center space-x-3">
                <Search className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium">{search.query}</p>
                  <p className="text-sm text-gray-500">{search.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Try Searching for */}
        <div className="mb-6">
          <h2 className="font-semibold mb-3">Try Searching for</h2>
          <div className="space-y-2">
            {trySearching.map((item) => (
              <div key={item} className="flex items-center space-x-3">
                <Search className="w-4 h-4 text-gray-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Suggest Categories */}
        <div>
          <h2 className="font-semibold mb-3">Suggest Categories</h2>
          <div className="space-y-2">
            {suggestCategories.map((category) => (
              <div key={category} className="flex items-center space-x-3">
                <Search className="w-4 h-4 text-gray-400" />
                <span>{category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}