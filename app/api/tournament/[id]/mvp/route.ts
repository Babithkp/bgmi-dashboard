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

    const allPerformances = tournament.matches.flatMap(match =>
      match.matchTeam.flatMap(team =>
        team.playerPerformances
      )
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
      totalPoints: number;
      placementPoints: number;
      finishesPoints: number;
      matchesPlayed: number;
    }>);

    const topMVP = Object.values(playerTotals).sort(
      (a, b) => b.totalPoints - a.totalPoints
    )[0];

    return NextResponse.json({
      tournamentName: tournament.name,
      mvp: topMVP,
    });

  } catch (error) {
    console.error("TOURNAMENT MVP ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch MVP" },
      { status: 500 }
    );
  }
}
