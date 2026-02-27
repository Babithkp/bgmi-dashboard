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

    // ✅ 1️⃣ Build Win Map
    const winMap: Record<string, number> = {};

    tournament.matches.forEach(match => {
      const winnerName = match.winTeam?.name;
      if (!winnerName) return;

      winMap[winnerName] = (winMap[winnerName] || 0) + 1;
    });

    // ✅ 2️⃣ Collect All Performances
    const allPerformances = tournament.matches.flatMap(match =>
      match.matchTeam.flatMap(team =>
        team.playerPerformances.map(perf => ({
          name: perf.name,
          image: perf.image,
          teamName: team.name,
          teamImage: team.image,
          finishesPoints: perf.finishesPoints,
          placementPoints: team.placementPoints,
          totalPoints: team.placementPoints + perf.finishesPoints,
        }))
      )
    );

    if (!allPerformances.length) {
      return NextResponse.json(
        { error: "No performances found" },
        { status: 404 }
      );
    }

    // ✅ 3️⃣ Aggregate Player Totals
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
        };
      }

      acc[key].totalPoints += perf.totalPoints;
      acc[key].placementPoints += perf.placementPoints;
      acc[key].finishesPoints += perf.finishesPoints;
      acc[key].matchesPlayed += 1;

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
    }>);

    // ✅ 4️⃣ Sort to Find MVP
    const topMVP = Object.values(playerTotals).sort(
      (a, b) => b.totalPoints - a.totalPoints
    )[0];

    if (!topMVP) {
      return NextResponse.json(
        { error: "No MVP found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tournamentName: tournament.name,

      mvp: {
        name: topMVP.name,
        image: topMVP.image,
        totalPoints: topMVP.totalPoints,
        placementPoints: topMVP.placementPoints,
        finishesPoints: topMVP.finishesPoints,
        matchesPlayed: topMVP.matchesPlayed,

        team: {
          name: topMVP.teamName,
          image: topMVP.teamImage,
          totalWins: winMap[topMVP.teamName] || 0, // ✅ INCLUDED
        },
      },
    });

  } catch (error) {
    console.error("TOURNAMENT MVP ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch MVP" },
      { status: 500 }
    );
  }
}