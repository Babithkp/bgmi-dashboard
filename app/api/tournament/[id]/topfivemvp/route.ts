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
            winTeam: {
              select: { name: true },
            },
            matchTeam: {
              include: {
                playerPerformances: true,
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

    if (!tournament.matches.length) {
      return NextResponse.json(
        { error: "No matches found" },
        { status: 404 }
      );
    }

    const winMap: Record<string, number> = {};

    tournament.matches.forEach(match => {
      const winnerName = match.winTeam?.name;
      if (!winnerName) return;

      winMap[winnerName] = (winMap[winnerName] || 0) + 1;
    });

    const allPerformances = tournament.matches.flatMap(match =>
      match.matchTeam.flatMap(team => {

        const teamTotalfinish = team.playerPerformances.reduce(
          (sum, p) => sum + (p.finishesPoints || 0),
          0
        );

        return team.playerPerformances.map(perf => ({
          name: perf.name,
          image: perf.image,
          teamName: team.name,
          teamImage: team.image,
          finishesPoints: perf.finishesPoints,
          placementPoints: team.placementPoints,
          teamTotalfinish,
          totalPoints: team.placementPoints + perf.finishesPoints,
          status: perf.status
        }));
      })
    );

    if (!allPerformances.length) {
      return NextResponse.json(
        { error: "No performances found" },
        { status: 404 }
      );
    }

    const playerTotals = allPerformances.reduce((acc, perf) => {
      const key = `${perf.name}-${perf.image}`;

      if (!acc[key]) {
        acc[key] = {
          name: perf.name,
          image: perf.image,
          teamName: perf.teamName,
          teamImage: perf.teamImage,
          totalPoints: 0,
          placementPoints: 0,
          finishesPoints: 0,
          matchesPlayed: 0,
          deathCount: 0,
          teamContribution: 0,
          teamTotalFinishes: 0
        };
      }

      acc[key].totalPoints += perf.totalPoints;
      acc[key].placementPoints += perf.placementPoints;
      acc[key].finishesPoints += perf.finishesPoints;
      acc[key].matchesPlayed += 1;
      acc[key].teamTotalFinishes += perf.teamTotalfinish;

      if (perf.status === "Dead") {
        acc[key].deathCount += 1;
      }

      return acc;
    }, {} as Record<string, {
      name: string;
      image: string;
      teamName: string;
      teamImage: string;
      totalPoints: number;
      placementPoints: number;
      finishesPoints: number;
      matchesPlayed: number;
      deathCount: number;
      teamContribution: number;
      teamTotalFinishes: number;
    }>);

    const topMVP = Object.values(playerTotals).sort(
      (a, b) => b.finishesPoints - a.finishesPoints
    )

    if (!topMVP) {
      return NextResponse.json(
        { error: "No MVP found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tournamentName: tournament.name,
      mvp: topMVP.slice(0, 5).map((player) => {
        const fd =
          player.deathCount === 0
            ? player.finishesPoints
            : player.finishesPoints / player.deathCount;

        return {
          name: player.name,
          image: player.image,
          totalPoints: player.totalPoints,
          teamContribution:
            player.teamTotalFinishes > 0
              ? Number(
                ((player.finishesPoints / player.teamTotalFinishes) * 100).toFixed(2)
              )
              : 0,
          placementPoints: player.placementPoints,
          finishesPoints: player.finishesPoints,
          matchesPlayed: player.matchesPlayed,
          fd: Number(fd.toFixed(2)),
          teamName: player.teamName,
          teamImage: player.teamImage,
          teamTotalWins: winMap[player.teamName] || 0,
        };
      }),
    });

  } catch (error) {
    console.error("TOURNAMENT MVP ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch MVP" },
      { status: 500 }
    );
  }
}