import { MatchTypes, PlayerTypes, TeamTypes } from "@/lib/types";
import { Check, Copy } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type ComparedPlayer = {
  id: string;
  name: string;
  image: string;
  teamName: string;
  totalFinishes: number;
  totalPlacementPoints: number;
  totalPoints: number;
  matchesPlayed: number;
  wins: number;
  playerContribution: number;
  avgContribution: number;
  fdRatio: number;
  rank: number;
};
export type ComparedTeam = {
  id: string;
  name: string;
  image: string;
  totalFinishes: number;
  totalPlacementPoints: number;
  totalPoints: number;
  matchesPlayed: number;
  wins: number;
  players: {
    id: string;
    name: string;
    image: string;
  }[];
};

export default function Links({
  tournamentId,
  allMatchData,
}: {
  tournamentId: string | undefined;
  allMatchData: MatchTypes[] | undefined;
}) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [player1, setPlayer1] = useState<ComparedPlayer | null>(null);
  const [player2, setPlayer2] = useState<ComparedPlayer | null>(null);
  const [player1Id, setPlayer1Id] = useState<string>("");
  const [player2Id, setPlayer2Id] = useState<string>("");
  const [matchId, setMatchId] = useState<string>("");
  const [team1, setTeam1] = useState<ComparedTeam | null>(null);
  const [team2, setTeam2] = useState<ComparedTeam | null>(null);
  const [team1Id, setTeam1Id] = useState<string>("");
  const [team2Id, setTeam2Id] = useState<string>("");
  const [players, setPlayers] = useState<PlayerTypes[]>([]);
  const [teams, setTeams] = useState<TeamTypes[]>([]);
  const [sortOrderByPoints, setSortOrderByPoints] = useState(true);

  const [showPlayerTable, setShowPlayerTable] = useState(false);
  const [showTeamTable, setShowTeamTable] = useState(false);

  const copyToClipboard = (url: string, id: number) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const mockLinks = [
    {
      id: 2,
      name: "Live Match API",
      url: `${window.location.origin}/api/match`,
    },
    {
      id: 3,
      name: "Elimination API",
      url: `${window.location.origin}/api/match/elimination`,
    },
    {
      id: 4,
      name: "Overall top MVP",
      url: `${window.location.origin}/api/tournament/${tournamentId}/mvp`,
    },
    {
      id: 5,
      name: "Overall top 5 MVP",
      url: `${window.location.origin}/api/tournament/${tournamentId}/topfivemvp`,
    },
    {
      id: 6,
      name: "Overall points table",
      url: `${window.location.origin}/api/tournament/${tournamentId}/overall`,
    },
    {
      id: 7,
      name: "Players Head On",
      url: `${window.location.origin}/api/tournament/playersheadon`,
    },
    {
      id: 8,
      name: "Teams Head On",
      url: `${window.location.origin}/api/tournament/teamsheadon`,
    },
  ];

  const onPlayerCompareHandler = async () => {
    if (player1Id === "" || player2Id == "") {
      toast.error("Please select both players");
      return;
    }
    setIsLoading(true);
    setPlayer1(null);
    setPlayer2(null);
    setShowPlayerTable(false);
    try {
      const res = await fetch(`/api/tournament/playersheadon`, {
        method: "POST",
        body: JSON.stringify({
          tournamentId: tournamentId,
          matchId: matchId,
          player1Id: player1Id,
          player2Id: player2Id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlayer1(data.comparison.player1);
        setPlayer2(data.comparison.player2);
        setShowPlayerTable(true);
        setPlayer1Id("");
        setPlayer2Id("");
        setMatchId("");
        toast.success("Players compared");
      }
    } catch (error) {
      console.error("PLAYER COMPARE ERROR:", error);
      toast.error("Something went wrong");
    }
    setIsLoading(false);
  };

  const onTeamCompareHandler = async () => {
    if (team1Id === "" || team2Id === "") {
      toast.error("Please select both teams");
      return;
    }
    setIsLoading(true);
    setTeam1(null);
    setTeam2(null);
    setShowTeamTable(false);
    try {
      const res = await fetch(`/api/tournament/teamsheadon`, {
        method: "POST",
        body: JSON.stringify({
          tournamentId: tournamentId,
          matchId: matchId,
          team1Id: team1Id,
          team2Id: team2Id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTeam1(data.comparison.team1);
        setTeam2(data.comparison.team2);

        setShowTeamTable(true);
        setTeam1Id("");
        setTeam2Id("");
        setMatchId("");
        toast.success("Teams compared");
      }
    } catch (error) {
      console.error("TEAM COMPARE ERROR:", error);
      toast.error("Something went wrong");
    }
    setIsLoading(false);
  };

  const handleSortOrderChange = async (value: boolean) => {
    let text = "";
    if (value) {
      text = "Total Points";
      setSortOrderByPoints(true);
    } else {
      text = "Alive Count";
      setSortOrderByPoints(false);
    }

    try {
      const req = await fetch(`/api/tournament/${tournamentId}/sortOrder`, {
        method: "PATCH",
        body: JSON.stringify({
          text,
        }),
      });
      if (req.ok) {
        toast.success("Sort order updated");
      }
    } catch (error) {
      console.error("SORT ORDER ERROR:", error);
      toast.error("Something went wrong");
    }
  };

  useEffect(() => {
    if (tournamentId) {
      const fetchPlayers = async () => {
        const res = await fetch("/api/tournament/players", {
          method: "POST",
          body: JSON.stringify({
            id: tournamentId,
          }),
        });
        if (res.ok) {
          console.log(res);

          const data = await res.json();

          setPlayers(data.players);
          setTeams(data.teams);
          console.log(data);
        }
      };
      const fetchSortOrder = async () => {
        const res = await fetch(`/api/tournament/${tournamentId}/sortOrder`, {
          method: "GET",
        });
        if (res.ok) {
          const data = await res.json();
          setSortOrderByPoints(data === "Total Points");
        }
      };
      fetchSortOrder();
      fetchPlayers();
    }
  }, [tournamentId]);

  return (
    <section className="space-y-10">
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
                <p className="text-xs text-gray-500 truncate">{link.url}</p>
              </div>
              {link.id == 2 && (
                <div className="flex items-center gap-4 justify-between">
                  <p className="text-xs text-gray-500">Sort By Alive count</p>
                  <div
                    onClick={() => handleSortOrderChange(!sortOrderByPoints)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300
                    ${sortOrderByPoints ? "bg-green-500" : "bg-gray-700"}
                    `}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300
                      ${sortOrderByPoints ? "translate-x-6" : ""}
                      `}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Sort by Total Points</p>
                </div>
              )}
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
      <div className="bg-[#131720] border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-sm mb-6 text-gray-400 w-1/2">
            Players Head On
          </h2>
          <select
            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
          >
            <option>Select Match</option>
            {allMatchData &&
              allMatchData.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.name}
                </option>
              ))}
          </select>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <select
            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={player1Id}
            onChange={(e) => setPlayer1Id(e.target.value)}
          >
            <option value="">Select Player 1</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={player2Id}
            onChange={(e) => setPlayer2Id(e.target.value)}
          >
            <option value="">Select Player 2</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-lg font-medium text-white"
            disabled={isLoading}
            onClick={onPlayerCompareHandler}
          >
            {isLoading ? "Loading..." : "Compare Players"}
          </button>
        </div>
        {showPlayerTable && player1 && player2 && (
          <div className="grid md:grid-cols-3 gap-6 items-center">
            {/* Player 1 */}
            <HeadOnPlayers player={player1} />

            {/* VS */}
            <div className="text-center text-5xl font-bold text-gray-600">
              VS
            </div>

            {/* Player 2 */}
            <HeadOnPlayers player={player2} />
          </div>
        )}
        <div className="w-full">
          <h2 className="font-semibold text-sm mb-6 text-gray-400">
            Teams Head On
          </h2>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <select
              className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={team1Id}
              onChange={(e) => setTeam1Id(e.target.value)}
            >
              <option value="">Select Team 1</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={team2Id}
              onChange={(e) => setTeam2Id(e.target.value)}
            >
              <option value="">Select Team 2</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <button
              className="w-full bg-green-600 hover:bg-green-700 transition px-6 py-3 rounded-lg font-medium text-white"
              onClick={onTeamCompareHandler}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Compare Teams"}
            </button>
          </div>
          {showTeamTable && team1 && team2 && (
            <div className="grid md:grid-cols-3 gap-6 items-center">
              {/* Team 1 */}
              {team1.image ? (
                <div className="bg-gray-900 rounded-2xl p-6 shadow-xl">
                  <div className="text-center">
                    <Image
                      src={team1.image}
                      width={130}
                      height={130}
                      alt="Team 1"
                      className="mx-auto rounded-xl size-32"
                    />
                    <h3 className="text-xl font-semibold text-white mt-4 ">
                      {team1.name}
                    </h3>
                  </div>

                  {/* Team Stats */}
                  <div className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Matches Played</span>
                      <span className="text-white font-medium">
                        {team1.matchesPlayed || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Matches Won</span>
                      <span className="text-white font-medium">
                        {team1.wins || 0}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-700 pt-3">
                      <span className="text-gray-400">Placement Points</span>
                      <span className="text-white font-medium">
                        {team1.totalPlacementPoints || 0}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Finishes</span>
                      <span className="text-white font-medium">
                        {team1.totalFinishes || 0}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-gray-700 pt-3">
                      <span className="text-gray-300 font-medium">
                        Total Points
                      </span>
                      <span className="text-green-400 font-bold">
                        {team1.totalPoints || 0}
                      </span>
                    </div>
                  </div>

                  {/* Players */}
                  <div className="mt-6">
                    <p className="text-gray-400 text-sm mb-3">Players</p>

                    <div className="relative h-20">
                      {team1.players.map((p, index) => (
                        <Image
                          key={p.id}
                          src={p.image}
                          width={80}
                          height={80}
                          alt={p.name}
                          className="rounded-full object-cover absolute border-4 border-gray-900 size-20"
                          style={{
                            left: `${index * 35}px`,
                            zIndex: team1.players.length - index,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-2xl p-6 shadow-xl">
                  <p>Team Has not played any matches yet</p>
                </div>
              )}

              {/* VS */}
              <div className="text-center text-5xl font-bold text-gray-600">
                VS
              </div>

              {/* Team 2 */}
              {team2.image ? (
                <div className="bg-gray-900 rounded-2xl p-6 shadow-xl">
                  <div className="text-center">
                    <Image
                      src={team2.image}
                      width={130}
                      height={130}
                      alt="Team 2"
                      className="mx-auto rounded-xl size-40 object-cover"
                    />
                    <h3 className="text-xl font-semibold text-white mt-4 ">
                      {team2.name}
                    </h3>
                  </div>

                  <div className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Matches Played</span>
                      <span className="text-white font-medium">
                        {team2.matchesPlayed || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Matches Won</span>
                      <span className="text-white font-medium">
                        {team2.wins || 0}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-700 pt-3">
                      <span className="text-gray-400">Placement Points</span>
                      <span className="text-white font-medium">
                        {team2.totalPlacementPoints || 0}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Finishes</span>
                      <span className="text-white font-medium">
                        {team2.totalFinishes || 0}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-gray-700 pt-3">
                      <span className="text-gray-300 font-medium">
                        Total Points
                      </span>
                      <span className="text-green-400 font-bold">
                        {team2.totalPoints || 0}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-gray-400 text-sm mb-3">Players</p>

                    <div className="relative h-20">
                      {team2.players.map((p, index) => (
                        <Image
                          key={p.id}
                          src={p.image}
                          width={80}
                          height={80}
                          alt={p.name}
                          className="rounded-full object-cover absolute border-4 border-gray-900 size-20"
                          style={{
                            left: `${index * 35}px`,
                            zIndex: team2.players.length - index,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-2xl p-6 shadow-xl">
                  <p>Team Has not played any matches yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const HeadOnPlayers = ({ player }: { player: ComparedPlayer }) => {
  return (
    <>
      {player.image ? (
        <div className="bg-gray-900 rounded-2xl p-6 shadow-xl">
          <div className="text-center">
            <Image
              src={player.image}
              width={100}
              height={100}
              alt="Player 1"
              className="mx-auto rounded-full border-4 border-blue-500 size-40 "
            />
            <h3 className="text-lg font-semibold text-white mt-4">
              {player.name}
            </h3>
            <p className="text-gray-400">{player.teamName}</p>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between ">
              <span className="text-gray-400">Matches Played</span>
              <span className="text-white font-medium">
                {player.matchesPlayed || 0}
              </span>
            </div>
            <div className="flex justify-between ">
              <span className="text-gray-400">Matches Won</span>
              <span className="text-white font-medium">{player.wins || 0}</span>
            </div>
            <div className="flex justify-between ">
              <span className="text-gray-400">Team Contribution (Avg)</span>
              <span className="text-white font-medium">
                {player.avgContribution || 0}
              </span>
            </div>
            <div className="flex justify-between ">
              <span className="text-gray-400">Team Contribution</span>
              <span className="text-white font-medium">
                {player.playerContribution?.toFixed(2) || 0}
              </span>
            </div>
            <div className="flex justify-between ">
              <span className="text-gray-400">Rank</span>
              <span className="text-white font-medium">{player.rank || 0}</span>
            </div>
            <div className="flex justify-between ">
              <span className="text-gray-400">FD ratio</span>
              <span className="text-white font-medium">
                {player.fdRatio || 0}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-3">
              <span className="text-gray-400">Total Finishes</span>
              <span className="text-white font-medium">
                {player.totalFinishes || 0}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Total Placement</span>
              <span className="text-white font-medium">
                {player.totalPlacementPoints.toFixed(2) || 0}
              </span>
            </div>

            <div className="flex justify-between border-t border-gray-700 pt-3">
              <span className="text-gray-300 font-medium">Total Points</span>
              <span className="text-blue-400 font-bold">
                {(player.totalFinishes || 0) +
                  (player.totalPlacementPoints || 0)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl p-6 shadow-xl">
          <p>Player Has not played any matches yet</p>
        </div>
      )}
    </>
  );
};
