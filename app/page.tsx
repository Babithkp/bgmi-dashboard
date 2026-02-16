"use client";
import { User, Calendar, CalendarOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardData {
  tournaments: Tournament[];
  teamsCount: number;
  playersCount: number;
}

interface Tournament {
  id: number;
  name: string;
  date: Date;
  time: string;
  totalDays: number;
  totalMatches: number;
  matches: Match[];
}

interface Match {
  id: string;
  name: string;
  status: "Live" | "Completed";
}

export default function Home() {
  const [tournamentsData, setTournamentsData] = useState<DashboardData>();

  const liveTournaments = tournamentsData?.tournaments?.filter((t) =>
    t.matches.some((match) => match.status === "Live"),
  );
  const fetchTournaments = async () => {
    const response = await fetch("/api/dashboard");
    const data = await response.json();
    setTournamentsData(data);
  };
  useEffect(() => {
    const reFetchAll = async () => {
      await fetchTournaments();
    };
    reFetchAll();
  }, []);
  return (
    <>
      {/* Header */}
      <header className="h-16 bg-[#0a0e1a] border-b border-gray-800 px-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-100">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">System Overview</p>
        </div>
        <button className="w-9 h-9 rounded-lg bg-[#131720] border border-gray-800 flex items-center justify-center hover:bg-[#1a1f2e] transition-colors">
          <User className="w-4 h-4 text-gray-400" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Tournament - Spans 2 columns */}
            <div className="lg:col-span-2 bg-[#131720] border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-medium text-gray-400 mb-4">
                Active Tournament
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-gray-100 mb-2">
                    {liveTournaments
                      ? liveTournaments[0]?.name
                      : "Start new Tournament"}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>
                      {liveTournaments
                        ? new Date(
                            liveTournaments[0]?.date,
                          ).toLocaleDateString()
                        : "Start Date"}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                    <span>
                      {liveTournaments
                        ? liveTournaments[0]?.time
                        : "Start Date"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Status:</span>
                  <span className="px-3 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
                    Live
                  </span>
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <Link
                    href={`/tournaments/${liveTournaments ? liveTournaments[0]?.id : 0}`}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Open Tournament
                  </Link>
                </div>
              </div>
            </div>

            {/* System Statistics */}
            <div className="bg-[#131720] border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-medium text-gray-400 mb-4">
                System Statistics
              </h2>

              <div className="space-y-5">
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Total Tournaments
                  </p>
                  <p className="text-2xl font-medium text-gray-100">{tournamentsData?.tournaments.length}</p>
                </div>

                <div className="border-t border-gray-800 pt-5">
                  <p className="text-xs text-gray-500 mb-1">Total Teams</p>
                  <p className="text-2xl font-medium text-gray-100">{tournamentsData?.teamsCount}</p>
                </div>

                <div className="border-t border-gray-800 pt-5">
                  <p className="text-xs text-gray-500 mb-1">Total Players</p>
                  <p className="text-2xl font-medium text-gray-100">{tournamentsData?.playersCount}</p>
                </div>
              </div>
            </div>

            {/* Broadcast System Status - Spans full width */}
            <div className="lg:col-span-3 bg-[#131720] border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-medium text-gray-400 mb-4">
                All Tournaments
              </h2>

              {Array.isArray(tournamentsData?.tournaments) &&
              tournamentsData.tournaments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tournamentsData?.tournaments.map((tournament) => (
                    <Link
                      key={tournament.id}
                      href={`/tournaments/${tournament.id}`}
                      className="bg-[#0a0e1a] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors group"
                    >
                      <h3 className="text-sm font-medium text-gray-100 mb-3 group-hover:text-blue-400 transition-colors">
                        {tournament.name}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(tournament.date).toLocaleDateString()} • {tournament.time}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{tournament.totalDays} days</span>
                          <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                          <span>{tournament.totalMatches} matches</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
                    <CalendarOff className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    No Upcoming Tournaments
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    There are no tournaments scheduled at the moment
                  </p>
                  <Link
                    href="/tournaments"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Create Tournament
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
