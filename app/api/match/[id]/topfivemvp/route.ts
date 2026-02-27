import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1️⃣ Get match
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        group: {
          select: { name: true },
        },
        tournament: {
          select: { id: true },
        },
        matchTeam: {
          include: {
            playerPerformances: true,
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    if (!match.tournamentId) {
      return NextResponse.json(
        { error: "Tournament not linked" },
        { status: 400 }
      );
    }

    // 2️⃣ Get all wins inside same tournament
    const tournamentMatches = await prisma.match.findMany({
      where: {
        tournamentId: match.tournamentId,
        winnerId: { not: null },
      },
      include: {
        winTeam: {
          select: { name: true },
        },
      },
    });

    // 3️⃣ Build win map by team name
    const winMap: Record<string, number> = {};

    for (const m of tournamentMatches) {
      const teamName = m.winTeam?.name;
      if (!teamName) continue;

      winMap[teamName] = (winMap[teamName] || 0) + 1;
    }

    // 4️⃣ Build performances with correct tournament-based wins
    const performancesWithTotals = match.matchTeam.flatMap(team =>
      team.playerPerformances.map(player => ({
        ...player,
        teamId: team.id,
        teamName: team.name,
        teamImage: team.image,
        teamGroupImage: team.groupImage,
        totalWins: winMap[team.name] || 0, // ✅ FIXED HERE
        placementPoints: team.placementPoints,
        totalPoints: team.placementPoints + player.finishesPoints,
      }))
    );

    if (!performancesWithTotals.length) {
      return NextResponse.json(
        { error: "No performances found" },
        { status: 404 }
      );
    }

    // 5️⃣ Sort by totalPoints
    const sorted = performancesWithTotals.sort(
      (a, b) => b.totalPoints - a.totalPoints
    );

    const top5 = sorted.slice(0, 5);

    return NextResponse.json({
      matchName: match.name,
      groupName: match.group?.name ?? null,

      players: top5.map((p, index) => ({
        rank: index + 1,
        name: p.name,
        image: p.image,

        team: {
          id: p.teamId,
          name: p.teamName,
          image: p.teamImage,
          groupImage: p.teamGroupImage,
          totalWins: p.totalWins,
        },

        finishesPoints: p.finishesPoints,
        placementPoints: p.placementPoints,
        totalPoints: p.totalPoints,
        teamContribution: p.teamContribution,
        status: p.status,
      })),
    });

  } catch (error) {
    console.error("TOP 5 MVP ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch Top 5 MVPs" },
      { status: 500 }
    );
  }
}
