import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
export interface Player {
    id: string;
    name: string;
    gameName: string;
    image: string;
    team?: Team | null;
}
export type Team = { id: string; name: string; image: string; createdAt: Date; }

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    try {
      const { id } = await context.params;
  
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          matches: {
            include: {
              playerPerformances: {
                include: {
                  player: {
                    include: {
                      team: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
  
      if (!tournament) {
        return NextResponse.json(
          { error: "Tournament not found" },
          { status: 404 }
        );
      }
  
      if (tournament.matches.length === 0) {
        return NextResponse.json(
          { error: "No matches found" },
          { status: 404 }
        );
      }
  
      const allPerformances = tournament.matches.flatMap(
        (match) => match.playerPerformances
      );
  
      if (allPerformances.length === 0) {
        return NextResponse.json(
          { error: "No performances found" },
          { status: 404 }
        );
      }
  
      const playerTotals = allPerformances.reduce((acc, perf) => {
        const playerId = perf.player.id;
  
        if (!acc[playerId]) {
          acc[playerId] = {
            player: perf.player,
            totalPoints: 0,
            placementPoints: 0,
            finishesPoints: 0,
            matchesPlayed: 0,
          };
        }
  
        acc[playerId].totalPoints += perf.totalPoints;
        acc[playerId].placementPoints += perf.placementPoints;
        acc[playerId].finishesPoints += perf.finishesPoints;
        acc[playerId].matchesPlayed += 1;
  
        return acc;
      }, {} as Record<string, {
        player: Player;
        totalPoints: number;
        placementPoints: number;
        finishesPoints: number;
        matchesPlayed: number;
      }>);
  
      const topMVP = Object.values(playerTotals).sort(
        (a, b) => b.totalPoints - a.totalPoints
      )[0];
  
      return NextResponse.json({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        player: {
          name: topMVP.player.name,
          image: topMVP.player.image,
          team: topMVP.player.team?.name,
          totalPoints: topMVP.totalPoints,
          placementPoints: topMVP.placementPoints,
          finishesPoints: topMVP.finishesPoints,
          matchesPlayed: topMVP.matchesPlayed,
        },
      });
  
    } catch (error) {
      console.error("MVP ERROR:", error);
  
      return NextResponse.json(
        { error: "Failed to fetch MVP" },
        { status: 500 }
      );
    }
  }
