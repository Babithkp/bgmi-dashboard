"use client"
import Image from "next/image";
import { TeamFormData } from "../teams-players/page";
import { Edit, Eye, Filter, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import DeleteModel from "./DeleteModel";
import AddTeamModal from "./AddTeamModal";

type TeamListProbs = {
    Teams: TeamFormData[];
    reFetchAll: () => void;
}

export default function TeamList({ Teams, reFetchAll }: TeamListProbs) {
    const [searchQuery, setSearchQuery] = useState('');
    const [team, setTeam] = useState<TeamFormData | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
    const onClose = () => setIsOpen(false);

    const handleDelete = async () => {
        setIsLoading(true);
        await fetch(`/api/team/${team?.id}`, {
            method: 'DELETE',
        });
        reFetchAll()
        setIsLoading(false);
        setIsOpen(false);
    };

    return (
        <>
            <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <h2 className="text-sm font-medium text-gray-300">
                        All Teams
                    </h2>
                    <button
                        onClick={() => {
                            setTeam(null);
                            setIsAddTeamModalOpen(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Team
                    </button>
                </div>

                {/* Search and Filter */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder={`Search Teams...`}
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
                                Team Name
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                                Total Players
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                                Added Since
                            </th>
                            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {Teams?.map((team) => (
                            <tr key={team.id} className="hover:bg-gray-800/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <Image
                                            src={team.image}
                                            alt={team.name}
                                            width={100}
                                            height={100}
                                            unoptimized
                                            className="w-10 h-10 rounded-lg border border-gray-700 bg-gray-800"
                                        />
                                        <span className="text-sm text-gray-200">{team.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-gray-300">{team.players.length}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-gray-400">{new Date(team.createdAt).toLocaleDateString()}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                            onClick={() => {
                                                setIsAddTeamModalOpen(true)
                                                setTeam(team)
                                            }}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            onClick={() => {
                                                setIsOpen(true)
                                                setTeam(team)
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
            <DeleteModel isOpen={isOpen} onClose={onClose} deleteTeam={handleDelete} isLoading={isLoading} />
            {/* Add Team Modal */}
            <AddTeamModal
                isOpen={isAddTeamModalOpen}
                onClose={() => setIsAddTeamModalOpen(false)}
                onSubmit={reFetchAll}
                team={team}
            />
        </>
    )
}
