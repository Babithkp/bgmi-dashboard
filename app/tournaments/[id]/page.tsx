"use client";import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  User,
  Save,
  Copy,
  Check,
  ChevronDown,
  Upload,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { TeamFormData } from "@/app/teams-players/page";
import { toast } from "sonner";

type Tab = "details" | "liveData" | "links";

interface Player {
  id: number;
  name: string;
  placementPoints: number;
  finishesPoints: number;
  status: "alive" | "dead";
  team?: TeamData;
}

interface TeamData {
  id: string;
  name: string;
  players: Player[];
}

interface Match {
  id: string;
  name: string;
  status: "upcoming" | "Live" | "Completed";
  day: number;
  playerPerformances: PlayerPerformance[];
  winTeam?: TeamData;
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

interface Tournament {
  id: number;
  name: string;
  image: string;
  date: string;
  time: string;
  teamTournaments: TeamTournaments[];
}

interface TeamTournaments {
  id: string;
  team: TeamData;
}

const mockLinks = [
  {
    id: 1,
    name: "MVP of that match",
    url: "https://api.tournament.com/feeds/match-mvp",
  },
  {
    id: 2,
    name: "Top 5 MVP (different players)",
    url: "https://api.tournament.com/feeds/match-top5-mvp",
  },
  {
    id: 3,
    name: "Points table of that match",
    url: "https://api.tournament.com/feeds/match-points-table",
  },
  {
    id: 4,
    name: "WWCD stats (winning team)",
    url: "https://api.tournament.com/feeds/match-wwcd-stats",
  },
  {
    id: 5,
    name: "Overall top MVP",
    url: "https://api.tournament.com/feeds/overall-mvp",
  },
  {
    id: 6,
    name: "Overall top 5 MVP",
    url: "https://api.tournament.com/feeds/overall-top5-mvp",
  },
  {
    id: 7,
    name: "Overall points table",
    url: "https://api.tournament.com/feeds/overall-points-table",
  },
];

export default function TournamentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [selectedMatch, setSelectedMatch] = useState<Match>();
  const [allMatchData, setAllMatchData] = useState<Match[]>();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showMatchDropdown, setShowMatchDropdown] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [tournament, setTournament] = useState<Tournament>();
  const [teamList, setTeams] = useState<TeamFormData[]>([]);
  const [selectTeamState, setSelectTeamState] = useState<boolean>(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [newmatchTitle, setNewMatchTitle] = useState<string>("");
  const [winningTeamId, setWinningTeamId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    thumbnailFile: null as File | null,
  });

  const handleStatusChange = (
    performanceId: string,
    value: "Alive" | "Dead",
  ) => {
    setSelectedMatch((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        playerPerformances: prev.playerPerformances.map((p) =>
          p.id === performanceId ? { ...p, status: value } : p,
        ),
      };
    });
  };
  const handlePointsChange = (
    performanceId: string,
    field: "placementPoints" | "finishesPoints",
    value: string,
  ) => {
    const numericValue = Number(value);

    setSelectedMatch((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        playerPerformances: prev.playerPerformances.map((p) => {
          if (p.id !== performanceId) return p;

          const updated = {
            ...p,
            [field]: numericValue,
          };

          return {
            ...updated,
            totalPoints: updated.placementPoints + updated.finishesPoints,
          };
        }),
      };
    });
  };

  const groupedByTeam = selectedMatch?.playerPerformances.reduce(
    (acc, performance) => {
      const teamName = performance.player?.team?.name || "Unknown Team";

      if (!acc[teamName]) acc[teamName] = [];

      acc[teamName].push(performance);

      return acc;
    },
    {} as Record<string, typeof selectedMatch.playerPerformances>,
  );

  const handleCreateMatch = async () => {
    if (!newmatchTitle.trim()) {
      toast.error("Enter match title");
      return;
    }
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        body: JSON.stringify({
          title: newmatchTitle,
          tournamentId: tournament?.id,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to create match");
        return;
      }

      setNewMatchTitle("");
      toast.success("Match created");
      const { id } = await params;
      fetchMatches(id);
      fetchTeams();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  const handleAddTeam = (teamId: string) => {
    if (!teamId) return;

    if (selectedTeams.includes(teamId)) {
      toast.error("Team already added");
      return;
    }

    setSelectedTeams((prev) => [...prev, teamId]);
    setSelectTeamState(false);
  };

  const handleRemoveTeam = (teamId: string) => {
    setSelectedTeams((prev) => prev.filter((id) => id !== teamId));
  };

  const copyToClipboard = (url: string, id: number) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveScores = async () => {
    if (!selectedMatch) return;

    try {
      const res = await fetch(`/api/match/${selectedMatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performances: selectedMatch.playerPerformances,
          winningTeamId,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to save scores");
        return;
      }
      const { id } = await params;
      fetchMatches(id);
      fetchTeams();
      toast.success("Scores updated ✅");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditData((prev) => ({
      ...prev,
      thumbnailFile: file,
    }));

    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!tournament?.id) return;

    const body = new FormData();
    body.append("name", editData.name);
    body.append("teams", JSON.stringify(selectedTeams));

    if (editData.thumbnailFile) {
      body.append("thumbnail", editData.thumbnailFile);
    }

    const res = await fetch(`/api/tournament/${tournament.id}`, {
      method: "PATCH",
      body,
    });

    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }

    const updated = await res.json();
    setTournament(updated);

    toast.success("Tournament updated");
  };

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

  const getMatchStatusBadge = (status: Match["status"]) => {
    switch (status) {
      case "Live":
        return (
          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20 rounded">
            Live
          </span>
        );
      case "Completed":
        return (
          <span className="px-2 py-0.5 bg-gray-700/30 text-gray-400 text-xs font-medium border border-gray-700 rounded">
            Completed
          </span>
        );
      case "upcoming":
        return (
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 rounded">
            Upcoming
          </span>
        );
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWinningTeamId(null);
  }, [selectedMatch]);
  useEffect(() => {
    if (!tournament) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditData({
      name: tournament.name,
      thumbnailFile: null,
    });
    setSelectedTeams(tournament.teamTournaments.map((tt) => tt.team.id));
  }, [tournament]);

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
              {tournament?.name}
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
            <div className="space-y-6">
              <div className="bg-[#131720] border border-gray-800 rounded-xl p-6">
                <h2 className="text-sm font-medium text-gray-400 mb-4">
                  Tournament Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">
                      Tournament Name
                    </label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2">
                      Tournament Thumbnail
                    </label>
                    <div className="flex items-start gap-4">
                      {/* Preview */}
                      <div className="shrink-0">
                        {(thumbnailPreview || tournament?.image) && (
                          <Image
                            src={thumbnailPreview || tournament?.image || ""}
                            alt="Tournament thumbnail"
                            width={480}
                            height={280}
                            unoptimized
                            className="w-48 h-28 rounded-lg border border-gray-700 object-cover"
                          />
                        )}
                      </div>

                      {/* Upload Button */}
                      <div className="flex-1 flex flex-col justify-center">
                        <label className="cursor-pointer">
                          <div className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors inline-flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            {editData.thumbnailFile
                              ? "Change Thumbnail"
                              : "Edit Thumbnail"}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailChange}
                            className="hidden"
                          />
                        </label>
                        {editData.thumbnailFile && (
                          <p className="mt-1.5 text-xs text-gray-500">
                            {editData.thumbnailFile.name}
                          </p>
                        )}
                        <p className="mt-1.5 text-xs text-gray-600">
                          JPG, PNG or GIF (Recommended: 800x400px)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#131720] border border-gray-800 rounded-xl p-6">
                <h2 className="text-sm font-medium text-gray-400 mb-4">
                  Participating Teams
                </h2>
                <div className="space-y-2">
                  {selectedTeams?.map((tt) => {
                    const team = teamList.find((t) => t.id === tt);

                    if (!team) return null;

                    return (
                      <div
                        key={tt}
                        className="flex items-center justify-between bg-[#0a0e1a] border border-gray-800 rounded-lg px-3 py-2"
                      >
                        <span className="text-sm text-gray-300">
                          {team.name}
                        </span>

                        <button
                          onClick={() => handleRemoveTeam(tt)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}

                  {selectTeamState && (
                    <div>
                      <select
                        onChange={(e) => handleAddTeam(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300"
                      >
                        <option value="">Select a team</option>

                        {teamList
                          .filter((team) => !selectedTeams.includes(team.id))
                          .map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  {!selectTeamState && (
                    <button
                      className="w-full py-2.5 border-2 border-dashed border-gray-800 rounded-lg text-sm text-gray-400 hover:border-gray-700 hover:text-gray-300 transition-colors"
                      onClick={() => setSelectTeamState(true)}
                    >
                      + Add Team
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors
                 flex items-center gap-2"
                  onClick={handleSave}
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Live Data Tab */}
          {activeTab === "liveData" && (
            <div className="space-y-6">
              <div className="bg-[#131720] border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-gray-400">
                    Select Match
                  </h2>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {Array.isArray(allMatchData) &&
                        allMatchData.length > 0 && (
                          <button
                            onClick={() =>
                              setShowMatchDropdown(!showMatchDropdown)
                            }
                            className="flex items-center gap-3 px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:border-gray-700 transition-colors min-w-[280px]"
                          >
                            <div className="flex-1 flex items-center justify-between">
                              <span>{selectedMatch?.name}</span>
                              {getMatchStatusBadge(
                                selectedMatch?.status || "Live",
                              )}
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          </button>
                        )}

                      {showMatchDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-full bg-[#131720] border border-gray-800 rounded-lg shadow-xl z-10 max-h-80 overflow-y-auto">
                          {allMatchData?.length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500">
                              No matches found
                            </div>
                          )}

                          {allMatchData?.map((match) => (
                            <button
                              key={match.id}
                              onClick={() => {
                                setSelectedMatch(match);
                                setShowMatchDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-800/50 transition-colors border-b border-gray-800 last:border-0 ${
                                selectedMatch?.id === match.id
                                  ? "bg-gray-800/30"
                                  : ""
                              }`}
                            >
                              <span className="text-gray-300">
                                {match.name}
                              </span>

                              {getMatchStatusBadge(match.status)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Title Input */}
                    <input
                      type="text"
                      value={newmatchTitle}
                      onChange={(e) => setNewMatchTitle(e.target.value)}
                      placeholder="Match title..."
                      className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-gray-700 w-48"
                    />

                    {/* Create Button */}
                    <button
                      onClick={handleCreateMatch}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium
                     transition-colors flex items-center gap-2"
                    >
                      Create Match
                    </button>
                  </div>
                </div>
              </div>

              {Array.isArray(allMatchData) && allMatchData.length > 0 && (
                <div className="bg-[#131720] border border-gray-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-medium text-gray-400">
                      {selectedMatch?.name} - Live Data Entry
                    </h2>
                    <div>
                      <label className="text-sm font-medium text-gray-400">
                        Match API
                      </label>
                      <div className="text-xs rounded-md p-2 bg-[#0a0e1a] flex gap-2 items-center">
                        <p>
                          http://localhost:3000/api/match/{selectedMatch?.id}
                        </p>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `${window.location.origin}/api/match/${selectedMatch?.id}`,
                              1,
                            )
                          }
                          className="ml-4 px-4 py-2 bg-[#131720] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                        >
                          {copiedId === 1 ? (
                            <>
                              <Check className="w-4 h-4 text-green-400" />
                              <span className="text-green-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <select
                      value={selectedMatch?.winTeam?.id || winningTeamId || ""}
                      disabled={selectedMatch?.status === "Completed"}
                      onChange={(e) => setWinningTeamId(e.target.value)}
                      className="px-3 py-2 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-gray-700"
                    >
                      <option value="">Select Winner</option>

                      {tournament?.teamTournaments?.map((tt) => (
                        <option key={tt.team.id} value={tt.team.id}>
                          {tt.team.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium
                     transition-colors flex items-center gap-2"
                      onClick={handleSaveScores}
                      disabled={selectedMatch?.status === "Completed"}
                    >
                      <Save className="w-4 h-4" />
                      Submit Data
                    </button>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                          Player Name
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                          Status
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                          Placement Points
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                          Finishes Points
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                          Total Points
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {groupedByTeam &&
                        Object.entries(groupedByTeam).map(
                          ([teamName, performances]) => (
                            <React.Fragment key={teamName}>
                              <tr className="bg-[#0f1320]">
                                <td
                                  colSpan={5}
                                  className="px-4 py-3 text-sm font-medium text-blue-400 border-y border-gray-800"
                                >
                                  {teamName}
                                </td>
                              </tr>

                              {performances.map((performance) => {
                                const totalPoints =
                                  performance.placementPoints +
                                  performance.finishesPoints;

                                return (
                                  <tr key={performance.id}>
                                    <td className="px-4 py-3">
                                      <span className="text-sm text-gray-300">
                                        {performance.player?.name}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3">
                                      <select
                                        value={performance.status}
                                        onChange={(e) =>
                                          handleStatusChange(
                                            performance.id,
                                            e.target.value as "Alive" | "Dead",
                                          )
                                        }
                                        disabled={
                                          selectedMatch?.status === "Completed"
                                        }
                                        className={`w-28 px-3 py-2 border border-gray-800 rounded-lg text-sm font-medium focus:outline-none focus:border-gray-700 ${
                                          performance.status === "Alive"
                                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                                            : "bg-red-500/10 text-red-400 border-red-500/20"
                                        }`}
                                      >
                                        <option value="Alive">Alive</option>
                                        <option value="Dead">Dead</option>
                                      </select>
                                    </td>

                                    <td className="px-4 py-3">
                                      <input
                                        type="number"
                                        value={performance.placementPoints}
                                        onChange={(e) =>
                                          handlePointsChange(
                                            performance.id,
                                            "placementPoints",
                                            e.target.value,
                                          )
                                        }
                                        disabled={
                                          selectedMatch?.status === "Completed"
                                        }
                                        className="w-24 px-3 py-2 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300"
                                      />
                                    </td>

                                    <td className="px-4 py-3">
                                      <input
                                        type="number"
                                        value={performance.finishesPoints}
                                        onChange={(e) =>
                                          handlePointsChange(
                                            performance.id,
                                            "finishesPoints",
                                            e.target.value,
                                          )
                                        }
                                        disabled={
                                          selectedMatch?.status === "Completed"
                                        }
                                        className="w-24 px-3 py-2 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300"
                                      />
                                    </td>

                                    <td className="px-4 py-3">
                                      <span className="text-sm font-medium text-blue-400">
                                        {totalPoints}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ),
                        )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Links Tab */}
          {activeTab === "links" && (
            <div className="bg-[#131720] border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-medium text-gray-400 mb-4">
                API Endpoints
              </h2>
              <div className="space-y-3">
                {mockLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-4 bg-[#0a0e1a] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-300 mb-1">
                        {link.name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {link.url}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(link.url, link.id)}
                      className="ml-4 px-4 py-2 bg-[#131720] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                    >
                      {copiedId === link.id ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
