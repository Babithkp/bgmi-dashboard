import { X, Upload } from "lucide-react";import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TeamTypes } from "@/lib/types";
import DeleteModel from "./DeleteModel";

interface AddTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  initialTeam: TeamTypes | null;
}

type EditablePlayer = {
  id: string;
  name: string;
  gameName: string;
  image: string;
  order: number;
};

const MAX_PLAYERS = 6;
export default function AddTeamModal({
  isOpen,
  onClose,
  onSubmit,
  initialTeam,
}: AddTeamModalProps) {
  const [teamName, setTeamName] = useState("");
  const [teamLogo, setTeamLogo] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [players, setPlayers] = useState<EditablePlayer[]>([]);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    id: "",
    name: "",
    gameName: "",
    file: null as File | null,
  });
  const [previewPlayerImage, setPreviewPlayerImage] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));  

  useEffect(() => {
    if (!initialTeam) {
      setTeamName("");
      setTeamLogo("");
      setPlayers([]);
      return;
    }

    setTeamName(initialTeam.name);
    setTeamLogo(initialTeam.image);
    setPlayers(
      (initialTeam.players ?? [])
        .sort((a, b) => a.order - b.order)
        .map((p, i) => ({
          id: p.id,
          name: p.name ?? "",
          gameName: p.gameName ?? "",
          image: p.image ?? "",
          order: i,
        })),
    );
  }, [initialTeam]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = players.findIndex((p) => p.id === active.id);
    const newIndex = players.findIndex((p) => p.id === over.id);

    const reordered = arrayMove(players, oldIndex, newIndex);

    setPlayers(
      reordered.map((p, i) => ({
        ...p,
        order: i,
      })),
    );
  };
  const updatePlayer = (id: string, field: string, value: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };
  const handlePlayerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewPlayer((prev) => ({ ...prev, file }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewPlayerImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddPlayer = async () => {
    if (
      !newPlayer.name.trim() ||
      !newPlayer.gameName.trim() ||
      !previewPlayerImage
    ) {
      toast.error("Fill all player fields");
      return;
    }

    if (players.length >= MAX_PLAYERS) {
      toast.error("Maximum 6 players allowed");
      return;
    }
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", newPlayer.name);
      formData.append("gameName", newPlayer.gameName);

      if (newPlayer.file) {
        formData.append("image", newPlayer.file);
      }

      const res = await fetch("/api/players", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to create player");
      }

      const savedPlayer = await res.json();

      setPlayers((prev) => [
        ...prev,
        {
          ...savedPlayer,
          order: prev.length,
        },
      ]);

      toast.success("Player added");

      setNewPlayer({ id: "", name: "", gameName: "", file: null });
      setPreviewPlayerImage("");
      setIsPlayerModalOpen(false);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    console.log(deleteId);

    try {
      const res = await fetch(`/api/players/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete player");
        setIsLoading(false);
        return;
      }
      setPlayers((prev) => prev.filter((p) => p.id !== deleteId));
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
    onSubmit();
    setIsDeleteModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      toast.error("Team name is required");
      return;
    }

    const hasEmptyPlayer = players.some(
      (p) => !(p.name ?? "").trim() || !(p.gameName ?? "").trim(),
    );

    if (hasEmptyPlayer) {
      toast.error("All player details must be filled");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();

      formData.append("name", teamName);

      if (logoFile) {
        formData.append("logo", logoFile);
      } else if (teamLogo) {
        formData.append("editLogo", teamLogo);
      }
      if (initialTeam?.id) {
        formData.append("teamId", initialTeam.id);
      }

      formData.append(
        "players",
        JSON.stringify(
          players.map((p, i) => ({
            id: p.id,
            order: i,
          })),
        ),
      );

      const res = await fetch("/api/team", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to save team");
      }

      toast.success("Team saved");
      setLogoFile(null);
      setTeamLogo("");
      setTeamName("");
      setPlayers([]);
      onSubmit();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setTeamLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#131720] border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-medium text-gray-100">Team Editor</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Team Name */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Team Name <span className="text-red-400">*</span>
            </label>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
              className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300"
            />
          </div>

          {/* Logo */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Team Logo
            </label>

            <div className="flex items-start gap-4">
              <div className="shrink-0">
                {teamLogo ? (
                  <Image
                    src={teamLogo}
                    alt="Preview"
                    width={80}
                    height={80}
                    unoptimized
                    className="w-20 h-20 rounded-lg border border-gray-700 object-cover bg-gray-800"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg border border-gray-800 bg-[#0a0e1a] flex items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-600" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <label className="cursor-pointer">
                  <div className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                  </div>
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Players */}
          <div>
            <div className="flex justify-between mb-3">
              <label className="text-xs text-gray-500">
                Players (Drag to reorder)
              </label>

              <button
                type="button"
                onClick={() => setIsPlayerModalOpen(true)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                + Add Player
              </button>
            </div>
            {isPlayerModalOpen && (
              <div className="fixed inset-0 z-60 flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setIsPlayerModalOpen(false)}
                />

                <div className="relative bg-[#131720] border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
                  <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <h2 className="text-lg font-medium text-gray-100">
                      Add Player
                    </h2>
                    <button
                      onClick={() => setIsPlayerModalOpen(false)}
                      className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-800/50 flex items-center justify-center"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Player Name */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">
                        Player Name
                      </label>
                      <input
                        value={newPlayer.name}
                        onChange={(e) =>
                          setNewPlayer({ ...newPlayer, name: e.target.value })
                        }
                        placeholder="Enter name"
                        className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300"
                      />
                    </div>

                    {/* IGN */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">
                        IGN
                      </label>
                      <input
                        value={newPlayer.gameName}
                        onChange={(e) =>
                          setNewPlayer({
                            ...newPlayer,
                            gameName: e.target.value,
                          })
                        }
                        placeholder="Enter IGN"
                        className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300"
                      />
                    </div>

                    {/* Photo */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">
                        Player Photo
                      </label>

                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          {previewPlayerImage ? (
                            <Image
                              src={previewPlayerImage}
                              alt="Preview"
                              width={80}
                              height={80}
                              unoptimized
                              className="w-20 h-20 rounded-full border border-gray-700 object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full border border-gray-800 bg-[#0a0e1a] flex items-center justify-center">
                              <Upload className="w-6 h-6 text-gray-600" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <label className="cursor-pointer">
                            <div className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 inline-flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              Upload Photo
                            </div>
                            <input
                              type="file"
                              hidden
                              accept="image/*"
                              onChange={handlePlayerImageChange}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={() => setIsPlayerModalOpen(false)}
                        className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddPlayer}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                        disabled={isLoading}
                      >
                        {isLoading ? "Adding..." : "Add Player"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={players.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {players.map((player, index) => (
                    <SortablePlayerRow
                      key={player.id}
                      player={player}
                      index={index}
                      updatePlayer={updatePlayer}
                      setIsDeleteModalOpen={setIsDeleteModalOpen}
                      setDeleteId={setDeleteId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              {isLoading ? "Saving..." : "Save Team"}
            </button>
          </div>
        </div>
      </div>
      <DeleteModel
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        deleteFunction={handleDelete}
        isLoading={isLoading}
      />
    </div>
  );
}

function SortablePlayerRow({
  player,
  index,
  updatePlayer,
  setIsDeleteModalOpen,
  setDeleteId,
}: {
  player: EditablePlayer;
  index: number;
  updatePlayer: (id: string, field: string, value: string) => void;
  setIsDeleteModalOpen: (isOpen: boolean) => void;
  setDeleteId: (id: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const active = index < 4;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center gap-3 px-3 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg"
    >
      <div {...listeners} className="cursor-grab text-gray-500 px-2">
        ☰
      </div>
      <span className="text-xs text-gray-500 w-6">#{index + 1}</span>

      <input
        value={player.name}
        onChange={(e) => updatePlayer(player.id, "name", e.target.value)}
        placeholder="Player Name"
        className="flex-1 bg-transparent text-sm text-gray-300"
        disabled
      />

      <input
        value={player.gameName}
        onChange={(e) => updatePlayer(player.id, "gameName", e.target.value)}
        placeholder="IGN"
        className="flex-1 bg-transparent text-sm text-gray-300"
        disabled
      />

      <span
        className={`text-xs px-2 py-1 rounded ${
          active
            ? "bg-green-600/20 text-green-400"
            : "bg-gray-800 text-gray-500"
        }`}
      >
        {active ? "Active" : "Bench"}
      </span>
      <div>
        <button
          className="p-2 text-red-400 hover:text-white hover:bg-blue-500/10 rounded-lg transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteId(player.id);
            setIsDeleteModalOpen(true);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
