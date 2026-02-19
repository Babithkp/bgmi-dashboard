"use client";
import { Save, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import DeleteModel from "../DeleteModel";
import { useRouter } from "next/navigation";
import { TeamTypes, TournamentTypes } from "@/lib/types";

type Team = {
  name: string | undefined;
};

type GroupState = {
  name: string;
  teams: Team[];
};
interface DetailsProps {
  teamList: TeamTypes[];
  tournament: TournamentTypes | undefined;
  setTournament: (t: TournamentTypes) => void;
}

export default function Details({
  teamList,
  tournament,
  setTournament,
}: DetailsProps) {
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [selectTeamState, setSelectTeamState] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<GroupState[]>([]);
  const [groupName, setGroupName] = useState<string>("");
  const [editData, setEditData] = useState({
    name: "",
    thumbnailFile: null as File | null,
  });
  const router = useRouter();

  const handleDeleteMatch = async () => {
    setIsLoading(true);
    await fetch(`/api/tournament/${tournament?.id}`, {
      method: "DELETE",
    });
    router.replace("/tournaments");
    setIsLoading(false);
    setIsDeleteModalOpen(false);
  };

  const handleAddGroup = () => {
    if (!groupName.trim()) return;

    if (groups.some((g) => g.name === groupName)) {
      toast.error("Group already exists");
      return;
    }

    setGroups((prev) => [...prev, { name: groupName, teams: [] }]);

    setGroupName("");
  };

  const handleAddTeam = (groupName: string, team: TeamTypes) => {
    if (!team) return;

    setGroups((prev) =>
      prev.map((group) => {
        if (group.name !== groupName) return group;

        if (group.teams.some((t) => t.name === team.name)) {
          toast.error("Team already in group");
          return group;
        }

        return {
          ...group,
          teams: [...group.teams, team],
        };
      }),
    );

    setSelectTeamState(false);
  };

  const handleRemoveTeam = (groupName: string, teamName: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.name === groupName
          ? {
              ...group,
              teams: group.teams.filter((t) => t.name !== teamName),
            }
          : group,
      ),
    );
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
    body.append("name", editData.name ?? tournament.name);
    body.append(
      "groups",
      JSON.stringify(
        groups.map((group) => ({
          name: group.name,
          teamNames: group.teams.map((t) => t.name),
        })),
      ),
    );

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
    const updated: TournamentTypes = await res.json();
    setTournament(updated);

    toast.success("Tournament updated");
  };

  const assignedTeamNames = groups.flatMap((group) =>
    group.teams.map((team) => team.name),
  );

  useEffect(() => {
    if (!tournament?.groups) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGroups((prev) => {
      if (prev.length > 0) return prev;

      return tournament.groups.map((group) => ({
        name: group.name,

        teams:
          group.groupTeamTournament?.map((groupTeam) => ({
            name: groupTeam.team?.name,
          })) ?? [],
      }));
    });
    console.log(tournament);
  }, [tournament]);

  return (
    <div className="space-y-6">
      <div className="bg-[#131720] border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-4 justify-between">
          <h2 className="text-sm font-medium text-gray-400 mb-4">
            Tournament Information
          </h2>
          <button
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Tournament Name
            </label>
            {(editData.name || tournament?.name) && (
              <input
                type="text"
                value={editData.name || tournament?.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-gray-700"
              />
            )}
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

      <div className="bg-[#131720] border border-gray-800 rounded-xl p-6 flex flex-col gap-2">
        <div className="flex justify-between ">
          <h2 className="text-sm font-medium text-gray-400 mb-4">
            Tournament Groups
          </h2>
          <div className=" flex items-center gap-2 justify-center ">
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 
              focus:outline-none focus:border-gray-700"
            />
            <button
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium w-full "
              onClick={handleAddGroup}
            >
              Add Group
            </button>
          </div>
        </div>
        <div className="space-y-2 grid-cols-2 grid gap-2">
          {groups.map((group, i) => (
            <div
              key={i}
              className="flex  justify-start bg-[#0a0e1a] border border-gray-800 rounded-lg px-3 py-2 flex-col gap-2 "
            >
              <p className="text-sm text-gray-300 font-medium">{group.name}</p>

              {group.teams.map((team) => (
                <div
                  key={team.name}
                  className="flex items-center justify-between bg-[#0a0e1a] border border-gray-800 rounded-lg px-3 py-2 w-full"
                >
                  <span className="text-sm text-gray-300">{team.name}</span>

                  <button
                    onClick={() =>
                      handleRemoveTeam(group.name, team.name || "")
                    }
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {selectTeamState && teamList.length > 0 && (
                <div>
                  <select
                    onChange={(e) => {
                      const team = teamList.find(
                        (t) => t.id === e.target.value,
                      );

                      if (team) handleAddTeam(group.name, team);
                    }}
                    className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 "
                  >
                    <option value="">Select a team</option>

                    {teamList
                      .filter((team) => !assignedTeamNames.includes(team.name))
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
          ))}
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
      <DeleteModel
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        deleteFunction={handleDeleteMatch}
        isLoading={isLoading}
      />
    </div>
  );
}
