import { createTeamAction } from '@/lib/action';
import { X, Upload } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TeamFormData } from '../teams-players/page';

interface AddTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  team: TeamFormData | null;
}



export default function AddTeamModal({ isOpen, onClose, onSubmit, team }: AddTeamModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [teamData, setTeamData] = useState<TeamFormData>({
    id: '',
    name: '',
    image: '',
    createdAt: '',
    players: []
  });
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);




  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (team === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTeamData({
        id: '',
        name: '',
        image: '',
        createdAt: '',
        players: []
      });
      setPreviewUrl('');
      return;
    }

    const nextName = team.name;
    const nextImage = team.image;

    setTeamData(prev =>
      prev.name === nextName && prev.image === nextImage
        ? prev
        : { ...prev, name: nextName, image: nextImage }
    );

    setPreviewUrl(prev =>
      prev === nextImage ? prev : nextImage
    );

  }, [team]);






  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-[#131720] border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-medium text-gray-100">Add New Team</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form action={async (formData) => {
          setIsLoading(true)
          await createTeamAction(formData)
          setPreviewUrl('')
          setIsLoading(false)
          toast.success('Team created successfully')
          onSubmit()
          onClose()
        }} className="p-6 space-y-4">
          <input type="hidden" name="team" value={team?.id} />
          <input type="hidden" name="editImage" value={team?.image} />
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Team Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={teamData.name}
              onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
              required
              placeholder="Enter team name"
              className="w-full px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Team Logo
            </label>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="shrink-0">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
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

              {/* Upload Button */}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <div className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                  </div>
                  <input
                    name="image"
                    type="file"
                    accept="image/*"
                    disabled={isLoading}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {imageFile && (
                  <p className="mt-1.5 text-xs text-gray-500">{imageFile.name}</p>
                )}
                <p className="mt-1.5 text-xs text-gray-600">JPG, PNG or SVG (Max 5MB)</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? 'Creating...' : 'Add Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
