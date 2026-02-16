"use client"
import { User } from 'lucide-react';
import { useEffect, useState } from 'react';

import TeamList from '../components/TeamList';
import PlayersList from '../components/PlayersList';

type Tab = 'players' | 'teams';

export interface TeamFormData {
  id: string;
  name: string;
  image: string;
  createdAt: string;
  players: PlayerFormData[];
}
export interface PlayerFormData {
  id: string;
  name: string;
  gameName: string;
  team: PlayerFormData;
  image: string;
}





export default function TeamsPlayers() {


  const [activeTab, setActiveTab] = useState<Tab>('players');



  const [Teams, setTeams] = useState<TeamFormData[]>([]);
  const [players, setPlayers] = useState<PlayerFormData[]>([]);

  async function fetchTeams() {
    const response = await fetch('/api/team');
    const data = await response.json();
    setTeams(data);
  }

  async function fetchPlayers() {
    const response = await fetch('/api/players');
    const data = await response.json();
    setPlayers(data);
  }

  const reFetchAll = async () => {
    await fetchTeams()
    await fetchPlayers()
  }


  useEffect(() => {
    const loadTeams = async () => {
      await fetchTeams()
      await fetchPlayers()
    }
    loadTeams()
  }, []);



  return (
    <>
      {/* Header */}
      <header className="h-16 bg-[#0a0e1a] border-b border-gray-800 px-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-100">Teams & Players</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage teams and player rosters</p>
        </div>
        <button className="w-9 h-9 rounded-lg bg-[#131720] border border-gray-800 flex items-center justify-center hover:bg-[#1a1f2e] transition-colors">
          <User className="w-4 h-4 text-gray-400" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          {/* Tabs */}
          <div className="border-b border-gray-800 mb-6">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('players')}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'players'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
              >
                Players
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'teams'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
              >
                Teams
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-[#131720] border border-gray-800 rounded-xl overflow-hidden">


            {/* Players Table */}
            {(activeTab === 'players' && players) && (
              <PlayersList players={players} reFetchAll={reFetchAll} Teams={Teams} />
            )}

            {/* Teams Table */}
            {activeTab === 'teams' && (
              <TeamList Teams={Teams} reFetchAll={reFetchAll} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}