"use client";
import { TeamFormData } from "@/app/teams-players/page";
import { Tournament } from "@/app/tournaments/[id]/page";
import { Save, Upload } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

interface DetailsProps {
  teamList: TeamFormData[];
  tournament: Tournament | undefined;
  setTournament: (t: Tournament) => void;
}

export default function Details({
  teamList,
  tournament,
  setTournament,
}: DetailsProps) {
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [selectTeamState, setSelectTeamState] = useState<boolean>(false);
  const [groups, setGroups] = useState<
    { name: string; teams: TeamFormData[] }[]
  >([]);
  const [groupName, setGroupName] = useState<string>("");
  const [editData, setEditData] = useState({
    name: "",
    thumbnailFile: null as File | null,
  });
  const assignedTeamIds = groups.flatMap((group) =>
    group.teams.map((team) => team.id),
  );
  const handleAddGroup = () => {
    if (!groupName.trim()) return;

    if (groups.some((g) => g.name === groupName)) {
      toast.error("Group already exists");
      return;
    }

    setGroups((prev) => [...prev, { name: groupName, teams: [] }]);

    setGroupName("");
  };

  const handleAddTeam = (groupName: string, team: TeamFormData) => {
    if (!team) return;

    setGroups((prev) =>
      prev.map((group) => {
        if (group.name !== groupName) return group;

        if (group.teams.some((t) => t.id === team.id)) {
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

  const handleRemoveTeam = (groupName: string, teamId: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.name === groupName
          ? {
              ...group,
              teams: group.teams.filter((t) => t.id !== teamId),
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
    body.append("name", editData.name || tournament?.name);
    body.append(
      "groups",
      JSON.stringify(
        groups.map((group) => ({
          name: group.name,
          teamIds: group.teams.map((t) => t.id),
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
    const updated: Tournament = await res.json();
    setTournament(updated);

    toast.success("Tournament updated");
  };

  useEffect(() => {
    if (!tournament?.teamTournaments) return;

    const grouped = tournament.teamTournaments.reduce(
      (acc, tt) => {
        const existingGroup = acc.find((g) => g.name === tt.group);

        if (existingGroup) {
          existingGroup.teams.push(tt.team);
        } else {
          acc.push({
            name: tt.group,
            teams: [tt.team],
          });
        }

        return acc;
      },
      [] as { name: string; teams: TeamFormData[] }[],
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGroups(grouped);
  }, [tournament]);

  return (
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
              value={editData.name || tournament?.name}
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
              className="flex  justify-between bg-[#0a0e1a] border border-gray-800 rounded-lg px-3 py-2 flex-col gap-2 "
            >
              <p className="text-sm text-gray-300 font-medium">{group.name}</p>

              {group.teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between bg-[#0a0e1a] border border-gray-800 rounded-lg px-3 py-2 w-full"
                >
                  <span className="text-sm text-gray-300">{team.name}</span>

                  <button
                    onClick={() => handleRemoveTeam(group.name, team.id)}
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
                      .filter((team) => !assignedTeamIds.includes(team.id))
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
    </div>
  );
}
