import { Check, Copy } from "lucide-react";
import React, { useState } from "react";

export default function Links({
  tournamentId,
}: {
  tournamentId: string | undefined;
}) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const copyToClipboard = (url: string, id: number) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const mockLinks = [
    {
      id: 4,
      name: "Overall top MVP",
      url: `${window.location.origin}/api/tournament/${tournamentId}/mvp`,
    },
    {
      id: 5,
      name: "Overall top 5 MVP",
      url: `${window.location.origin}/api/tournament/${tournamentId}/topfivemvp`,
    },
    {
      id: 6,
      name: "Overall points table",
      url: `${window.location.origin}/api/tournament/match/${tournamentId}`,
    },
  ];
  return (
    <div className="bg-[#131720] border border-gray-800 rounded-xl p-6">
      <h2 className="text-sm font-medium text-gray-400 mb-4">API Endpoints</h2>
      <div className="space-y-3">
        {mockLinks.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between p-4 bg-[#0a0e1a] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-300 mb-1">
                {link.name}
              </h3>
              <p className="text-xs text-gray-500 truncate">{link.url}</p>
            </div>
            <button
              onClick={() => copyToClipboard(link.url, link.id)}
              className="ml-4 px-4 py-2 bg-[#131720] border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
            >
              {copiedId === link.id ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
