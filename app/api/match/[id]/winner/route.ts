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
        group: {
          select: {
            name: true,
          },
        },
        winTeam: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        matchTeam: {
          select: {
            id: true,
            name: true,
            image: true,
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

    if (!match.winnerId || !match.winTeam) {
      return NextResponse.json(
        { error: "Winner not declared yet" },
        { status: 400 }
      );
    }

    const winnerTeam = match.matchTeam.find(
      (team) => team.id === match.winnerId
    );

    if (!winnerTeam) {
      return NextResponse.json(
        { error: "Winner team snapshot missing" },
        { status: 404 }
      );
    }


    return NextResponse.json({
      matchName: match.name,
      groupName: match.group?.name,
      team: {
        name: winnerTeam.name,
        image: winnerTeam.image,
        playerPerformances: winnerTeam.playerPerformances,
      },
    });

  } catch (error) {
    console.error("WINNER API ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch winning team details" },
      { status: 500 }
    );
  }
}
