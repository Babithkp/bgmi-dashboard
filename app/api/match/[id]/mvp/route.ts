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
      include: {
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

    const performancesWithTotals = match.matchTeam.flatMap(team =>
      team.playerPerformances.map(player => ({
        ...player,
        teamName: team.name,
        teamImage: team.image,
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

    const mvp = performancesWithTotals.reduce((best, current) =>
      current.totalPoints > best.totalPoints ? current : best
    );

    return NextResponse.json({
      matchName: match.name,

      player: {
        name: mvp.name,
        image: mvp.image,
        finishesPoints: mvp.finishesPoints,
        placementPoints: mvp.placementPoints, // ✅ from team
        totalPoints: mvp.totalPoints,         // ✅ computed
        status: mvp.status,
        teamContribution: mvp.teamContribution,

        // ✅ BONUS (nice for UI)
        teamName: mvp.teamName,
        teamImage: mvp.teamImage,
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
