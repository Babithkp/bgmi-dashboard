import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const match = await prisma.match.findUnique({
      where: { id },
      select: {
        name: true,
        tournamentId: true,
      },
    });

    if (!match || !match.tournamentId) {
      return NextResponse.json(
        { error: "Match or Tournament not found" },
        { status: 404 }
      );
    }

    const tournamentMatches = await prisma.match.findMany({
      where: {
        tournamentId: match.tournamentId,
      },
      include: {
        matchTeam: {
          include: {
            playerPerformances: true,
          },
        },
        winTeam: {
          select: { name: true },
        },
      },
    });

    if (!tournamentMatches.length) {
      return NextResponse.json(
        { error: "No matches found in tournament" },
        { status: 404 }
      );
    }

    const winMap: Record<string, number> = {};

    for (const m of tournamentMatches) {
      const winnerName = m.winTeam?.name;
      if (!winnerName) continue;

      winMap[winnerName] = (winMap[winnerName] || 0) + 1;
    }

    const performancesWithTotals = tournamentMatches.flatMap(m =>
      m.matchTeam.flatMap(team =>
        team.playerPerformances.map(player => ({
          name: player.name,
          image: player.image,
          finishesPoints: player.finishesPoints,
          placementPoints: team.placementPoints,
          totalPoints: team.placementPoints + player.finishesPoints,
          status: player.status,
          teamContribution: player.teamContribution,
          teamName: team.name,
          teamImage: team.image,
          totalWins: winMap[team.name] || 0, // ✅ HERE
        }))
      )
    );

    if (!performancesWithTotals.length) {
      return NextResponse.json(
        { error: "No performances found" },
        { status: 404 }
      );
    }

    const mvp = performancesWithTotals.reduce((best, current) =>
      current.totalPoints > best.totalPoints ? current : best
    );

    return NextResponse.json({
      tournamentId: match.tournamentId,

      player: {
        name: mvp.name,
        image: mvp.image,
        finishesPoints: mvp.finishesPoints,
        placementPoints: mvp.placementPoints,
        totalPoints: mvp.totalPoints,
        status: mvp.status,
        teamContribution: mvp.teamContribution,

        team: {
          name: mvp.teamName,
          image: mvp.teamImage,
          totalWins: mvp.totalWins, 
        },
      },
    });

  } catch (error) {
    console.error("MVP FETCH ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch MVP" },
      { status: 500 }
    );
  }
}
