import { deleteFromS3, uploadToS3 } from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await context.params
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        groups: {
          select: {
            id: true,
            name: true,
            groupTeamTournament: {
              select: {
                team: true
              }
            }
          }
        },
      }
    })
    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      )
    }
    return NextResponse.json(tournament)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch tournament" }, { status: 500 });
  }
}

type groupstype = {
  name: string;
  teamNames: string[];
};

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2010" ||
        error.message.includes("TransientTransactionError"))
    ) {
      if (retries > 0) {
        await new Promise(res => setTimeout(res, 300));
        return withRetry(fn, retries - 1);
      }
    }
    throw error;
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const formData = await req.formData();

    const groupsRaw = formData.get("groups");
    const nameRaw = formData.get("name");
    const thumbnail = formData.get("thumbnail") as File | null;

    const allDeadFile = formData.get("allDead") as File | null;
    const oneAliveFile = formData.get("oneAlive") as File | null;
    const twoAliveFile = formData.get("twoAlive") as File | null;
    const threeAliveFile = formData.get("threeAlive") as File | null;
    const fourAliveFile = formData.get("fourAlive") as File | null;


    const uploadIfFile = async (value: FormDataEntryValue | null, path: string) => {
      if (!(value instanceof File) || value.size === 0) return undefined;

      const buffer = Buffer.from(await value.arrayBuffer());
      const ext = value.name.split(".").pop();
      const key = `${path}/${Date.now()}.${ext}`;

      return uploadToS3(buffer, key, value.type);
    };

    if (!groupsRaw || typeof groupsRaw !== "string") {
      return NextResponse.json({ error: "Invalid groups payload" }, { status: 400 });
    }

    const name =
      typeof nameRaw === "string" && nameRaw.trim()
        ? nameRaw.trim()
        : undefined;

    let groups: groupstype[] = [];

    try {
      groups = JSON.parse(groupsRaw);
    } catch {
      return NextResponse.json({ error: "Malformed groups JSON" }, { status: 400 });
    }


    const imageUrl = await uploadIfFile(
      thumbnail,
      "dashboard/tournaments"
    );

    const allDeadUrl = await uploadIfFile(
      allDeadFile,
      "dashboard/tournaments/states"
    );

    const oneAliveUrl = await uploadIfFile(
      oneAliveFile,
      "dashboard/tournaments/states"
    );

    const twoAliveUrl = await uploadIfFile(
      twoAliveFile,
      "dashboard/tournaments/states"
    );

    const threeAliveUrl = await uploadIfFile(
      threeAliveFile,
      "dashboard/tournaments/states"
    );

    const fourAliveUrl = await uploadIfFile(
      fourAliveFile,
      "dashboard/tournaments/states"
    );

    await withRetry(() =>
      prisma.$transaction(async (tx) => {
        await tx.tournament.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(imageUrl && { image: imageUrl }),
            ...(allDeadUrl && { allDead: allDeadUrl }),
            ...(oneAliveUrl && { oneAlive: oneAliveUrl }),
            ...(twoAliveUrl && { twoAlive: twoAliveUrl }),
            ...(threeAliveUrl && { threeAlive: threeAliveUrl }),
            ...(fourAliveUrl && { fourAlive: fourAliveUrl }),
          },
        });

        if (!groups.length) return;

        const incomingGroupNames = groups.map(g => g.name.trim());

        await tx.group.deleteMany({
          where: {
            tournamentId: id,
            name: { notIn: incomingGroupNames },
            matches: { none: {} },
          },
        });

        for (const group of groups) {
          if (!group.name?.trim()) continue;

          const groupName = group.name.trim();

          let dbGroup = await tx.group.findFirst({
            where: { tournamentId: id, name: groupName },
            include: {
              groupTeamTournament: true,
              matches: true,
            },
          });

          if (!dbGroup) {
            dbGroup = await tx.group.create({
              data: {
                name: groupName,
                tournamentId: id,
              },
              include: {
                groupTeamTournament: true,
                matches: true,
              },
            });
          }

          if (!group.teamNames?.length) continue;

          const teams = await tx.team.findMany({
            where: {
              name: { in: group.teamNames },
            },
          });

          const existingTeamIds = dbGroup.groupTeamTournament.map(t => t.teamId);
          const incomingTeamIds = teams.map(t => t.id);

          const teamsToAdd = teams.filter(
            t => !existingTeamIds.includes(t.id)
          );

          if (teamsToAdd.length) {
            await tx.groupTeamTournament.createMany({
              data: teamsToAdd.map(team => ({
                groupId: dbGroup.id,
                tournamentId: id,
                teamId: team.id,
              })),
            });
          }

          if (dbGroup.matches.length === 0) {
            await tx.groupTeamTournament.deleteMany({
              where: {
                groupId: dbGroup.id,
                teamId: { notIn: incomingTeamIds },
              },
            });
          }
        }
      })
    );

    // ✅ Query outside transaction
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        matches: true,
        groups: {
          include: {
            groupTeamTournament: {
              include: { team: true },
            },
          },
        },
      },
    });

    if (!updatedTournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    return NextResponse.json(updatedTournament);

  } catch (error) {
    console.error("PATCH Tournament Error:", error);

    return NextResponse.json(
      { error: "Failed to update tournament" },
      { status: 500 }
    );
  }
}




export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    await prisma.match.updateMany({
      where: { tournamentId: id },
      data: { winnerId: null },
    });

    await deleteFromS3(tournament.image);

    await prisma.tournament.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete tournament" },
      { status: 500 }
    );
  }
}