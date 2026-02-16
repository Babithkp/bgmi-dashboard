"use client";import React, { useEffect, useState } from "react";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { TeamFormData } from "@/app/teams-players/page";
import Details from "@/app/components/tournmants/Details";
import LiveData from "@/app/components/tournmants/LiveData";
import Links from "@/app/components/tournmants/Links";

type Tab = "details" | "liveData" | "links";

interface Player {
  id: string;
  name: string;
  gameName: string;
  image: string;
  placementPoints: number;
  finishesPoints: number;
  team?: TeamFormData | null;
}


export interface Match {
  id: string;
  name: string;
  status: "upcoming" | "Live" | "Completed";
  day: Date;
  playerPerformances: PlayerPerformance[];
  winTeam?: TeamFormData;
  group: string;
}

interface PlayerPerformance {
  id: string;
  player: Player;
  placementPoints: number;
  finishesPoints: number;
  totalPoints: number;
  status: string;
  teamContribution: number;
}

export interface Tournament {
  id: string;
  name: string;
  image: string;
  date: Date;
  time: string;
  teamTournaments: TeamTournaments[];
}

interface TeamTournaments {
  id: string;
  team: TeamFormData;
  group: string;
}

export default function TournamentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [teamList, setTeams] = useState<TeamFormData[]>([]);
  const [tournament, setTournament] = useState<Tournament>();
  const [allMatchData, setAllMatchData] = useState<Match[]>();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);  

  async function fetchTeams() {
    const response = await fetch("/api/team");
    const data = await response.json();
    setTeams(data);
  }

  async function fetchMatches(id: string) {
    const response = await fetch(`/api/tournament/match/${id}`);
    const data = await response.json();
    setAllMatchData(data);
    setSelectedMatch(data[0]);
  }

  async function refetchAll() {
    const { id } = await params;
    fetchMatches(id);
    fetchTeams();
  }

  useEffect(() => {
    const fetchTournament = async () => {
      const { id } = await params;
      if (!id) return;
      const response = await fetch(`/api/tournament/${id}`);
      if (!response.ok) return;
      const data = await response.json();
      setTournament(data);
      fetchMatches(id);
      fetchTeams();
    };
    fetchTournament();
  }, [params]);

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-[#0a0e1a] border-b border-gray-800 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/tournaments"
            className="w-9 h-9 rounded-lg bg-[#131720] border border-gray-800 flex items-center justify-center hover:bg-[#1a1f2e] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-lg font-medium text-gray-100">
              {tournament && tournament?.name}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Tournament Management
            </p>
          </div>
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
                onClick={() => setActiveTab("details")}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "details"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab("liveData")}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "liveData"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Live Data
              </button>
              <button
                onClick={() => setActiveTab("links")}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "links"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                API Links
              </button>
            </div>
          </div>

          {/* Details Tab */}
          {activeTab === "details" && (
            <Details
              teamList={teamList}
              tournament={tournament}
              setTournament={setTournament}
            />
          )}

          {/* Live Data Tab */}
          {activeTab === "liveData" && (
            <LiveData
              allMatchData={allMatchData}
              setSelectedMatch={setSelectedMatch}
              selectedMatch={selectedMatch}
              refetchAll={refetchAll}
              tournament={tournament}
            />
          )}

          {/* Links Tab */}
          {activeTab === "links" && <Links tournamentId={tournament?.id} />}
        </div>
      </main>
    </>
  );
}
