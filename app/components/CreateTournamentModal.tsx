import { X, Upload, Search } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { TeamFormData } from '../teams-players/page';
import { toast } from 'sonner';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TournamentFormData {
  name: string;
  thumbnailFile: File | null;
  date: string;
  time: string;
  participatingTeams: string[];
}


export default function CreateTournamentModal({ isOpen, onClose }: CreateTournamentModalProps) {
  const [formData, setFormData] = useState<TournamentFormData>({
    name: '',
    thumbnailFile: null,
    date: '',
    time: '',
    participatingTeams: [],
  });
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [teamSearchQuery, setTeamSearchQuery] = useState<string>('');
  const [teams, setTeams] = useState<TeamFormData[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<TeamFormData[]>([]);
  const [isLoading, setIsLoading] = useState(false);


  const handleSubmit =async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true)
    const body = new FormData();

    body.append("name", formData.name);
    body.append("date", formData.date);
    body.append("time", formData.time);
    body.append("participatingTeams", JSON.stringify(formData.participatingTeams));

    if (formData.thumbnailFile) {
      body.append("thumbnail", formData.thumbnailFile); // File object
    }
    const res = await fetch('/api/tournament',{
      method: 'POST',
      body
    })
    if(res.ok){
      setFormData({
        name: '',
        thumbnailFile: null,
        date: '',
        time: '',
        participatingTeams: [],
      });
      setPreviewUrl('');
      toast.success('Tournament created successfully')
      onClose();
    }else {
      toast.error('Failed to create tournament')
    }
    setIsLoading(false)
  };

  const handleChange = (field: keyof Omit<TournamentFormData, 'thumbnailFile' | 'participatingTeams'>, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, thumbnailFile: file }));
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTeamToggle = (team: string) => {
    setFormData(prev => ({
      ...prev,
      participatingTeams: prev.participatingTeams.includes(team)
        ? prev.participatingTeams.filter(t => t !== team)
        : [...prev.participatingTeams, team],
    }));
  };



  useEffect(()=>{
    if(teamSearchQuery === "" || teamSearchQuery === undefined){
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilteredTeams(teams)
      return
    }
    const searchTeam = teams.filter(team =>
      team.name.toLowerCase().includes(teamSearchQuery.toLowerCase())
    );
    setFilteredTeams(searchTeam)
  },[teamSearchQuery,teams])


  async function fetchTeams() {
    const response = await fetch('/api/team');
    const data = await response.json();
    setTeams(data);
    setFilteredTeams(data);
  }

  useEffect(()=>{
    const reFetchAll = async () => {
      await fetchTeams()
    }
    reFetchAll()
  },[])

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#131720] border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-[#131720] z-10">
          <h2 className="text-lg font-medium text-gray-100">Create New Tournament</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Tournament Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter tournament name"
              className="w-full px-4 py-2.5 bg-[#131720] border border-gray-800 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Tournament Thumbnail
            </label>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="shrink-0">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    className="w-32 h-20 rounded-lg border border-gray-700 object-cover"
                    width={320}
                    height={200}
                  />
                ) : (
                  <div className="w-32 h-20 rounded-lg border border-gray-800 bg-[#0a0e1a] flex items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <div className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {formData.thumbnailFile ? 'Change Thumbnail' : 'Upload Thumbnail'}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {formData.thumbnailFile && (
                  <p className="mt-1.5 text-xs text-gray-500">{formData.thumbnailFile.name}</p>
                )}
                <p className="mt-1.5 text-xs text-gray-600">JPG, PNG or GIF (Recommended: 800x400px)</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Start Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full px-4 py-2.5 bg-[#131720] border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Start Time <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                className="w-full px-4 py-2.5 bg-[#131720] border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Participating Teams <span className="text-red-400">*</span>
            </label>
            <div className="bg-[#0a0e1a] border border-gray-800 rounded-lg overflow-hidden">
              {/* Search Box */}
              <div className="p-3 border-b border-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#131720] border border-gray-800 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-700"
                  />
                </div>
              </div>
              
              {/* Teams List */}
              <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                {filteredTeams.length > 0 ? (
                  filteredTeams.map((team) => (
                    <label
                      key={team.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.participatingTeams.includes(team.id)}
                        onChange={() => handleTeamToggle(team.id)}
                        className="w-4 h-4 rounded border-gray-700 bg-[#131720] text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="text-sm text-gray-300">{team.name}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">
                    No teams found
                  </div>
                )}
              </div>
            </div>
            {formData.participatingTeams.length > 0 && (
              <p className="mt-1.5 text-xs text-gray-500">
                {formData.participatingTeams.length} team{formData.participatingTeams.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#0a0e1a] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              disabled={isLoading}
            >
              { isLoading ? 'Creating...' : 'Create Tournament' }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}