import Image from "next/image";
import { X } from "lucide-react";
import { TeamTypes } from "@/lib/types";

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamList: TeamTypes | null;
}

export default function TeamModal({
  isOpen,
  onClose,
  teamList,
}: AddPlayerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-[#131720] border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-medium text-gray-100">
            {teamList?.name}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {teamList?.players.map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 ${i != 0 && "border-t pt-4 border-gray-700"}`}
            >
              <Image
                src={player.image}
                alt={player.name}
                width={100}
                height={100}
                unoptimized
                className="w-10 h-10 rounded-lg border border-gray-700 bg-gray-800 object-cover"
              />
              <span className="text-sm text-gray-200">{player.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
