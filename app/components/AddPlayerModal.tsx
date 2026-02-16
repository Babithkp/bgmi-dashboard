import { createPlayerAction } from '@/lib/action';
import { X, Upload } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { PlayerFormData, TeamFormData } from '../teams-players/page';
import { toast } from 'sonner';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamList: TeamFormData[];
  onSubmit: () => void;
  player: PlayerFormData | null;
}



export default function AddPlayerModal({ isOpen, onClose, teamList, onSubmit, player }: AddPlayerModalProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [playerData, setPlayerData] = useState({
    id: '',
    name: '',
    gameName: '',
    team: "",
    image: '',
  });





  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (player === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlayerData({
        id: '',
        name: '',
        image: '',
        gameName: '',
        team: '',
      });
      setPreviewUrl('');
      return;
    }

    const nextName = player.name;
    const nextImage = player.image;
    const nextGameName = player.gameName;
    const nextTeamId = player.team?.id ?? '';

    setPlayerData(prev =>
      prev.name === nextName &&
        prev.image === nextImage &&
        prev.gameName === nextGameName &&
        prev.team === nextTeamId
        ? prev
        : {
          ...prev,
          name: nextName,
          image: nextImage,
          gameName: nextGameName,
          team: nextTeamId,
        }
    );

    setPreviewUrl(prev =>
      prev === nextImage ? prev : nextImage
    );

  }, [player]);



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-[#131720] border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-medium text-gray-100">Add New Player</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form action={async (formadata) => {
          setIsLoading(true)
          await createPlayerAction(formadata)
          setIsLoading(false)
          onClose()
          toast.success('Player created successfully')
          onSubmit()
        }} className="p-6 space-y-4"  >
          <input type="hidden" name="player" value={player?.id} />
          <input type="hidden" name="editImage" value={player?.image} />
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Player Name <span className="text-red-400">*</span>
            </label>
            <input
              name="name"
              type="text"
              required
              value={playerData.name}
              onChange={(e) => setPlayerData({ ...playerData, name: e.target.value })}
              placeholder="Enter full name"
              className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">
              In-Game Name (IGN) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="ign"
              value={playerData.gameName}
              onChange={(e) => setPlayerData({ ...playerData, gameName: e.target.value })}
              required
              placeholder="Enter IGN"
              className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Team <span className="text-red-400">*</span>
            </label>
            <select
              name="team"
              required
              value={playerData.team}
              onChange={(e) =>
                setPlayerData({
                  ...playerData,
                  team: e.target.value
                })
              }
              className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-gray-700"
            >
              <option value="">Select a team</option>
              {teamList.map((team, i) => (
                <option key={i} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Player Photo
            </label>
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
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
                  <div className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {photoFile ? 'Change Photo' : 'Upload Photo'}
                  </div>
                  <input
                    name="photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {photoFile && (
                  <p className="mt-1.5 text-xs text-gray-500">{photoFile.name}</p>
                )}
                <p className="mt-1.5 text-xs text-gray-600">JPG, PNG or GIF (Max 5MB)</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              disabled={isLoading}
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={isLoading}
              type="submit"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? 'Creating...' : 'Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}