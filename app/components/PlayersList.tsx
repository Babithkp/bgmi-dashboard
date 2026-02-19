"use client";import Image from "next/image";
import { Edit, Eye, Filter, Plus, Search, Trash2 } from "lucide-react";
import DeleteModel from "./DeleteModel";
import { useState } from "react";
import AddPlayerModal from "./AddPlayerModal";
import { PlayerTypes, TeamTypes } from "@/lib/types";

interface PlayersListProps {
  players: PlayerTypes[];
  reFetchAll: () => void;
  Teams: TeamTypes[];
}

export default function PlayersList({
  players,
  reFetchAll,
  Teams,
}: PlayersListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [player, setPlayer] = useState<PlayerTypes | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);

  const onClose = () => setIsOpen(false);

  const handleDelete = async () => {
    setIsLoading(true);
    await fetch(`/api/players/${player?.id}`, {
      method: "DELETE",
    });
    reFetchAll();
    setIsLoading(false);
    setIsOpen(false);
  };

  return (
    <>
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-medium text-gray-300">All Players</h2>
          <button
            onClick={() => {
              setPlayer(null);
              setIsAddPlayerModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Player
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={`Search Players...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-gray-700"
            />
          </div>
          <button className="px-4 py-2 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                Player
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                IGN
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                Team
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {players?.map((player) => (
              <tr
                key={player.id}
                className="hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={player.image}
                      alt={player.name}
                      unoptimized
                      className="w-10 h-10 rounded-full border border-gray-700 object-cover"
                      width={100}
                      height={100}
                    />
                    <span className="text-sm text-gray-200">{player.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-300">
                    {player.gameName}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-400">
                    {player.team ? player.team.name : "Unassigned"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                      onClick={() => {
                        setIsAddPlayerModalOpen(true);
                        setPlayer(player);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      onClick={() => {
                        setIsOpen(true);
                        setPlayer(player);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DeleteModel
        isOpen={isOpen}
        onClose={onClose}
        deleteFunction={handleDelete}
        isLoading={isLoading}
      />
      {/* Add Player Modal */}
      <AddPlayerModal
        isOpen={isAddPlayerModalOpen}
        onClose={() => setIsAddPlayerModalOpen(false)}
        teamList={Teams}
        onSubmit={reFetchAll}
        player={player}
      />
    </>
  );
}
