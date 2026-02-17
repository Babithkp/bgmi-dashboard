"use client";
import { Match, Tournament } from "@/app/tournaments/[id]/page";
import { Check, ChevronDown, Copy, Save, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import DeleteModel from "../DeleteModel";

interface LiveDataProps {
  allMatchData: Match[] | undefined;
  setSelectedMatch: React.Dispatch<React.SetStateAction<Match | null>>;
  selectedMatch: Match | null;
  refetchAll: () => void;
  tournament: Tournament | undefined;
}

export default function LiveData({
  allMatchData,
  setSelectedMatch,
  selectedMatch,
  refetchAll,
  tournament,
}: LiveDataProps) {
  const [showMatchDropdown, setShowMatchDropdown] = useState(false);
  const [newmatchTitle, setNewMatchTitle] = useState<string>("");
  const [winningTeamId, setWinningTeamId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);



  const copyToClipboard = (url: string, id: number) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteMatch = async () => {
    setIsLoading(true);
    await fetch(`/api/match/${selectedMatch?.id}`, {
      method: "DELETE",
    });
    refetchAll();
    setIsLoading(false);
    setIsDeleteModalOpen(false);
  };

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
    setSelectedMatch((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        playerPerformances: prev.playerPerformances.map((p) => {
          if (p.id !== performanceId) return p;
          const numericValue = Number(value);
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
          group: selectedGroup,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to create match");
        return;
      }
      setSelectedGroup("");
      setNewMatchTitle("");
      toast.success("Match created");
      refetchAll();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
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
      refetchAll();
      toast.success("Scores updated ✅");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

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
  return (
    <div className="space-y-6">
      <div className="bg-[#131720] border border-gray-800 rounded-xl p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={newmatchTitle}
              onChange={(e) => setNewMatchTitle(e.target.value)}
              placeholder="Match title..."
              className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 
              rounded-lg text-sm text-gray-300 focus:outline-none focus:border-gray-700 w-full"
            />
            <select
              className="px-3 py-2 bg-[#0a0e1a] border border-gray-800 rounded-lg w-full text-sm text-gray-300 focus:outline-none focus:border-gray-700"
              onChange={(e) => setSelectedGroup(e.target.value)}
              value={selectedGroup}
            >
              <option value="">Select Group</option>
              {tournament?.teamTournaments.map((t, i) => (
                <option value={t.group} key={i}>
                  {t.group}
                </option>
              ))}
            </select>

            {/* Create Button */}
            <button
              onClick={handleCreateMatch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium 
               transition-colors w-full"
            >
              Create Match
            </button>
          </div>

          <div className="flex items-center gap-3 justify-between">
            <h2 className="text-sm font-medium text-gray-400">Select Match</h2>
            <div className="relative">
              {Array.isArray(allMatchData) && allMatchData.length > 0 && (
                <button
                  onClick={() => setShowMatchDropdown(!showMatchDropdown)}
                  className="flex items-center gap-3 px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:border-gray-700 transition-colors min-w-[280px]"
                >
                  <div className="flex-1 flex items-center justify-between">
                    <span>{selectedMatch?.name}</span>
                    {getMatchStatusBadge(selectedMatch?.status || "Live")}
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
                        selectedMatch?.id === match.id ? "bg-gray-800/30" : ""
                      }`}
                    >
                      <span className="text-gray-300">{match.name}</span>

                      {getMatchStatusBadge(match.status)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {Array.isArray(allMatchData) && allMatchData.length > 0 && (
        <div className="bg-[#131720] border border-gray-800 rounded-xl p-6">
          <div className=" mb-4 flex flex-col gap-4">
            <div className="flex gap-4 items-center w-full justify-between">
              <div className="">
                <p className="text-sm font-medium text-gray-400">
                  Group: {selectedMatch?.group}
                </p>
                <p className="text-sm font-medium text-gray-400">
                  {selectedMatch?.name} - Live Data Entry
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 justify-between">
                  <p className="text-sm font-medium text-gray-400 w-full">
                    Match Points Table
                  </p>
                  <div className="text-xs rounded-md p-1 px-2 bg-[#0a0e1a] flex gap-2 items-center justify-between w-full">
                    <p>
                      {window.location.origin}/api/match/{selectedMatch?.id}
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
                <div className="flex items-center gap-4 justify-between">
                  <p className="text-sm font-medium text-gray-400 w-full">
                    MVP of that match
                  </p>
                  <div className="text-xs rounded-md p-1 px-2 bg-[#0a0e1a] flex gap-2 items-center justify-between w-full">
                    <p>
                      {window.location.origin}/api/match/{selectedMatch?.id}/mvp
                    </p>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}/api/match/${selectedMatch?.id}/mvp`,
                          2,
                        )
                      }
                      className="ml-4 px-4 py-2 bg-[#131720] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                    >
                      {copiedId === 2 ? (
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
                <div className="flex items-center gap-4 justify-between">
                  <p className="text-sm font-medium text-gray-400 w-full">
                  Top 5 MVP (different players)
                  </p>
                  <div className="text-xs rounded-md p-1 px-2 bg-[#0a0e1a] flex gap-2 items-center justify-between w-full">
                    <p>
                      {window.location.origin}/api/match/{selectedMatch?.id}/topfivemvp
                    </p>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}/api/match/${selectedMatch?.id}/topfivemvp`,
                          3,
                        )
                      }
                      className="ml-4 px-4 py-2 bg-[#131720] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                    >
                      {copiedId === 3 ? (
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
                <div className="flex items-center gap-4 justify-between">
                  <p className="text-sm font-medium text-gray-400 w-full">
                    WWCD Stats
                  </p>
                  <div className="text-xs rounded-md p-1 px-2 bg-[#0a0e1a] flex gap-2 items-center justify-between w-full">
                    <p>
                      {window.location.origin}/api/match/{selectedMatch?.id}/winner
                    </p>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}/api/match/${selectedMatch?.id}/winner`,
                          4,
                        )
                      }
                      className="ml-4 px-4 py-2 bg-[#131720] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
                    >
                      {copiedId === 4 ? (
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
              </div>
            </div>
            <div className="w-full flex items-center gap-4 justify-end">
              <select
                value={selectedMatch?.winTeam?.id || winningTeamId || ""}
                disabled={selectedMatch?.status === "Completed"}
                onChange={(e) => setWinningTeamId(e.target.value)}
                className="px-3 py-2 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm  text-gray-300 focus:outline-none focus:border-gray-700"
              >
                <option value="">Select Winner</option>

                {tournament?.teamTournaments
                  ?.filter((team) => team.group === selectedMatch?.group)
                  .map((tt) => (
                    <option key={tt.team.id} value={tt.team.id}>
                      {tt.team.name}
                    </option>
                  ))}
              </select>
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium
              transition-colors flex items-center gap-2"
                onClick={handleSaveScores}
                // disabled={selectedMatch?.status === "Completed"}
              >
                <Save className="w-4 h-4" />
                Submit Data
              </button>
              <button
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={selectedMatch?.status === "Completed"}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
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
                                disabled={selectedMatch?.status === "Completed"}
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
                                disabled={selectedMatch?.status === "Completed"}
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
                                disabled={selectedMatch?.status === "Completed"}
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
      <DeleteModel
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        deleteFunction={handleDeleteMatch}
        isLoading={isLoading}
      />
    </div>
  );
}
