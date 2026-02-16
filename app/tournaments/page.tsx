"use client";import { useEffect, useState } from "react";
import { User, Plus, Search, Calendar } from "lucide-react";
import CreateTournamentModal from "../components/CreateTournamentModal";
import Link from "next/link";
import Image from "next/image";

type TournamentStatus = "upcoming" | "live" | "past";

interface Tournament {
  id: number;
  name: string;
  image: string;
  totalDays: number;
  totalMatches: number;
  date: string;
  time: string;
  status: TournamentStatus;
  matches: Match[];
}

interface Match {
  id: string;
  status: "Live" | "Completed";
}

export default function Tournaments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const today = new Date();
  today.setHours(0, 0, 0, 0); // normalize

  const liveTournaments = tournaments.filter((t) =>
    t.matches.some((match) => match.status === "Live"),
  );

  const upcomingTournaments = tournaments.filter((t) => {
    const d = new Date(t.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  });

  const pastTournaments = tournaments.filter((t) => {
    const d = new Date(t.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  });

  const fetchTournaments = async () => {
    const response = await fetch("/api/tournament");
    const data = await response.json();
    setTournaments(data);
  };
  useEffect(() => {
    const reFetchAll = async () => {
      await fetchTournaments();
    };
    reFetchAll();
  }, []);
  const TournamentCard = ({ tournament }: { tournament: Tournament }) => (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="bg-[#131720] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors group"
    >
      <div className="relative h-40 overflow-hidden">
        <Image
          src={tournament.image}
          alt={tournament.name}
          width={400}
          height={250}
          unoptimized
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {tournament.status === "live" && (
          <div className="absolute top-3 right-3 px-2.5 py-1 bg-red-500 text-white text-xs font-medium rounded-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            LIVE
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-100 mb-3">
          {tournament.name}
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {new Date(tournament.date).toLocaleDateString()} •{" "}
              {new Date(tournament.date).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <>
      <header className="h-16 bg-[#0a0e1a] border-b border-gray-800 px-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-100">Tournaments</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage and track all tournaments
          </p>
        </div>
        <button className="w-9 h-9 rounded-lg bg-[#131720] border border-gray-800 flex items-center justify-center hover:bg-[#1a1f2e] transition-colors">
          <User className="w-4 h-4 text-gray-400" />
        </button>
      </header>

      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search tournaments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#131720] border border-gray-800 rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-gray-700"
              />
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Tournament
            </button>
          </div>

          {liveTournaments.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Live Now
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            </div>
          )}

          {upcomingTournaments.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-400 mb-4">
                Upcoming
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            </div>
          )}

          {pastTournaments.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-400 mb-4">Past</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <CreateTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => [setIsCreateModalOpen(false), fetchTournaments()]}
      />
    </>
  );
}
