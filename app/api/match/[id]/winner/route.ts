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
            shortName:true,
            image: true,
            totalPoints: true,
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


    const winnerTeam = match.matchTeam.find(
      (team) => team.id === match.winnerId
    );

    if (!winnerTeam) {
      return NextResponse.json(
        { error: "Winner team snapshot missing" },
        { status: 404 }
      );
    }
    const matchesPlayed = await prisma.matchTeam.count({
      where: {
        name: winnerTeam.name,
        match: {
          tournamentId: match.tournamentId,
        },
      },
    });

    const tournamentMatches = await prisma.match.findMany({
      where: {
        id,
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
    const players = winnerTeam.playerPerformances.map((player) => ({
      name: player.name,
      image: player.image,
      teamContribution: player.teamContribution,
      totalfinishesPoints: player.finishesPoints,
    }));
    return NextResponse.json([{
      name: winnerTeam.name,
      shortName:winnerTeam.shortName,
      image: winnerTeam.image,
      groupImage: winnerTeam.groupImage,
      totalPoints: winnerTeam.totalPoints,
      totalWins: totalWins,
      matchesPlayed: matchesPlayed,
      player1Name: players[0]?.name,
      player1Image: players[0]?.image,
      player1TeamContribution: players[0]?.teamContribution,
      player1TotalfinishesPoints: players[0]?.totalfinishesPoints,
      player2Name: players[1]?.name,
      player2Image: players[1]?.image,
      player2TeamContribution: players[1]?.teamContribution,
      player2TotalfinishesPoints: players[1]?.totalfinishesPoints,
      player3Name: players[2]?.name,
      player3Image: players[2]?.image,
      player3TeamContribution: players[2]?.teamContribution,
      player3TotalfinishesPoints: players[2]?.totalfinishesPoints,
      player4Name: players[3]?.name,
      player4Image: players[3]?.image,
      player4TeamContribution: players[3]?.teamContribution,
      player4TotalfinishesPoints: players[3]?.totalfinishesPoints,
    }]);

  } catch (error) {
    console.error("WINNER API ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch winning team details" },
      { status: 500 }
    );
  }
}