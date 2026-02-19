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

    const performances = match.matchTeam.flatMap(
      (team) => team.playerPerformances
    );
    

    const mvp = performances.reduce((best, current) =>
      current.totalPoints > best.totalPoints ? current : best
    );


    return NextResponse.json({
      matchName: match.name,
      player: {
        name: mvp.name,
        image: mvp.image,
        placementPoints: mvp.placementPoints,
        finishesPoints: mvp.finishesPoints,
        totalPoints: mvp.totalPoints,
        status: mvp.status,
        teamContribution: mvp.teamContribution,
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
