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
        winTeam: {
          select: {
            id: true,
            name: true,
            image: true,
            groupImage: true,
          },
        },
        matchTeam: {
          select: {
            id: true,
            name: true,
            image: true,
            groupImage: true,
            playerPerformances: true,
            status: true,
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

    if (!match.tournamentId) {
      return NextResponse.json(
        { error: "Tournament not linked" },
        { status: 400 }
      );
    }

    // 2️⃣ Find winner snapshot in this match
    const winnerTeam = match.matchTeam.find(
      (team) => team.id === match.winnerId
    );

    if (!winnerTeam) {
      return NextResponse.json(
        { error: "Winner team snapshot missing" },
        { status: 404 }
      );
    }

    // 3️⃣ Count wins inside SAME tournament by team name
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

    let totalWins = 0;

    for (const m of tournamentMatches) {
      if (m.winTeam?.name === winnerTeam.name) {
        totalWins++;
      }
    }

    // 4️⃣ Return result
    return NextResponse.json({
      matchName: match.name,
      groupName: match.group?.name,
      team: {
        name: winnerTeam.name,
        image: winnerTeam.image,
        groupImage: winnerTeam.groupImage,
        totalWins: totalWins, // ✅ Correct tournament-based wins
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