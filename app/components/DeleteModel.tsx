import { X } from 'lucide-react'

interface DeleteModalProps  {
    isOpen: boolean;
    onClose: () => void;
    deleteFunction: () => Promise<void>;
    isLoading: boolean;
}


export default function DeleteModel({ isOpen, onClose, deleteFunction, isLoading }: DeleteModalProps ) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-[#131720] border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-3 px-6 flex flex-col gap-3">
                <div className="flex items-center justify-between  border-gray-800 ">
                    <h2 className="text-lg font-medium text-gray-100">Alert!</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className='flex flex-col gap-3'>
                    <p>This action cannot be undone. Are you sure you want to delete this?</p>
                    <div className='flex gap-3 justify-end'>
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
                            onClick={deleteFunction}
                        >
                            {isLoading ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
