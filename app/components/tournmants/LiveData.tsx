"use client";
import { Check, ChevronDown, Copy, Save, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import DeleteModel from "../DeleteModel";
import {
  MatchPlayerPerformanceTypes,
  MatchTypes,
  TournamentTypes,
} from "@/lib/types";

interface LiveDataProps {
  allMatchData: MatchTypes[] | undefined;
  setSelectedMatch: React.Dispatch<React.SetStateAction<MatchTypes | null>>;
  selectedMatch: MatchTypes | null;
  refetchAll: () => void;
  tournament: TournamentTypes | undefined;
}
type PlayerWithTeamPoints = MatchPlayerPerformanceTypes & {
  teamPlacementPoints?: number;
};
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
  const [enableEdit, setEnableEdit] = useState(false);

  const groupedByTeam = selectedMatch?.matchTeam?.reduce(
    (acc, matchTeam) => {
      const teamName = matchTeam.name ?? "Unknown Team";
      const teamShortName = matchTeam.shortName ?? "Unknown Team";

      if (!acc[teamName]) {
        acc[teamName] = {
          teamId: matchTeam.id,
          teamShortName: teamShortName,
          placementPoints: matchTeam.placementPoints,
          players: [],
        };
      }

      acc[teamName].players.push(
        ...matchTeam.playerPerformances.map((player) => ({
          ...player,
          teamPlacementPoints: matchTeam.placementPoints,
        })),
      );

      return acc;
    },
    {} as Record<
      string,
      {
        teamId: string;
        teamShortName: string;
        placementPoints: number;
        players: PlayerWithTeamPoints[];
      }
    >,
  );

  const teamPlacements =
    selectedMatch?.matchTeam?.map((team) => ({
      teamId: team.id,
      placementPoints: team.placementPoints,
    })) ?? [];

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
        matchTeam: prev.matchTeam?.map((team) => ({
          ...team,
          playerPerformances: team.playerPerformances.map((p) =>
            p.id === performanceId ? { ...p, status: value } : p,
          ),
        })),
      };
    });
  };

  const handlePointsChange = (
    performanceId: string,
    field: "finishesPoints",
    delta: number,
  ) => {
    setSelectedMatch((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        matchTeam: prev.matchTeam?.map((team) => ({
          ...team,
          playerPerformances: team.playerPerformances.map((p) => {
            if (p.id !== performanceId) return p;

            const newFinishes = Math.max(p.finishesPoints + delta, 0);

            return {
              ...p,
              finishesPoints: newFinishes,
              totalPoints: team.placementPoints + newFinishes,
            };
          }),
        })),
      };
    });
  };

  const handleTeamPlacementChange = (teamId: string, delta: number) => {
    setSelectedMatch((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        matchTeam: prev.matchTeam?.map((team) => {
          if (team.id !== teamId) return team;

          const newPlacement = Math.max((team.placementPoints ?? 0) + delta, 0);

          return {
            ...team,
            placementPoints: newPlacement,
            totalPoints:
              newPlacement +
              team.playerPerformances.reduce(
                (sum, p) => sum + p.finishesPoints,
                0,
              ),

            playerPerformances: team.playerPerformances.map((p) => ({
              ...p,
            })),
          };
        }),
      };
    });
  };

  const handleNameChange = (performanceId: string, value: string) => {
    setSelectedMatch((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        matchTeam: prev.matchTeam?.map((team) => ({
          ...team,
          playerPerformances: team.playerPerformances.map((p) =>
            p.id === performanceId ? { ...p, name: value } : p,
          ),
        })),
      };
    });
  };

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
          groupId: selectedGroup,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to create match");
        return;
      }
      setSelectedGroup("");
      setNewMatchTitle("");
      refetchAll();
      toast.success("Match created");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  const handleSaveScores = async () => {
    if (!selectedMatch) return;
    setIsLoading(true);
    const performances =
      selectedMatch.matchTeam?.flatMap((team) =>
        team.playerPerformances.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          finishesPoints: p.finishesPoints,
        })),
      ) ?? [];

    try {
      const res = await fetch(`/api/match/${selectedMatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performances,
          teamPlacements,
          winningTeamId,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to save scores");
        return;
      }
      refetchAll();
      setEnableEdit(false);
      toast.success("Scores updated");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
    setIsLoading(false);
  };

  const getMatchStatusBadge = (status: MatchTypes["status"]) => {
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!isLoading) handleSaveScores();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSaveScores]);

  useEffect(() => {
    setWinningTeamId(null);
  }, [selectedMatch]);

  return (
    <div className="space-y-6 ">
      <div className="bg-[#131720] border-gray-800 border flex items-center gap-4 justify-between fixed top-17 right-8  p-2 rounded-2xl px-3 z-50">
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium
              transition-colors flex items-center gap-2"
          onClick={handleSaveScores}
          disabled={isLoading || selectedMatch?.status === "Completed"}
        >
          {isLoading ? "Updating..." : "Update Data"}
        </button>
        <div>
          <div>
            {(() => {
              const { totalAlive, totalTeamAlive } = Object.entries(
                groupedByTeam || {},
              ).reduce(
                (acc, [, team]) => {
                  const alivePlayers = team.players.filter(
                    (player) => player.status === "Alive",
                  );

                  if (alivePlayers.length > 0) {
                    acc.totalTeamAlive += 1;
                  }

                  acc.totalAlive += alivePlayers.length;

                  return acc;
                },
                { totalAlive: 0, totalTeamAlive: 0 },
              );

              return (
                <div>
                  <p>Total Players: {totalAlive}</p>
                  <p>Total Teams : {totalTeamAlive}</p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
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
              {tournament?.groups?.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
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
        {selectedMatch?.status === "Completed" && (
          <div className="text-xs text-green-400 mb-2">🔒 Match Completed</div>
        )}
      </div>

      {selectedMatch && (
        <div className="bg-[#131720] border border-gray-800 rounded-xl p-6">
          <div className=" mb-4 flex flex-col gap-4 relative">
            <div className="flex gap-4 items-start w-full justify-between">
              <div className="">
                <p className="text-sm font-medium text-gray-400">
                  Group: {selectedMatch?.group?.name}
                </p>
                <p className="text-sm font-medium text-gray-400">
                  {selectedMatch?.name} - Live Data Entry
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 justify-between">
                  <p className="text-sm font-medium text-gray-400 w-full">
                    Live Status
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
                {
                  <>
                    <div className="flex items-center gap-4 justify-between">
                      <p className="text-sm font-medium text-gray-400 w-full">
                        MVP of that match
                      </p>
                      <div className="text-xs rounded-md p-1 px-2 bg-[#0a0e1a] flex gap-2 items-center justify-between w-full">
                        <p>
                          {window.location.origin}/api/match/{selectedMatch?.id}
                          /mvp
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
                          {window.location.origin}/api/match/{selectedMatch?.id}
                          /topfivemvp
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
                          {window.location.origin}/api/match/{selectedMatch?.id}
                          /winner
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
                  </>
                }
              </div>
            </div>
            <div className="w-full flex items-center gap-4 justify-between ">
              <button
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium
              transition-colors flex items-center gap-2"
                onClick={handleSaveScores}
                disabled={isLoading || selectedMatch?.status === "Completed"}
              >
                {isLoading ? "Updating..." : "Update Data"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {groupedByTeam &&
              Object.entries(groupedByTeam).map(([teamName, teamData]) => {
                const totalFinishes = teamData.players.reduce(
                  (sum, p) => sum + p.finishesPoints,
                  0,
                );

                const totalPoints = totalFinishes + teamData.placementPoints;
                return (
                  <div
                    key={teamData.teamId}
                    className="border border-gray-800 rounded-xl p-4 bg-[#0f1320] "
                  >
                    <div className="flex justify-between border-b border-gray-800 pb-4">
                      <h2 className="text-sm font-medium text-blue-400">
                        {teamName}
                      </h2>
                      <h2 className="text-sm font-medium text-blue-400">
                        {teamData.teamShortName}
                      </h2>
                      <p className="text-sm">TF: {totalFinishes}</p>
                      <p className="text-sm text-blue-400 font-medium">
                        Total Points: {totalPoints}
                      </p>
                    </div>

                    <div className="flex justify-between py-4">
                      <p className="text-sm  text-gray-400">Placement Points</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleTeamPlacementChange(teamData.teamId, -1)
                          }
                          className="px-2 py-1 bg-red-500/10 text-red-400 rounded"
                        >
                          −
                        </button>
                        <span className="text-sm text-gray-300 w-6 text-center">
                          {teamData.placementPoints}
                        </span>
                        <button
                          onClick={() =>
                            handleTeamPlacementChange(teamData.teamId, 1)
                          }
                          className="px-2 py-1 bg-green-500/10 text-green-400 rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      {teamData.players.map((performance) => {
                        return (
                          <div
                            key={performance.id}
                            className={`bg-[#0a0e1a] p-3 rounded-lg border border-gray-800 flex gap-4 flex-col ${performance.status == "Dead" ? "opacity-50" : "opacity-100"}`}
                          >
                            <div className="relative flex justify-between items-center ">
                              <div>
                                <input
                                  type="text"
                                  value={performance.name}
                                  onChange={(e) =>
                                    handleNameChange(
                                      performance.id,
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full px-3 py-2 bg-[#131720] border border-gray-700 rounded text-sm text-gray-300
                                ${
                                  enableEdit
                                    ? "opacity-100"
                                    : "opacity-0 pointer-events-none absolute"
                                }
                                    `}
                                />
                                <p
                                  className={`text-sm text-gray-300
                                ${
                                  enableEdit
                                    ? "opacity-0 pointer-events-none absolute"
                                    : "opacity-100"
                                }
                                `}
                                >
                                  {performance.name}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  handleStatusChange(
                                    performance.id,
                                    performance.status === "Alive"
                                      ? "Dead"
                                      : "Alive",
                                  )
                                }
                                className={`relative w-14 h-7 flex items-center rounded-full transition-colors duration-300
                                ${performance.status === "Alive" ? "bg-green-500/20" : "bg-red-500/20"}`}
                              >
                                <div
                                  className={`absolute left-1 w-5 h-5 rounded-full bg-white transition-transform duration-300
                                  ${performance.status === "Alive" ? "translate-x-7" : "translate-x-0"}`}
                                />
                                <span className="sr-only">Toggle Status</span>
                              </button>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    handlePointsChange(
                                      performance.id,
                                      "finishesPoints",
                                      -1,
                                    )
                                  }
                                  className="px-2 py-1 bg-red-500/10 text-red-400 rounded"
                                >
                                  −
                                </button>

                                <span className="text-sm text-gray-300 w-6 text-center">
                                  {performance.finishesPoints}
                                </span>

                                <button
                                  onClick={() =>
                                    handlePointsChange(
                                      performance.id,
                                      "finishesPoints",
                                      1,
                                    )
                                  }
                                  className="px-2 py-1 bg-green-500/10 text-green-400 rounded"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="w-full flex items-center gap-4 justify-end mt-2">
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium transition-colors ${
                  enableEdit ? "text-green-400" : "text-gray-400"
                }`}
              >
                {enableEdit ? "Edit Enabled" : "Edit Disabled"}
              </span>

              <div
                onClick={() => setEnableEdit((prev) => !prev)}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300
                ${enableEdit ? "bg-green-500" : "bg-gray-700"}
              `}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300
                  ${enableEdit ? "translate-x-6" : ""}
                `}
                />
              </div>
            </div>
            <select
              value={winningTeamId || selectedMatch?.winTeam?.id || ""}
              onChange={(e) => setWinningTeamId(e.target.value)}
              className="px-3 py-2 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm  text-gray-300 focus:outline-none focus:border-gray-700"
            >
              <option value="">Select Winner</option>
              {selectedMatch?.matchTeam?.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium
              transition-colors flex items-center gap-2"
              onClick={handleSaveScores}
              disabled={isLoading}
            >
              {isLoading ? (
                "Submiting..."
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Submit Data
                </>
              )}
            </button>
          </div>
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
